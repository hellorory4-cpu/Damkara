let marketData = {
  fng: { value: null, label: '', description: '' },
  btcDominance: { value: null, description: '' },
};

async function fetchMarketData() {
  // Fear & Greed Index
  try {
    const res = await fetch('https://api.alternative.me/fng/?limit=1');
    const data = await res.json();
    const val = parseInt(data.data[0].value);
    const label = data.data[0].value_classification;
    let description;
    if (val > 75) description = 'Extreme greed — market may be overheated. Tighten stops.';
    else if (val > 55) description = 'Greed detected — momentum positive, watch for reversals.';
    else if (val > 45) description = 'Neutral — no strong directional bias from sentiment.';
    else if (val > 25) description = 'Fear detected — potential buying opportunities emerging.';
    else description = 'Extreme fear — historically strong long term buying zone.';
    marketData.fng = { value: val, label: label.toUpperCase(), description };
  } catch (e) {
    console.error('FNG fetch error:', e.message);
  }

  // BTC Dominance
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/global', {
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    const dom = parseFloat(data.data.market_cap_percentage.btc.toFixed(1));
    let description;
    if (dom > 55) description = 'High BTC dominance — Bitcoin leading, altcoins may lag behind.';
    else if (dom > 45) description = 'Moderate dominance — balanced market, good for mixed portfolio.';
    else description = 'Low BTC dominance — altcoin season likely. Great for our coins.';
    marketData.btcDominance = { value: dom, description };
  } catch (e) {
    console.error('BTC dominance fetch error:', e.message);
  }

  if (global.broadcast) {
    global.broadcast('market_update', marketData);
  }
}

function startMarketDataPolling() {
  fetchMarketData();
  setInterval(fetchMarketData, 300_000);
}

function getMarketData() {
  return marketData;
}

module.exports = { startMarketDataPolling, getMarketData };
