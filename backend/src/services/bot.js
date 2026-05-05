const { pool } = require('../db');
const { getLivePrices, getPriceHistory } = require('./binance');
const { runAIAnalysis } = require('./claude');
const { sendTelegram } = require('./telegram');
const { getMarketData } = require('./marketData');

// In-memory state — synced with PostgreSQL
const state = {
  portfolio: 1000,
  pnl: 0,
  trades: [],
  openPositions: [],
  botActive: true,
  settings: {
    takeProfit: 5,
    stopLoss: 2.5,
    minConfidence: 60,
    baseRisk: 2,
    autoTrade: true,
    telegramEnabled: true,
  },
  latestSignals: null,
  aiThinking: false,
  lastAnalysisTime: null,
};

async function loadStateFromDB() {
  const [portfolioRes, settingsRes, tradesRes] = await Promise.all([
    pool.query('SELECT * FROM portfolio LIMIT 1'),
    pool.query('SELECT * FROM settings LIMIT 1'),
    pool.query('SELECT * FROM trades ORDER BY opened_at DESC LIMIT 200'),
  ]);

  if (portfolioRes.rows.length) {
    state.portfolio = parseFloat(portfolioRes.rows[0].balance);
  }

  if (settingsRes.rows.length) {
    const s = settingsRes.rows[0];
    state.settings = {
      takeProfit: parseFloat(s.take_profit),
      stopLoss: parseFloat(s.stop_loss),
      minConfidence: parseInt(s.min_confidence),
      baseRisk: parseFloat(s.base_risk),
      autoTrade: s.auto_trade,
      telegramEnabled: s.telegram_enabled,
    };
    state.botActive = s.bot_active;
  }

  if (tradesRes.rows.length) {
    const open = tradesRes.rows.filter(t => t.status === 'open');
    const closed = tradesRes.rows.filter(t => t.status === 'closed');

    state.openPositions = open.map(t => ({
      id: t.id,
      coin: t.coin,
      action: t.action,
      entryPrice: parseFloat(t.entry_price),
      amount: parseFloat(t.amount),
      confidence: t.confidence,
      tier: t.tier,
      reason: t.reason,
      openTime: new Date(t.opened_at).toLocaleTimeString(),
    }));

    state.trades = closed.map(t => ({
      id: t.id,
      coin: t.coin,
      type: t.action,
      amount: parseFloat(t.amount),
      entryPrice: parseFloat(t.entry_price),
      exitPrice: parseFloat(t.exit_price),
      profit: parseFloat(t.profit),
      profitPct: parseFloat(t.profit_pct),
      confidence: t.confidence,
      tier: t.tier,
      time: new Date(t.closed_at || t.opened_at).toLocaleTimeString(),
    }));

    state.pnl = state.trades.reduce((sum, t) => sum + (t.profit || 0), 0);
  }

  // Load latest signals
  try {
    const sigRes = await pool.query('SELECT * FROM signals ORDER BY created_at DESC LIMIT 1');
    if (sigRes.rows.length) {
      const row = sigRes.rows[0];
      state.latestSignals = {
        sentiment: row.sentiment,
        sentiment_label: row.sentiment_label,
        reasoning: row.reasoning,
        market_regime: row.market_regime,
        signals: Array.isArray(row.signals_data) ? row.signals_data : [],
      };
      state.lastAnalysisTime = row.created_at;
    }
  } catch (e) {
    console.error('Failed to load signals:', e.message);
  }
}

async function executeTrade(coin, action, confidence, reason = '') {
  if (action === 'HOLD') return;
  const livePrices = getLivePrices();
  const currentPrice = livePrices[coin]?.price;
  if (!currentPrice) return;
  if (state.openPositions.find(p => p.coin === coin)) return;

  const { baseRisk, telegramEnabled, takeProfit, stopLoss } = state.settings;
  const sizePct = confidence >= 80 ? baseRisk / 100
    : confidence >= 70 ? (baseRisk / 2) / 100
    : (baseRisk / 4) / 100;
  const amount = parseFloat((state.portfolio * sizePct).toFixed(4));
  const tier = confidence >= 80 ? 'FULL' : confidence >= 70 ? 'HALF' : 'QUARTER';

  const result = await pool.query(
    `INSERT INTO trades (coin, action, amount, entry_price, confidence, tier, reason, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'open') RETURNING id`,
    [coin, action, amount, currentPrice, confidence, tier, reason]
  );

  const position = {
    id: result.rows[0].id,
    coin, action,
    entryPrice: currentPrice,
    amount, confidence, tier, reason,
    openTime: new Date().toLocaleTimeString(),
  };

  state.openPositions.push(position);

  if (global.broadcast) {
    global.broadcast('trade_opened', position);
    global.broadcast('portfolio_update', buildPublicState());
  }

  sendTelegram(
    `${action === 'BUY' ? '🟢' : '🔴'} <b>TRADE OPENED</b>\n\n💰 ${action} ${coin}/USDT\n📍 Entry: $${currentPrice.toFixed(3)}\n💵 Size: $${amount} [${tier}]\n🎯 Confidence: ${confidence}%\n🎯 Take Profit: +${takeProfit}% | Stop Loss: -${stopLoss}%\n💬 ${reason}`,
    telegramEnabled
  );
}

