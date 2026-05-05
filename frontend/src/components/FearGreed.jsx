export default function FearGreed({ marketData }) {
  const fng = marketData?.fng ?? {};
  const val = fng.value;
  const valueClass = val == null ? 'neutral' : val > 60 ? 'up' : val > 40 ? 'cyan' : 'down';

  return (
    <div className="panel">
      <div className="panel-title">
        <span>Fear &amp; Greed Index</span>
        <div className="live-tag"><div className="dot cyan" />LIVE</div>
      </div>
      <div className={`data-value ${valueClass}`}>{val ?? '—'}</div>
      <div className="data-label">{fng.label || 'LOADING...'}</div>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{
            width: `${val ?? 50}%`,
            background: 'linear-gradient(90deg, var(--accent3), var(--gold), var(--green))',
          }}
        />
      </div>
      <div style={{ marginTop: 10, fontSize: 10, fontFamily: 'Space Mono, monospace', color: 'var(--muted)', lineHeight: 1.6 }}>
        {fng.description || 'Fetching market sentiment data...'}
      </div>
    </div>
  );
}
