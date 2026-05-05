export default function BTCDominance({ marketData }) {
  const btc = marketData?.btcDominance ?? {};
  const val = btc.value;

  return (
    <div className="panel">
      <div className="panel-title">
        <span>BTC Dominance</span>
        <div className="live-tag"><div className="dot cyan" />LIVE</div>
      </div>
      <div className="data-value cyan">{val != null ? `${val}%` : '—'}</div>
      <div className="data-label">BITCOIN MARKET SHARE</div>
      <div className="progress-bar" style={{ marginTop: 10 }}>
        <div
          className="progress-fill"
          style={{ width: `${val ?? 50}%`, background: 'var(--accent)' }}
        />
      </div>
      <div style={{ marginTop: 10, fontSize: 10, fontFamily: 'Space Mono, monospace', color: 'var(--muted)', lineHeight: 1.6 }}>
        {btc.description || 'High dominance = altcoins may underperform.'}
      </div>
    </div>
  );
}
