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

wss.on('connection', ws => {
    console.log('🔌 New client connected');
    clients.push(ws);

    ws.send(JSON.stringify({
        type: 'connected',
        message: '✅ Connected to BLS Status Monitor WebSocket Server'
    }));

    ws.on('close', () => {
        clients = clients.filter(c => c !== ws);
        console.log('❌ Client disconnected');
    });
});

// ✅ Page to monitor
const BLS_URL = 'https://morocco.blsportugal.com/MAR/bls/VisaApplicationStatus';

// 🔍 Keyword to detect (you can change this based on real page behavior)
const KEYWORD = 'appointment';

// 🧠 Function to check for keyword on the page
async function checkForSlots() {
    try {
        const res = await axios.get(BLS_URL);
        const $ = cheerio.load(res.data);
        const bodyText = $('body').text().toLowerCase();

        if (bodyText.includes(KEYWORD)) {
            console.log('🎯 Keyword found! Notifying clients...');
            clients.forEach(ws => {
                ws.send(JSON.stringify({
                    type: 'slot_available',
                    message: '🚨 BLS Visa status page updated! "Appointment" found.'
                }));
            });
        } else {
            console.log('🔄 No keyword found. No update yet.');
        }
    } catch (err) {
        console.error('❌ Error while checking the BLS page:', err.message);
    }
}

// 🔁 Check every 15 seconds
setInterval(checkForSlots, 15000);

// 💤 Prevent Render from sleeping (self-ping every 5 minutes)
setInterval(() => {
    axios.get('https://we-socket-fznm.onrender.com')
        .then(() => console.log('👀 Self-ping sent to keep server awake'))
        .catch(err => console.log('❌ Self-ping failed:', err.message));
}, 5 * 60 * 1000);

app.get('/', (req, res) => {
    res.send('🟢 BLS Visa Application Status WebSocket Server is running.');
});

server.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});
