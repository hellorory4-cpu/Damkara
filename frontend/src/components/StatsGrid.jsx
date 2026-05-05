export default function StatsGrid({
  portfolio, pnl, trades, openPositions,
  wins, winRate, marketData, signals,
}) {
  const initialBalance = 1000;
  const pct = parseFloat(((portfolio - initialBalance) / initialBalance * 100).toFixed(2));
  const fng = marketData?.fng;

  let moodText = 'Scanning...';
  let moodClass = 'neutral';
  if (fng?.value != null) {
    moodText = `${fng.value} · ${fng.label}`;
    moodClass = fng.value > 60 ? 'up' : fng.value > 40 ? 'cyan' : 'down';
  }

  const lastSignalText = signals?.reasoning
    ? signals.reasoning.substring(0, 35) + '...'
    : 'No signal yet';

  return (
    <div className="grid-stats">
      <div className="panel">
        <div className="panel-label">Portfolio</div>
        <div className={`stat-value ${pnl >= 0 ? 'up' : 'down'}`}>
          ${portfolio.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <div className={`stat-change ${pct >= 0 ? 'up' : 'down'}`}>
          {pct >= 0 ? '▲ +' : '▼ '}{Math.abs(pct)}% total
        </div>
      </div>

      <div className="panel">
        <div className="panel-label">Total P&amp;L</div>
        <div className={`stat-value ${pnl >= 0 ? 'up' : 'down'}`}>
          {pnl >= 0 ? '+$' : '-$'}{Math.abs(pnl).toFixed(2)}
        </div>
        <div className="stat-change neutral">{trades.length} trades</div>
      </div>

      <div className="panel">
        <div className="panel-label">Win Rate</div>
        <div className={`stat-value ${winRate == null ? 'neutral' : winRate >= 55 ? 'up' : winRate >= 45 ? 'neutral' : 'down'}`}>
          {winRate != null ? `${winRate}%` : '—'}
        </div>
        <div className="stat-change neutral">
          {trades.length ? `${wins}W / ${trades.length - wins}L` : 'Awaiting trades'}
        </div>
      </div>

      <div className="panel">
        <div className="panel-label">Open Positions</div>
        <div className="stat-value cyan">{openPositions.length}</div>
        <div className="stat-change neutral">{lastSignalText}</div>
      </div>

      <div className="panel">
        <div className="panel-label">Market Mood</div>
        <div className={`stat-value ${moodClass}`} style={{ fontSize: 18 }}>{moodText}</div>
        <div className="stat-change neutral">Fear &amp; Greed</div>
      </div>
    </div>
  );
}
