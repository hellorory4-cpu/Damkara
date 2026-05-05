const WebSocket = require('ws');

const COINS = ['BTC', 'ETH', 'SOL', 'AVAX', 'LINK', 'DOT', 'MATIC', 'ADA', 'ATOM'];

const livePrices = {};
const priceHistory = {};
let binanceWs = null;

function pushPrice(coin, price, change, volume) {
  livePrices[coin] = { price, change, volume };
  if (!priceHistory[coin]) priceHistory[coin] = [];
  priceHistory[coin].push(price);
  if (priceHistory[coin].length > 80) priceHistory[coin].shift();
}

function connectBinanceWS() {
  const streams = COINS.map(c => `${c.toLowerCase()}usdt@ticker`).join('/');
  binanceWs = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);

  binanceWs.on('message', raw => {
    try {
      const { data: t } = JSON.parse(raw.toString());
      if (!t?.s) return;
      const coin = t.s.replace('USDT', '');
      pushPrice(coin, parseFloat(t.c), parseFloat(t.P), parseFloat(t.q));
      if (global.broadcast) {
        global.broadcast('prices_update', { livePrices, priceHistory });
      }
    } catch (e) {
      console.error('Binance WS parse error:', e.message);
    }
  });

  binanceWs.on('error', e => console.error('Binance WS error:', e.message));

  binanceWs.on('close', () => {
    console.log('Binance WS closed — reconnecting in 5s');
    setTimeout(connectBinanceWS, 5000);
  });
}

async function fetchRestPrices() {
  try {
    const syms = JSON.stringify(COINS.map(c => c + 'USDT'));
    const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${syms}`);
    const data = await res.json();
    data.forEach(t => {
      const coin = t.symbol.replace('USDT', '');
      pushPrice(coin, parseFloat(t.lastPrice), parseFloat(t.priceChangePercent), parseFloat(t.quoteVolume));
    });
    if (global.broadcast) {
      global.broadcast('prices_update', { livePrices, priceHistory });
    }
  } catch (e) {
    console.error('Binance REST error:', e.message);
  }
}

function startBinanceWS() {
  fetchRestPrices();
  setInterval(fetchRestPrices, 15_000);
  connectBinanceWS();
}

function getLivePrices() { return livePrices; }
function getPriceHistory() { return priceHistory; }

module.exports = { startBinanceWS, getLivePrices, getPriceHistory, COINS };
