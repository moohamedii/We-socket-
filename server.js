const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const axios = require('axios');
const cheerio = require('cheerio');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;

// Enhanced server configuration
const server = http.createServer(app);
const wss = new WebSocket.Server({ 
  server,
  clientTracking: true,
  perMessageDeflate: {
    zlibDeflateOptions: {
      chunkSize: 1024,
      memLevel: 7,
      level: 3
    },
    zlibInflateOptions: {
      chunkSize: 10 * 1024
    },
    clientNoContextTakeover: true,
    serverNoContextTakeover: true,
    serverMaxWindowBits: 10,
    concurrencyLimit: 10,
    threshold: 1024
  }
});

// Telegram config - Updated with your credentials
const TELEGRAM_CONFIG = {
  BOT_TOKEN: '7962715498:AAH2dZ7teT6m_n98nfxVW3mCkmIzrNeeYUo',
  CHAT_ID: '8063543796',
  API_URL: 'https://api.telegram.org/bot'
};

// State management
const state = {
  lastAlertSent: false,
  lastCheckTime: null,
  lastError: null,
  totalChecks: 0,
  availableCount: 0,
  errorCount: 0,
  isActive: true
};

// Enhanced negative patterns with multilingual support
const NEGATIVE_PATTERNS = [
  'no appointment',
  'no slots available',
  'not available',
  'fully booked',
  'currently unavailable',
  'no appointments are available',
  'not yet open',
  'aucun rendez-vous',
  'pas de créneau disponible',
  'complet',
  'indisponible',
  'non disponible'
];

// BLS configuration
const BLS_CONFIG = {
  url: 'https://morocco.blsportugal.com/MAR/bls/VisaApplicationStatus',
  checkInterval: process.env.CHECK_INTERVAL || 15000, // 15 seconds
  timeout: 30000, // 30 seconds timeout
  retryCount: 3,
  retryDelay: 5000
};

// Enhanced Telegram message sender with retry logic
async function sendTelegramMessage(message) {
  const url = `${TELEGRAM_CONFIG.API_URL}${TELEGRAM_CONFIG.BOT_TOKEN}/sendMessage`;
  
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await axios.post(url, {
        chat_id: TELEGRAM_CONFIG.CHAT_ID,
        text: message,
        parse_mode: 'HTML'
      }, { timeout: 10000 });
      
      console.log('✅ Telegram message sent successfully');
      return response.data;
    } catch (err) {
      console.error(`❌ Telegram send attempt ${attempt} failed:`, err.message);
      if (attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      } else {
        throw err;
      }
    }
  }
}

// [Rest of the code remains exactly the same as in the previous enhanced version...]
// WebSocket connection management, checkForSlots function, endpoints, etc.
// All other parts of the code remain unchanged

// [Previous shutdown handler and server startup code...]
