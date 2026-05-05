const COINS = ['BTC', 'ETH', 'SOL', 'AVAX', 'LINK', 'DOT', 'MATIC', 'ADA', 'ATOM'];

const COINGECKO_IDS = {
  BTC:  'bitcoin',
  ETH:  'ethereum',
  SOL:  'solana',
  AVAX: 'avalanche-2',
  LINK: 'chainlink',
  DOT:  'polkadot',
  MATIC: 'matic-network',
  ADA:  'cardano',
  ATOM: 'cosmos',
};

const livePrices = {};
const priceHistory = {};

function pushPrice(coin, price, change, volume) {
  livePrices[coin] = { price, change, volume };
  if (!priceHistory[coin]) priceHistory[coin] = [];
  priceHistory[coin].push(price);
  if (priceHistory[coin].length > 80) priceHistory[coin].shift();
}

async function fetchPrices() {
  try {
    const ids = COINS.map(c => COINGECKO_IDS[c]).join(',');
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`
    );
    const data = await res.json();
    COINS.forEach(coin => {
      const d = data[COINGECKO_IDS[coin]];
      if (!d) return;
      pushPrice(coin, d.usd, d.usd_24h_change ?? 0, d.usd_24h_vol ?? 0);
    });
    if (global.broadcast) {
      global.broadcast('prices_update', { livePrices, priceHistory });
    }
  } catch (e) {
    console.error('CoinGecko fetch error:', e.message);
  }
}

function startBinanceWS() {
  fetchPrices();
  setInterval(fetchPrices, 15_000);
  console.log('Price feed started (CoinGecko polling every 15s)');
}

function getLivePrices() { return livePrices; }
function getPriceHistory() { return priceHistory; }

module.exports = { startBinanceWS, getLivePrices, getPriceHistory, COINS };
