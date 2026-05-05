const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendTelegram(msg, enabled = true) {
  if (!enabled || !TOKEN || !CHAT_ID) return;
  try {
    const safeMsg = msg.length > 4000 ? msg.slice(0, 4000) + '...' : msg;
    const body = JSON.stringify({ chat_id: CHAT_ID, text: safeMsg, parse_mode: 'HTML' });
    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    const result = await res.json();
    if (!result.ok) {
      // Retry without HTML parse mode if formatting failed
      await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: CHAT_ID, text: safeMsg.replace(/<[^>]*>/g, '') }),
      });
    }
  } catch (e) {
    console.log('Telegram error:', e.message);
  }
}

module.exports = { sendTelegram };
