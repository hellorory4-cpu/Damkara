require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS portfolio (
        id SERIAL PRIMARY KEY,
        balance DECIMAL(14,4) DEFAULT 1000.0000,
        initial_balance DECIMAL(14,4) DEFAULT 1000.0000,
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS trades (
        id SERIAL PRIMARY KEY,
        coin VARCHAR(10) NOT NULL,
        action VARCHAR(10) NOT NULL,
        amount DECIMAL(14,4) NOT NULL,
        entry_price DECIMAL(20,8) NOT NULL,
        exit_price DECIMAL(20,8),
        profit DECIMAL(14,4),
        profit_pct DECIMAL(10,4),
        confidence INTEGER,
        tier VARCHAR(20),
        reason TEXT,
        status VARCHAR(20) DEFAULT 'open',
        opened_at TIMESTAMP DEFAULT NOW(),
        closed_at TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        take_profit DECIMAL(6,2) DEFAULT 5.0,
        stop_loss DECIMAL(6,2) DEFAULT 2.5,
        min_confidence INTEGER DEFAULT 60,
        base_risk DECIMAL(6,2) DEFAULT 2.0,
        auto_trade BOOLEAN DEFAULT true,
        telegram_enabled BOOLEAN DEFAULT true,
        bot_active BOOLEAN DEFAULT true,
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS signals (
        id SERIAL PRIMARY KEY,
        sentiment INTEGER,
        sentiment_label VARCHAR(50),
        reasoning TEXT,
        market_regime VARCHAR(50),
        signals_data JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      INSERT INTO portfolio (balance, initial_balance)
      SELECT 1000.0000, 1000.0000
      WHERE NOT EXISTS (SELECT 1 FROM portfolio LIMIT 1);
    `);

    await client.query(`
      INSERT INTO settings DEFAULT VALUES
      WHERE NOT EXISTS (SELECT 1 FROM settings LIMIT 1);
    `);

    console.log('Database schema ready');
  } finally {
    client.release();
  }
}

module.exports = { pool, initDB };