async function checkPositions() {
  if (!state.openPositions.length) return;
  const livePrices = getLivePrices();
  const { takeProfit, stopLoss, telegramEnabled } = state.settings;
  let changed = false;

  for (let i = state.openPositions.length - 1; i >= 0; i--) {
    const pos = state.openPositions[i];
    const currentPrice = livePrices[pos.coin]?.price;
    if (!currentPrice) continue;

    const priceDiff = pos.action === 'BUY'
      ? (currentPrice - pos.entryPrice) / pos.entryPrice
      : (pos.entryPrice - currentPrice) / pos.entryPrice;

    const profitPct = parseFloat((priceDiff * 100).toFixed(4));

    if (profitPct >= takeProfit || profitPct <= -stopLoss) {
      const profit = parseFloat((pos.amount * priceDiff).toFixed(4));
      state.openPositions.splice(i, 1);
      state.portfolio = parseFloat((state.portfolio + profit).toFixed(4));
      state.pnl = parseFloat((state.pnl + profit).toFixed(4));

      const closedTrade = {
        id: pos.id,
        coin: pos.coin,
        type: pos.action,
        amount: pos.amount,
        entryPrice: pos.entryPrice,
        exitPrice: currentPrice,
        profit, profitPct,
        confidence: pos.confidence,
        tier: pos.tier,
        time: new Date().toLocaleTimeString(),
      };
      state.trades.unshift(closedTrade);

      await Promise.all([
        pool.query(
          `UPDATE trades SET exit_price=$1, profit=$2, profit_pct=$3, status='closed', closed_at=NOW() WHERE id=$4`,
          [currentPrice, profit, profitPct, pos.id]
        ),
        pool.query(`UPDATE portfolio SET balance=$1, updated_at=NOW() WHERE id=1`, [state.portfolio]),
      ]);

      if (global.broadcast) global.broadcast('trade_closed', closedTrade);
      changed = true;

      sendTelegram(
        `${profit > 0 ? '✅' : '❌'} <b>TRADE CLOSED</b>\n\n💰 ${pos.action} ${pos.coin}/USDT\n📍 Entry: $${pos.entryPrice.toFixed(3)} → Exit: $${currentPrice.toFixed(3)}\n${profit >= 0 ? '🟢' : '🔴'} P&L: ${profit >= 0 ? '+' : ''}$${profit.toFixed(2)} (${profitPct}%)\n💼 Portfolio: $${state.portfolio.toFixed(2)}\n${profit > 0 ? '🎯 Take profit hit!' : '🛡️ Stop loss triggered'}`,
        telegramEnabled
      );
    }
  }

  if (changed && global.broadcast) {
    global.broadcast('portfolio_update', buildPublicState());
  }
}

