const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const axios = require('axios');
const cheerio = require('cheerio');

const app = express();
const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let clients = [];

// ✅ Telegram config
const TELEGRAM_BOT_TOKEN = '7962715498:AAH2dZ7teT6m_n98nfxVW3mCkmIzrNeeYUo';
const TELEGRAM_CHAT_ID = '8063543796';

// 🧠 Prevent duplicate notifications
let lastAlertSent = false;

// 🛑 List of phrases that mean NO appointments
const NEGATIVE_PATTERNS = [
  'no appointment',
  'no slots available',
  'not available',
  'fully booked',
  'currently unavailable',
  'no appointments are available',
  'not yet open'
];

async function sendTelegramMessage(message) {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    try {
        await axios.post(url, {
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
        });
        console.log('✅ Telegram message sent!');
    } catch (err) {
        console.error('❌ Telegram error:', err.message);
    }
}

wss.on('connection', ws => {
    console.log('🔌 New client connected');
    clients.push(ws);

    ws.send(JSON.stringify({
        type: 'connected',
        message: '✅ Connected to BLS appointment watcher.'
    }));

    ws.on('close', () => {
        clients = clients.filter(c => c !== ws);
        console.log('❌ Client disconnected');
    });
});

const BLS_URL = 'https://morocco.blsportugal.com/MAR/bls/VisaApplicationStatus';

// 🔍 Check for appointments
async function checkForSlots() {
    try {
        const res = await axios.get(BLS_URL);
        const $ = cheerio.load(res.data);
        const bodyText = $('body').text().toLowerCase();

        // Look for any known negative phrases
        const isNegative = NEGATIVE_PATTERNS.some(pattern => bodyText.includes(pattern));

        if (!isNegative) {
            if (!lastAlertSent) {
                console.log('🎯 Real appointment availability detected! Sending alert...');

                // WebSocket message
                clients.forEach(ws => {
                    ws.send(JSON.stringify({
                        type: 'slot_available',
                        message: '🚨 Appointment available! Book it now!'
                    }));
                });

                // Telegram alert
                await sendTelegramMessage(`🚨 Visa appointment available!\nBook now:\n${BLS_URL}`);

                lastAlertSent = true;
            } else {
                console.log('✅ Appointments still available. No duplicate message.');
            }
        } else {
            console.log('🔄 No appointments available.');
            lastAlertSent = false;
        }
    } catch (err) {
        console.error('❌ Error checking the BLS page:', err.message);
    }
}

// Run every 15 seconds
setInterval(checkForSlots, 15000);

// Keep Render alive
setInterval(() => {
    axios.get('https://we-socket-fznm.onrender.com')
        .then(() => console.log('👀 Self-ping to keep server awake'))
        .catch(err => console.log('❌ Self-ping error:', err.message));
}, 5 * 60 * 1000);

app.get('/', (req, res) => {
    res.send('🟢 BLS appointment monitor is running.');
});

server.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});
