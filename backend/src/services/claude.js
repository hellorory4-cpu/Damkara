const Anthropic = require('@anthropic-ai/sdk');
const { getLivePrices } = require('./binance');
const { getMarketData } = require('./marketData');

const COINS = ['BTC', 'ETH', 'SOL', 'AVAX', 'LINK', 'DOT', 'MATIC', 'ADA', 'ATOM'];

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function runAIAnalysis() {
  const livePrices = getLivePrices();
  const marketData = getMarketData();

  const priceData = COINS.map(c => {
    const p = livePrices[c];
    if (!p?.price) return null;
    return `${c}: $${p.price.toFixed(3)} | 24h: ${p.change >= 0 ? '+' : ''}${p.change.toFixed(2)}% | Vol: $${(p.volume / 1e6).toFixed(0)}M`;
  }).filter(Boolean).join('\n');

  const fng = marketData.fng.value ?? '—';
  const fngLabel = marketData.fng.label || '—';
  const btcDom = marketData.btcDominance.value != null ? marketData.btcDominance.value + '%' : '—';

  const totalVolume = COINS.reduce((sum, c) => sum + (livePrices[c]?.volume || 0), 0);
  const totalVolumeStr = totalVolume > 1e9
    ? '$' + (totalVolume / 1e9).toFixed(1) + 'B'
    : '$' + (totalVolume / 1e6).toFixed(0) + 'M';

  const prompt = `You are DAMKARA, a professional quantitative crypto trading AI with the analytical precision of a top-tier hedge fund. Provide institutional-grade trading signals.

## LIVE MARKET DATA
${priceData}

## MARKET INDICATORS
- Fear & Greed Index: ${fng}/100 (${fngLabel})
- Bitcoin Dominance: ${btcDom}
- Total 24h Volume: ${totalVolumeStr}

## ANALYSIS FRAMEWORK
For each asset evaluate:
1. MOMENTUM: Price trend strength, volume confirmation
2. RELATIVE STRENGTH: Performance vs BTC benchmark
3. SENTIMENT ALIGNMENT: Does Fear/Greed support the price action?
4. BTC DOMINANCE IMPACT: Does dominance level favour this asset?
5. VOLUME PROFILE: Volume increasing = trend confirmed, decreasing = caution
6. RISK/REWARD: Is potential reward worth current risk?

## CONFIDENCE CALIBRATION
- 80-95%: Multiple indicators strongly aligned — high conviction
- 70-79%: Most indicators agree — moderate-high conviction
- 60-69%: Mixed signals — trade with reduced size
- Below 60%: HOLD — too uncertain

## OUTPUT RULES
- Respond with ONLY a JSON object
- NO text before or after the JSON
- NO apostrophes or single quotes inside string values
- NO markdown code blocks
- Use double quotes only
- Keep reason fields under 10 words with no special characters

Output format:
{"sentiment":72,"sentiment_label":"BULLISH","reasoning":"Market summary here","market_regime":"BULL","signals":[{"coin":"BTC","action":"BUY","confidence":75,"reason":"Strong momentum and volume"},{"coin":"ETH","action":"HOLD","confidence":62,"reason":"Consolidating near support"},{"coin":"SOL","action":"BUY","confidence":80,"reason":"Ecosystem growth confirmed"},{"coin":"AVAX","action":"HOLD","confidence":55,"reason":"Mixed signals"},{"coin":"LINK","action":"BUY","confidence":68,"reason":"Oracle demand rising"},{"coin":"DOT","action":"HOLD","confidence":52,"reason":"Low momentum"},{"coin":"MATIC","action":"HOLD","confidence":58,"reason":"Uncertain direction"},{"coin":"ADA","action":"HOLD","confidence":50,"reason":"Weak volume"},{"coin":"ATOM","action":"HOLD","confidence":54,"reason":"Range bound"}]}`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].text;
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON in Claude response');

  return JSON.parse(text.slice(start, end + 1));
}

module.exports = { runAIAnalysis };
