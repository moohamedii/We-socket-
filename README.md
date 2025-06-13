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
        message: '✅ Connected to the BLS WebSocket Server'
    }));

    ws.on('close', () => {
        clients = clients.filter(c => c !== ws);
        console.log('❌ Client disconnected');
    });
});

// ⚠️ URL of the BLS appointment page to monitor
const BLS_URL = 'https://morocco.blsspainvisa.com/book_appointment.php'; // Change this if needed

// 🔍 Check for available appointments
async function checkForSlots() {
    try {
        const res = await axios.get(BLS_URL);
        const $ = cheerio.load(res.data);
        const bodyText = $('body').text();

        if (!bodyText.includes('No appointment')) {
            console.log('🎯 Appointment found! Notifying clients...');
            clients.forEach(ws => {
                ws.send(JSON.stringify({
                    type: 'slot_available',
                    message: '🚨 BLS Appointment Available! Book Now!'
                }));
            });
        } else {
            console.log('🔄 No appointments currently available.');
        }
    } catch (err) {
        console.error('❌ Error while checking BLS:', err.message);
    }
}

// ⏱️ Check every 15 seconds
setInterval(checkForSlots, 15000);

// 💤 Prevent the server from sleeping on Render (self-ping every 5 minutes)
setInterval(() => {
    axios.get('https://we-socket-fznm.onrender.com')
        .then(() => console.log('👀 Self-ping sent to keep server awake'))
        .catch(err => console.log('❌ Self-ping failed:', err.message));
}, 5 * 60 * 1000);

app.get('/', (req, res) => {
    res.send('🟢 BLS WebSocket server is up and running.');
});

server.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});
