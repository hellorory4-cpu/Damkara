const COINS = ['BTC', 'ETH', 'SOL', 'AVAX', 'LINK', 'DOT', 'MATIC', 'ADA', 'ATOM'];

function fmtVol(v) {
  if (!v) return '—';
  return v > 1e9 ? '$' + (v / 1e9).toFixed(1) + 'B' : '$' + (v / 1e6).toFixed(0) + 'M';
}

export default function VolumeAnalysis({ livePrices }) {
  const totalVolume = COINS.reduce((sum, c) => sum + (livePrices[c]?.volume || 0), 0);

  return (
    <div className="panel">
      <div className="panel-title">
        <span>Volume Analysis</span>
        <div className="live-tag"><div className="dot cyan" />LIVE</div>
      </div>
      <div className="data-value" style={{ color: 'var(--gold)' }}>{fmtVol(totalVolume) || '—'}</div>
      <div className="data-label">24H TOTAL VOLUME</div>
      <div style={{ marginTop: 12 }}>
        {[
          ['BTC Vol', 'BTC'],
          ['ETH Vol', 'ETH'],
          ['SOL Vol', 'SOL'],
        ].map(([label, coin]) => (
          <div key={coin} className="config-row">
            <span className="config-label">{label}</span>
            <span className="config-value">{fmtVol(livePrices[coin]?.volume)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
