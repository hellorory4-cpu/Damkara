function fmtEntry(price) {
  return price > 100 ? price.toFixed(0) : price.toFixed(3);
}

export default function TradeLog({ trades, openPositions, livePrices }) {
  const openItems = openPositions.map(pos => {
    const currentPrice = livePrices[pos.coin]?.price || pos.entryPrice;
    const diff = pos.action === 'BUY'
      ? (currentPrice - pos.entryPrice) / pos.entryPrice
      : (pos.entryPrice - currentPrice) / pos.entryPrice;
    const unrealised = parseFloat((pos.amount * diff).toFixed(2));
    const pct = parseFloat((diff * 100).toFixed(2));

    return (
      <div key={pos.id} className="trade-item" style={{ borderColor: 'rgba(0,229,255,0.2)' }}>
        <span className="trade-type trade-open">LIVE</span>
        <span style={{ fontWeight: 700 }}>{pos.coin}</span>
        <span style={{ color: 'var(--muted)' }}>@${fmtEntry(pos.entryPrice)}</span>
        <span className={unrealised >= 0 ? 'up' : 'down'} style={{ marginLeft: 'auto' }}>
          {unrealised >= 0 ? '+' : ''}${unrealised} ({pct}%)
        </span>
      </div>
    );
  });

  const closedItems = [...trades].slice(0, 8).map((t, i) => (
    <div key={t.id ?? i} className="trade-item">
      <span className={`trade-type ${t.type === 'BUY' ? 'trade-buy' : 'trade-sell'}`}>{t.type}</span>
      <span style={{ fontWeight: 700 }}>{t.coin}</span>
      <span style={{ color: 'var(--muted)' }}>@${fmtEntry(t.entryPrice)}</span>
      <span className={t.profit >= 0 ? 'up' : 'down'} style={{ marginLeft: 'auto' }}>
        {t.profit >= 0 ? '+' : ''}${t.profit.toFixed(2)}
      </span>
      <span style={{ color: 'var(--muted)' }}>{t.time}</span>
    </div>
  ));

  return (
    <div className="panel">
      <div className="panel-title">
        <span>Trade Log</span>
        <span style={{ fontSize: 10, fontFamily: 'Space Mono, monospace', color: 'var(--muted)' }}>
          {trades.length} trades
        </span>
      </div>
      <div style={{ maxHeight: 220, overflowY: 'auto' }}>
        {openItems}
        {closedItems}
        {!openPositions.length && !trades.length && (
          <div className="empty-state" style={{ padding: '20px 0' }}>No trades yet</div>
        )}
      </div>
    </div>
  );
}
