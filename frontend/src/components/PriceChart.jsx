import { useState, useRef, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Filler, Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

const COINS = ['SOL', 'BTC', 'ETH', 'AVAX', 'DOT', 'MATIC', 'ADA', 'ATOM', 'LINK'];

export default function PriceChart({ livePrices, priceHistory }) {
  const [currentCoin, setCurrentCoin] = useState('SOL');
  const chartRef = useRef(null);

  const history = priceHistory[currentCoin] || [];

  const buildGradient = (ctx) => {
    if (!ctx) return 'rgba(0,229,255,0.1)';
    const grad = ctx.createLinearGradient(0, 0, 0, 190);
    grad.addColorStop(0, 'rgba(0,229,255,0.2)');
    grad.addColorStop(1, 'rgba(0,229,255,0)');
    return grad;
  };

  const chartData = {
    labels: history.map(() => ''),
    datasets: [{
      data: history,
      borderColor: 'var(--accent)',
      borderWidth: 2,
      fill: true,
      backgroundColor: (ctx) => buildGradient(ctx.chart.ctx),
      pointRadius: 0,
      tension: 0.4,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: { label: c => '$' + c.raw.toLocaleString() },
        backgroundColor: '#0a0f18',
        borderColor: '#151f2e',
        borderWidth: 1,
        bodyColor: '#00e5ff',
      },
    },
    scales: {
      x: { display: false },
      y: {
        display: true,
        grid: { color: 'rgba(255,255,255,0.02)' },
        ticks: {
          color: '#4a5568',
          font: { family: 'Space Mono', size: 9 },
          callback: v => '$' + v.toLocaleString(),
        },
      },
    },
  };

  return (
    <div className="panel">
      <div className="panel-title">
        <span>{currentCoin}/USDT — Live</span>
        <div className="coin-tabs">
          {COINS.map(coin => (
            <span
              key={coin}
              className={`coin-tab ${currentCoin === coin ? 'active' : ''}`}
              onClick={() => setCurrentCoin(coin)}
            >
              {coin}
            </span>
          ))}
        </div>
      </div>
      <div className="chart-container">
        {history.length > 0 ? (
          <Line ref={chartRef} data={chartData} options={options} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', fontFamily: 'Space Mono, monospace', fontSize: 11 }}>
            Waiting for price data...
          </div>
        )}
      </div>
    </div>
  );
}