async function runAnalysisAndTrade() {
  if (state.aiThinking) return;
  state.aiThinking = true;
  if (global.broadcast) global.broadcast('ai_thinking', true);

  try {
    const result = await runAIAnalysis();
    state.latestSignals = result;
    state.lastAnalysisTime = new Date().toISOString();

    await pool.query(
      `INSERT INTO signals (sentiment, sentiment_label, reasoning, market_regime, signals_data)
       VALUES ($1, $2, $3, $4, $5)`,
      [result.sentiment, result.sentiment_label, result.reasoning, result.market_regime, JSON.stringify(result.signals)]
    );

    if (global.broadcast) global.broadcast('signals_update', { ...result, lastAnalysisTime: state.lastAnalysisTime });

    if (state.botActive && state.settings.autoTrade) {
      for (const s of result.signals) {
        if (s.action !== 'HOLD' && s.confidence >= state.settings.minConfidence) {
          await executeTrade(s.coin, s.action, s.confidence, s.reason);
        }
      }
    }

    const { minConfidence, telegramEnabled } = state.settings;
    const buys = result.signals.filter(s => s.action === 'BUY' && s.confidence >= minConfidence);
    const sells = result.signals.filter(s => s.action === 'SELL' && s.confidence >= minConfidence);

    if (buys.length > 0 || sells.length > 0) {
      let msg = `⚡ <b>DAMKARA ANALYSIS</b>\n\n📊 Sentiment: ${result.sentiment}/100 — ${result.sentiment_label}\n📈 Regime: ${result.market_regime}\n💬 ${result.reasoning}\n\n`;
      if (buys.length) msg += `🟢 <b>BUY SIGNALS:</b>\n${buys.map(s => `• ${s.coin} (${s.confidence}%) — ${s.reason}`).join('\n')}\n\n`;
      if (sells.length) msg += `🔴 <b>SELL SIGNALS:</b>\n${sells.map(s => `• ${s.coin} (${s.confidence}%) — ${s.reason}`).join('\n')}`;
      sendTelegram(msg, telegramEnabled);
    }
  } catch (e) {
    console.error('AI analysis error:', e.message);
    if (global.broadcast) global.broadcast('ai_error', e.message);
  }

  state.aiThinking = false;
  if (global.broadcast) global.broadcast('ai_thinking', false);
}

function buildPublicState() {
  return {
    portfolio: state.portfolio,
    pnl: state.pnl,
    trades: state.trades,
    openPositions: state.openPositions,
    botActive: state.botActive,
    settings: state.settings,
    latestSignals: state.latestSignals,
    aiThinking: state.aiThinking,
    lastAnalysisTime: state.lastAnalysisTime,
    livePrices: getLivePrices(),
    priceHistory: getPriceHistory(),
    marketData: getMarketData(),
  };
}

function getState() {
  return buildPublicState();
}

async function toggleBot() {
  state.botActive = !state.botActive;
  await pool.query('UPDATE settings SET bot_active=$1, updated_at=NOW() WHERE id=1', [state.botActive]);
  if (global.broadcast) global.broadcast('bot_status', state.botActive);
  sendTelegram(
    state.botActive
      ? '▶️ <b>DAMKARA RESUMED</b>\nBot is active and scanning markets.'
      : '⏸️ <b>DAMKARA PAUSED</b>\nBot paused. No new trades will open.',
    state.settings.telegramEnabled
  );
  return state.botActive;
}

async function resetBot() {
  state.portfolio = 1000;
  state.pnl = 0;
  state.trades = [];
  state.openPositions = [];
  state.latestSignals = null;
  await pool.query('UPDATE portfolio SET balance=1000.0000, updated_at=NOW() WHERE id=1');
  await pool.query('DELETE FROM trades');
  await pool.query('DELETE FROM signals');
  if (global.broadcast) global.broadcast('portfolio_update', buildPublicState());
  sendTelegram('🔄 <b>DAMKARA RESET</b>\nPortfolio reset to $1,000.00', state.settings.telegramEnabled);
}

async function updateSettings(newSettings) {
  const s = { ...state.settings, ...newSettings };
  state.settings = s;
  await pool.query(
    `UPDATE settings SET take_profit=$1, stop_loss=$2, min_confidence=$3, base_risk=$4,
     auto_trade=$5, telegram_enabled=$6, updated_at=NOW() WHERE id=1`,
    [s.takeProfit, s.stopLoss, s.minConfidence, s.baseRisk, s.autoTrade, s.telegramEnabled]
  );
  if (global.broadcast) global.broadcast('settings_update', state.settings);
}

async function startBotLoop() {
  try {
    await loadStateFromDB();
    console.log('Bot state loaded from DB:', {
      portfolio: state.portfolio,
      pnl: state.pnl,
      openPositions: state.openPositions.length,
      closedTrades: state.trades.length,
    });
  } catch (e) {
    console.error('Failed to load state from DB — starting with defaults:', e.message);
  }
  setTimeout(() => {
    if (state.botActive) runAnalysisAndTrade();
  }, 3000);
  setInterval(checkPositions, 15_000);
  setInterval(() => {
    if (state.botActive) runAnalysisAndTrade();
  }, 60_000);
}

module.exports = { startBotLoop, loadStateFromDB, getState, toggleBot, resetBot, updateSettings, runAnalysisAndTrade };
