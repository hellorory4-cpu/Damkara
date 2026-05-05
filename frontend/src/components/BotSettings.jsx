import { useState, useEffect } from 'react';

export default function BotSettings({ settings, aiThinking, onSettingsChange, onAnalyse, onReset }) {
  const [localSettings, setLocalSettings] = useState(settings);

  // Sync when server pushes updated settings (e.g. on initial state load)
  useEffect(() => {
    setLocalSettings(settings);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.takeProfit, settings.stopLoss, settings.minConfidence, settings.baseRisk, settings.autoTrade, settings.telegramEnabled]);

  const update = (key, value) => {
    const updated = { ...localSettings, [key]: value };
    setLocalSettings(updated);
    onSettingsChange(updated);
  };

  return (
    <div className="panel">
      <div className="panel-title">⚙️ Bot Settings</div>

      <div className="slider-row">
        <div className="slider-header">
          <span className="slider-label">TAKE PROFIT</span>
          <span className="slider-val">{localSettings.takeProfit}%</span>
        </div>
        <input
          type="range" min="1" max="20" step="0.5"
          value={localSettings.takeProfit}
          onChange={e => update('takeProfit', parseFloat(e.target.value))}
        />
      </div>

      <div className="slider-row">
        <div className="slider-header">
          <span className="slider-label">STOP LOSS</span>
          <span className="slider-val">{localSettings.stopLoss}%</span>
        </div>
        <input
          type="range" min="0.5" max="10" step="0.5"
          value={localSettings.stopLoss}
          onChange={e => update('stopLoss', parseFloat(e.target.value))}
        />
      </div>

      <div className="slider-row">
        <div className="slider-header">
          <span className="slider-label">MIN CONFIDENCE</span>
          <span className="slider-val">{localSettings.minConfidence}%</span>
        </div>
        <input
          type="range" min="50" max="90" step="5"
          value={localSettings.minConfidence}
          onChange={e => update('minConfidence', parseInt(e.target.value))}
        />
      </div>

      <div className="slider-row">
        <div className="slider-header">
          <span className="slider-label">BASE RISK %</span>
          <span className="slider-val">{localSettings.baseRisk}%</span>
        </div>
        <input
          type="range" min="0.5" max="5" step="0.5"
          value={localSettings.baseRisk}
          onChange={e => update('baseRisk', parseFloat(e.target.value))}
        />
      </div>

      <div className="config-row" style={{ marginTop: 8 }}>
        <span className="config-label">AUTO TRADE</span>
        <div
          className={`toggle ${localSettings.autoTrade ? 'on' : ''}`}
          onClick={() => update('autoTrade', !localSettings.autoTrade)}
        />
      </div>

      <div className="config-row">
        <span className="config-label">TELEGRAM ALERTS</span>
        <div
          className={`toggle ${localSettings.telegramEnabled ? 'on' : ''}`}
          onClick={() => update('telegramEnabled', !localSettings.telegramEnabled)}
        />
      </div>

      <div className="tg-status">
        <div className="dot cyan" />
        <span>Telegram connected — alerts active</span>
      </div>

      <div className="controls">
        <button
          className="btn btn-primary"
          onClick={onAnalyse}
          disabled={aiThinking}
        >
          {aiThinking ? '⏳ ANALYSING...' : '⚡ ANALYSE NOW'}
        </button>
        <button className="btn btn-danger" onClick={onReset}>✕ RESET</button>
      </div>
    </div>
  );
}
