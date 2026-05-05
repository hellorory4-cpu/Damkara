import { useState, useCallback, useEffect } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import Header from './components/Header';
import Ticker from './components/Ticker';
import StatsGrid from './components/StatsGrid';
import PriceChart from './components/PriceChart';
import AISentiment from './components/AISentiment';
import FearGreed from './components/FearGreed';
import BTCDominance from './components/BTCDominance';
import VolumeAnalysis from './components/VolumeAnalysis';
import AISignals from './components/AISignals';
import BotSettings from './components/BotSettings';
import TradeLog from './components/TradeLog';

const API = import.meta.env.VITE_API_URL || '';

async function apiPost(path, body) {
  const res = await fetch(`${API}/api${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

async function apiPut(path, body) {
  const res = await fetch(`${API}/api${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

const DEFAULT_SETTINGS = {
  takeProfit: 5,
  stopLoss: 2.5,
  minConfidence: 60,
  baseRisk: 2,
  autoTrade: true,
  telegramEnabled: true,
};

export default function App() {
  const [wsConnected, setWsConnected] = useState(false);
  const [livePrices, setLivePrices] = useState({});
  const [priceHistory, setPriceHistory] = useState({});
  const [portfolio, setPortfolio] = useState(1000);
  const [pnl, setPnl] = useState(0);
  const [trades, setTrades] = useState([]);
  const [openPositions, setOpenPositions] = useState([]);
  const [botActive, setBotActive] = useState(true);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [signals, setSignals] = useState(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [lastAnalysisTime, setLastAnalysisTime] = useState(null);
  const [marketData, setMarketData] = useState({ fng: {}, btcDominance: {} });

  const applyState = useCallback(data => {
    if (!data) return;
    if (data.livePrices) setLivePrices(data.livePrices);
    if (data.priceHistory) setPriceHistory(data.priceHistory);
    if (data.portfolio != null) setPortfolio(data.portfolio);
    if (data.pnl != null) setPnl(data.pnl);
    if (data.trades != null) setTrades(data.trades);
    if (data.openPositions != null) setOpenPositions(data.openPositions);
    if (data.botActive != null) setBotActive(data.botActive);
    if (data.settings != null) setSettings(data.settings);
    if (data.latestSignals != null) setSignals(data.latestSignals);
    if (data.aiThinking != null) setAiThinking(data.aiThinking);
    if (data.lastAnalysisTime != null) setLastAnalysisTime(data.lastAnalysisTime);
    if (data.marketData != null) setMarketData(data.marketData);
  }, []);

  useEffect(() => {
    async function fetchState() {
      try {
        const res = await fetch(`${API}/api/state`);
        const data = await res.json();
        console.log('[/api/state response]', {
          portfolio: data.portfolio,
          pnl: data.pnl,
          openPositions: data.openPositions?.length,
          trades: data.trades?.length,
        });
        applyState(data);
      } catch (e) {
        console.error('Failed to fetch state:', e.message);
      }
    }
    fetchState();
    const id = setInterval(fetchState, 5000);
    return () => clearInterval(id);
  }, [applyState]);

  useWebSocket({
    onConnected: () => setWsConnected(true),
    onDisconnected: () => setWsConnected(false),

    state: applyState,

    prices_update: data => {
      setLivePrices({ ...data.livePrices });
      setPriceHistory({ ...data.priceHistory });
    },

    market_update: data => setMarketData(data),

    signals_update: data => {
      setSignals(data);
      if (data.lastAnalysisTime) setLastAnalysisTime(data.lastAnalysisTime);
    },

    portfolio_update: applyState,

    trade_opened: pos => {
      setOpenPositions(prev => [...prev, pos]);
    },

    trade_closed: trade => {
      setOpenPositions(prev => prev.filter(p => p.id !== trade.id));
      setTrades(prev => [trade, ...prev]);
      setPortfolio(prev => parseFloat((prev + trade.profit).toFixed(4)));
      setPnl(prev => parseFloat((prev + trade.profit).toFixed(4)));
    },

    bot_status: active => setBotActive(active),
    settings_update: s => setSettings(s),
    ai_thinking: thinking => setAiThinking(thinking),
    ai_error: () => setAiThinking(false),
  });

  const handleToggleBot = async () => {
    const res = await apiPost('/toggle-bot');
    if (res.botActive != null) setBotActive(res.botActive);
  };

  const handleReset = async () => {
    await apiPost('/reset');
    setPortfolio(1000);
    setPnl(0);
    setTrades([]);
    setOpenPositions([]);
    setSignals(null);
  };

  const handleAnalyse = async () => {
    if (aiThinking) return;
    setAiThinking(true);
    await apiPost('/analyse');
  };

  const handleSettingsChange = async (newSettings) => {
    const merged = { ...settings, ...newSettings };
    setSettings(merged);
    await apiPut('/settings', merged);
  };

  const wins = trades.filter(t => t.profit > 0).length;
  const winRate = trades.length ? Math.round((wins / trades.length) * 100) : null;

  return (
    <div className="container">
      <Header
        botActive={botActive}
        wsConnected={wsConnected}
        onToggleBot={handleToggleBot}
      />

      <Ticker livePrices={livePrices} />

      <StatsGrid
        portfolio={portfolio}
        pnl={pnl}
        trades={trades}
        openPositions={openPositions}
        wins={wins}
        winRate={winRate}
        marketData={marketData}
        signals={signals}
      />

      <div className="grid-mid">
        <PriceChart livePrices={livePrices} priceHistory={priceHistory} />
        <AISentiment signals={signals} livePrices={livePrices} lastAnalysisTime={lastAnalysisTime} />
      </div>

      <div className="grid-data">
        <FearGreed marketData={marketData} />
        <BTCDominance marketData={marketData} />
        <VolumeAnalysis livePrices={livePrices} />
      </div>

      <div className="grid-bot">
        <AISignals
          signals={signals}
          aiThinking={aiThinking}
          livePrices={livePrices}
          settings={settings}
        />
        <div className="grid-bot-right">
          <BotSettings
            settings={settings}
            aiThinking={aiThinking}
            onSettingsChange={handleSettingsChange}
            onAnalyse={handleAnalyse}
            onReset={handleReset}
          />
          <TradeLog trades={trades} openPositions={openPositions} livePrices={livePrices} />
        </div>
      </div>
    </div>
  );
}
