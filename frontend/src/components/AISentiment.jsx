function fmtPrice(p) {
  if (!p) return '—';
  return p > 1000
    ? '$' + p.toLocaleString('en', { maximumFractionDigits: 0 })
    : '$' + p.toFixed(3);
}

export default function AISentiment({ signals, livePrices, lastAnalysisTime }) {
  const score = signals?.sentiment ?? null;
  const label = signals?.sentiment_label ?? 'INITIALISING';

  const scoreClass = score == null ? 'neutral' : score > 60 ? 'up' : score > 40 ? 'cyan' : 'down';
  const barWidth = score ?? 50;
  const updatedAt = lastAnalysisTime ? new Date(lastAnalysisTime).toLocaleTimeString() : '—';

  return (
    <div className="panel">
      <div className="panel-title">
        <span>AI Sentiment</span>
        <div className="live-tag"><div className="dot cyan" />CLAUDE</div>
      </div>

      <div className={`sentiment-score ${scoreClass}`}>{score ?? '—'}</div>
      <div className={`sentiment-word ${scoreClass}`}>{label}</div>

      <div className="bar-bg">
        <div
          className="bar-fill"
          style={{
            width: `${barWidth}%`,
            background: 'linear-gradient(90deg, var(--accent2), var(--accent))',
          }}
        />
      </div>
      <div className="bar-labels">
        <span>BEARISH</span>
        <span>NEUTRAL</span>
        <span>BULLISH</span>
      </div>

      <div style={{ marginTop: 12 }}>
        {[
          ['BTC', livePrices.BTC?.price],
          ['ETH', livePrices.ETH?.price],
          ['SOL', livePrices.SOL?.price],
          ['DOT', livePrices.DOT?.price],
          ['ADA', livePrices.ADA?.price],
        ].map(([coin, price]) => (
          <div key={coin} className="config-row">
            <span className="config-label">{coin}</span>
            <span className={`config-value ${livePrices[coin]?.change >= 0 ? 'up' : 'down'}`}>
              {fmtPrice(price)}
            </span>
          </div>
        ))}
        <div className="config-row">
          <span className="config-label">Updated</span>
          <span className="config-value">{updatedAt}</span>
        </div>
      </div>
    </div>
  );
}
