export default function Header({ botActive, wsConnected, onToggleBot }) {
  return (
    <header>
      <div className="logo">
        <div className="logo-icon">⚡</div>
        <div>
          <div className="logo-text">DAM<span>KARA</span></div>
          <div className="logo-sub">SUMERIAN · THE ANCIENT TRADER · AI SYSTEM</div>
        </div>
      </div>
      <div className="header-right">
        <div className="badge badge-gold">⚡ TESTNET</div>
        <div className={`ws-status ${wsConnected ? 'ws-connected' : 'ws-disconnected'}`}>
          <div className={`dot ${wsConnected ? 'green' : 'grey'}`} />
          {wsConnected ? 'LIVE DATA' : 'CONNECTING'}
        </div>
        <div className="badge badge-purple">🤖 CLAUDE AI</div>
        <div
          className={`status-pill ${botActive ? 'active' : 'inactive'}`}
          onClick={onToggleBot}
        >
          <div className={`dot ${botActive ? 'green' : 'grey'}`} />
          <span>{botActive ? 'ACTIVE' : 'PAUSED'}</span>
        </div>
      </div>
    </header>
  );
}
