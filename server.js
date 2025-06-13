const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

wss.on('connection', ws => {
    console.log('🔌 A new client has connected');

    ws.send(JSON.stringify({
        type: 'connected',
        message: '✅ You are now connected to the WebSocket server!'
    }));

    // Send a test alert every 10 seconds (for demonstration purposes)
    const interval = setInterval(() => {
        ws.send(JSON.stringify({
            type: 'slot_available',
            message: '🚨 BLS appointment available! Book now.'
        }));
    }, 10000);

    ws.on('close', () => {
        console.log('❌ Client disconnected');
        clearInterval(interval);
    });
});

app.get('/', (req, res) => {
    res.send('🟢 WebSocket Server is running.');
});

server.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});