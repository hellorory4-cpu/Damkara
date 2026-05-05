const COINS = ['BTC', 'ETH', 'SOL', 'AVAX', 'LINK', 'DOT', 'MATIC', 'ADA', 'ATOM'];

function fmtPrice(price) {
  return price > 1000
    ? price.toLocaleString('en', { maximumFractionDigits: 0 })
    : price.toFixed(3);
}

export default function Ticker({ livePrices }) {
  const hasData = COINS.some(c => livePrices[c]?.price);

  if (!hasData) {
    return (
      <div className="ticker-wrap">
        <div className="ticker">
          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 12, color: 'var(--muted)' }}>
            Loading live market data...
          </span>
        </div>
      </div>
    );
  }

  // Duplicate for seamless loop
  const items = [...COINS, ...COINS]
    .filter(c => livePrices[c]?.price)
    .map((coin, i) => {
      const { price, change } = livePrices[coin];
      return (
        <span key={`${coin}-${i}`} className="ticker-item">
          <span style={{ fontWeight: 700, color: 'var(--text)' }}>{coin}/USDT</span>
          <span style={{ color: 'var(--muted)' }}>${fmtPrice(price)}</span>
          <span style={{ color: change >= 0 ? 'var(--green)' : 'var(--accent3)' }}>
            {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
          </span>
        </span>
      );
    });

  return (
    <div className="ticker-wrap">
      <div className="ticker">{items}</div>
    </div>
  );
}
