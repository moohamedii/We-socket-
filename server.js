const express = require('express');
const http = require('http');
const axios = require('axios');
const cheerio = require('cheerio');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// BLS settings
const BLS_URL = 'https://morocco.blsportugal.com/MAR/bls/VisaApplicationStatus';
const CHECK_INTERVAL = 15000; // 15 seconds

// Telegram credentials
const TELEGRAM_BOT_TOKEN = '7962715498:AAH2dZ7teT6m_n98nfxVW3mCkmIzrNeeYUo';
const TELEGRAM_CHAT_ID = '8063543796';

const NEGATIVE_PATTERNS = [
  'no appointment', 'no slots available', 'not available',
  'fully booked', 'currently unavailable',
  'no appointments are available', 'not yet open'
];

// Active WebSocket clients
let clients = [];
let lastAlertSent = false;

// Send alert to Telegram
async function sendTelegramAlert(message) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    await axios.post(url, { chat_id: TELEGRAM_CHAT_ID, text: message });
    console.log('✅ Telegram alert sent.');
  } catch (error) {
    console.error('❌ Telegram error:', error.message);
  }
}

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('🔌 WebSocket client connected.');
  clients.push(ws);

  ws.send(JSON.stringify({
    type: 'connected',
    message: '🟢 BLS appointment monitor active.'
  }));

  ws.on('close', () => {
    clients = clients.filter(client => client !== ws);
    console.log('❌ WebSocket client disconnected.');
  });
});

// Main logic: Check for available appointments
async function checkAppointments() {
  try {
    const response = await axios.get(BLS_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const bodyText = $('body').text().toLowerCase();

    const isUnavailable = NEGATIVE_PATTERNS.some(pattern => bodyText.includes(pattern));

    if (!isUnavailable) {
      if (!lastAlertSent) {
        console.log('🚨 Appointment detected! Sending alerts...');

        // Send Telegram alert
        await sendTelegramAlert(`🚨 BLS Visa appointment available!\n👉 ${BLS_URL}`);

        // Send WebSocket message
        clients.forEach(ws => {
          ws.send(JSON.stringify({
            type: 'slot_available',
            message: '🚨 Appointment available! Act fast!'
          }));
        });

        lastAlertSent = true;
      } else {
        console.log('⏳ Appointment still available, skipping duplicate alert.');
      }
    } else {
      console.log('🔄 No appointments found.');
      lastAlertSent = false;
    }

  } catch (error) {
    console.error('⚠️ Error checking BLS:', error.message);
  }
}

// Periodic checker
setInterval(checkAppointments, CHECK_INTERVAL);

// Self-ping every 5 minutes to prevent sleep (for Render/Koyeb)
setInterval(() => {
  axios.get(`http://localhost:${PORT}`)
    .then(() => console.log('🔁 Self-ping successful.'))
    .catch(err => console.log('⚠️ Self-ping failed:', err.message));
}, 5 * 60 * 1000);

// Root route
app.get('/', (req, res) => {
  res.send('🟢 BLS Appointment Monitor is live.');
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
