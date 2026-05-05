require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const { initDB } = require('./db');
const { startBinanceWS } = require('./services/binance');
const { startMarketDataPolling } = require('./services/marketData');
const { startBotLoop, loadStateFromDB, getState } = require('./services/bot');
const { sendTelegram } = require('./services/telegram');
const apiRoutes = require('./routes/api');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));
app.use(express.json());

// Connected WebSocket clients
const clients = new Set();

wss.on('connection', async ws => {
  clients.add(ws);
  console.log(`WS client connected (${clients.size} total)`);

  // Always send fresh state from DB so WS snapshot matches HTTP /api/state
  try {
    await loadStateFromDB();
    const snapshot = getState();
    console.log('[WS state snapshot]', {
      portfolio: snapshot.portfolio,
      pnl: snapshot.pnl,
      openPositions: snapshot.openPositions?.length,
      trades: snapshot.trades?.length,
    });
    ws.send(JSON.stringify({ type: 'state', data: snapshot }));
  } catch (e) {
    console.error('WS state send error:', e.message);
  }

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`WS client disconnected (${clients.size} total)`);
  });

  ws.on('error', e => console.error('WS client error:', e.message));
});

// Global broadcast function used by all services
global.broadcast = function (type, data) {
  if (!clients.size) return;
  const msg = JSON.stringify({ type, data });
  clients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      try { ws.send(msg); } catch (e) { /* ignore send errors */ }
    }
  });
};

app.use('/api', apiRoutes);

// Healthcheck
app.get('/health', (req, res) => res.json({ ok: true, uptime: process.uptime() }));

const PORT = process.env.PORT || 3001;

async function start() {
  try {
    await initDB();
    startBinanceWS();
    startMarketDataPolling();
    await startBotLoop();

    server.listen(PORT, () => {
      console.log(`DAMKARA backend running on port ${PORT}`);
      sendTelegram(
        '⚡ <b>DAMKARA SERVER ONLINE</b>\n\nBackend deployed and running.\n\n🤖 Claude AI: Active\n📊 CoinGecko Feed: Active\n🗄️ Database: Ready\n\nThe ancient trader awakens. 🏺',
        true
      );
    });
  } catch (err) {
    console.error('Startup failed:', err);
    process.exit(1);
  }
}

start();
