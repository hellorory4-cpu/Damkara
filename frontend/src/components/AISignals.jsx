const COIN_COLORS = {
  SOL:  { bg: 'rgba(153,69,255,0.15)',  color: '#9945ff' },
  BTC:  { bg: 'rgba(247,147,26,0.15)',  color: '#f7931a' },
  ETH:  { bg: 'rgba(98,126,234,0.15)',  color: '#627eea' },
  AVAX: { bg: 'rgba(232,65,66,0.15)',   color: '#e84142' },
  LINK: { bg: 'rgba(0,136,255,0.15)',   color: '#0088ff' },
  DOT:  { bg: 'rgba(230,0,122,0.15)',   color: '#e6007a' },
  MATIC:{ bg: 'rgba(130,71,229,0.15)',  color: '#8247e5' },
  ADA:  { bg: 'rgba(0,51,173,0.15)',    color: '#4a9eff' },
  ATOM: { bg: 'rgba(110,68,226,0.15)',  color: '#6e44e2' },
};

function getTier(confidence) {
  if (confidence >= 80) return { label: '🟢 FULL',  bg: 'rgba(0,255,136,0.1)',   color: 'var(--green)' };
  if (confidence >= 70) return { label: '🟡 HALF',  bg: 'rgba(255,215,0,0.1)',   color: 'var(--gold)' };
  if (confidence >= 60) return { label: '🟠 QTR',   bg: 'rgba(255,140,0,0.1)',   color: '#ff8c00' };
  return                       { label: '⛔ SKIP',  bg: 'rgba(255,255,255,0.04)', color: 'var(--muted)' };
}

function fmtPrice(price) {
  if (!price) return '';
  return '$' + (price > 100 ? price.toFixed(0) : price.toFixed(3));
}

export default function AISignals({ signals, aiThinking, livePrices, settings }) {
  const minConfidence = settings?.minConfidence ?? 60;

  return (
    <div className="panel">
      <div className="panel-title">
        <span>AI Trading Signals</span>
        <div className="live-tag"><div className="dot cyan" />DAMKARA</div>
      </div>

      {aiThinking && (
        <div className="ai-thinking">
          <div className="spinner" />
          DAMKARA is analysing the markets...
        </div>
      )}

      <div style={{ maxHeight: 500, overflowY: 'auto' }}>
        {!signals ? (
          <div className="empty-state">Initialising AI analysis...</div>
        ) : (
          signals.signals.map(s => {
            const c = COIN_COLORS[s.coin] || { bg: 'rgba(255,255,255,0.08)', color: '#fff' };
            const tier = getTier(s.confidence);
            const skip = s.confidence < minConfidence;
            const badgeClass = s.action === 'BUY' ? 'badge-buy' : s.action === 'SELL' ? 'badge-sell' : 'badge-hold';

            return (
              <div key={s.coin} className="signal-item" style={{ opacity: skip ? 0.35 : 1 }}>
                <div className="signal-left">
                  <div className="signal-coin" style={{ background: c.bg, color: c.color }}>
                    {s.coin[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="signal-name">
                      {s.coin}
                      <span className="tier-tag" style={{ background: tier.bg, color: tier.color }}>
                        {tier.label}
                      </span>
                      {skip && (
                        <span style={{ fontSize: 9, color: 'var(--muted)', fontFamily: 'Space Mono, monospace' }}>
                          SKIP
                        </span>
                      )}
                    </div>
                    <div className="signal-reason">
                      {s.coin}/USDT · {s.confidence}% conf · {s.reason}
                    </div>
                  </div>
                </div>
                <div className="signal-right">
                  <span className={`signal-badge ${badgeClass}`}>{s.action}</span>
                  <span style={{ fontSize: 9, fontFamily: 'Space Mono, monospace', color: 'var(--muted)' }}>
                    {fmtPrice(livePrices[s.coin]?.price)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
