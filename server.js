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
const CHECK_INTERVAL = 15000; // check every 15 seconds

// Telegram credentials
const TELEGRAM_BOT_TOKEN = '7757985073:AAGl-mTTiBY50k-D6Cu0mVuSGpIbhtWZ4CI';
const TELEGRAM_CHAT_ID = '845553854';

const NEGATIVE_PATTERNS = [
  'no appointment', 'no slots available', 'not available',
  'fully booked', 'currently unavailable',
  'no appointments are available', 'not yet open'
];

// Active WebSocket clients
let clients = [];
let lastAlertSent = false;

// Send Telegram alert
async function sendTelegramAlert(message) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  try {
    await axios.post(url, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message
    });
    console.log('✅ Telegram alert sent.');
  } catch (error) {
    console.error('❌ Failed to send Telegram alert:', error.message);
  }
}

// WebSocket connection
wss.on('connection', (ws) => {
  console.log('🔌 WebSocket client connected.');
  clients.push(ws);

  ws.send(JSON.stringify({
    type: 'connected',
    message: '🟢 BLS appointment monitor is active.'
  }));

  ws.on('close', () => {
    clients = clients.filter(client => client !== ws);
    console.log('❌ WebSocket client disconnected.');
  });
});

// Check for appointment availability
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

        // Telegram alert
        await sendTelegramAlert(`🚨 BLS Visa appointment available!\n👉 ${BLS_URL}`);

        // Notify WebSocket clients
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
    console.error('⚠️ Error while checking BLS site:', error.message);
  }
}

// Run checker periodically
setInterval(checkAppointments, CHECK_INTERVAL);

// Self-ping every 5 minutes (for Render/Koyeb keep-alive)
setInterval(() => {
  axios.get(`http://localhost:${PORT}`)
    .then(() => console.log('🔁 Self-ping OK.'))
    .catch(err => console.log('⚠️ Self-ping failed:', err.message));
}, 5 * 60 * 1000);

// Root route
app.get('/', (req, res) => {
  res.send('🟢 BLS Appointment Monitor is running.');
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
