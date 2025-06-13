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

// ✅ Telegram Bot Configuration
const TELEGRAM_BOT_TOKEN = '7962715498:AAH2dZ7teT6m_n98nfxVW3mCkmIzrNeeYUo';
const TELEGRAM_CHAT_ID = '8063543796'; // <- This is your Telegram chat ID

// 📩 Function to send Telegram messages
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
        message: '✅ Connected to BLS Visa Watcher Server'
    }));

    ws.on('close', () => {
        clients = clients.filter(c => c !== ws);
        console.log('❌ Client disconnected');
    });
});

// 🌐 Page to monitor
const BLS_URL = 'https://morocco.blsportugal.com/MAR/bls/VisaApplicationStatus';
const KEYWORD = 'appointment'; // keyword to look for

// 🔍 Function to check the BLS page
async function checkForSlots() {
    try {
        const res = await axios.get(BLS_URL);
        const $ = cheerio.load(res.data);
        const bodyText = $('body').text().toLowerCase();

        if (bodyText.includes(KEYWORD)) {
            console.log('🎯 Keyword found! Sending alerts...');

            // Send to all connected WebSocket clients
            clients.forEach(ws => {
                ws.send(JSON.stringify({
                    type: 'slot_available',
                    message: '🚨 BLS Visa status updated! "Appointment" found.'
                }));
            });

            // Send Telegram alert
            await sendTelegramMessage(`🚨 BLS Visa status page updated!\n"Appointment" found:\n${BLS_URL}`);
        } else {
            console.log('🔄 No appointments found yet.');
        }
    } catch (err) {
        console.error('❌ Error checking BLS page:', err.message);
    }
}

// 🔁 Repeat check every 15 seconds
setInterval(checkForSlots, 15000);

// 💤 Prevent Render from sleeping
setInterval(() => {
    axios.get('https://we-socket-fznm.onrender.com')
        .then(() => console.log('👀 Self-ping sent to keep server awake'))
        .catch(err => console.log('❌ Self-ping error:', err.message));
}, 5 * 60 * 1000);

// Root route
app.get('/', (req, res) => {
    res.send('🟢 BLS Visa WebSocket + Telegram Server is running.');
});

server.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});
