const express = require('express');
const router = express.Router();
const bot = require('../services/bot');

router.get('/state', (req, res) => {
  res.json(bot.getState());
});

router.post('/analyse', async (req, res) => {
  try {
    bot.runAnalysisAndTrade(); // fire-and-forget, WS pushes result
    res.json({ ok: true, message: 'Analysis started' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/toggle-bot', async (req, res) => {
  try {
    const botActive = await bot.toggleBot();
    res.json({ botActive });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/reset', async (req, res) => {
  try {
    await bot.resetBot();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/settings', async (req, res) => {
  try {
    await bot.updateSettings(req.body);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
