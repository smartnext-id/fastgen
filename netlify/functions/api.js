// File: netlify/functions/api.js

require('dotenv').config();
const express = require('express');
const serverless = require('serverless-http'); // <-- Tambahkan ini
const { google } = require('googleapis');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const https = require('https');

// --- Inisialisasi & Konfigurasi ---
const app = express();
// Buat router terpisah agar bisa di-wrap oleh serverless
const router = express.Router(); 

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const JWT_SECRET = process.env.JWT_SECRET;
const SHEET_NAME = 'Users';
// Pastikan GOOGLE_CREDENTIALS sudah diatur di Netlify
const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);

app.use(cors());
app.use(express.json());

// --- Fungsi Helper & Middleware (Sama seperti sebelumnya) ---
async function getSheetsInstance() {
    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const authClient = await auth.getClient();
    return google.sheets({ version: 'v4', auth: authClient });
}
function verifyToken(req, res, next) { /* ... (Kode verifyToken Anda sama persis) ... */ }

// --- API Endpoints (Gunakan `router` bukan `app`) ---
// LOGIN
router.post('/login', async (req, res) => {
    // ... (Kode endpoint login Anda sama persis)
});

// GET TOKENS
router.get('/getTokens', verifyToken, async (req, res) => {
    // ... (Kode endpoint getTokens Anda sama persis)
});

// DEDUCT TOKENS
router.post('/deductTokens', verifyToken, async (req, res) => {
    // ... (Kode endpoint deductTokens Anda sama persis)
});

// ENHANCE PROMPT
router.post('/enhancePrompt', verifyToken, async (req, res) => {
    // ... (Kode endpoint enhancePrompt Anda sama persis)
});


// --- Bagian Penting untuk Netlify ---
// Gunakan prefix /api untuk semua rute di router
app.use('/api/', router); 

// Export handler untuk Netlify
module.exports.handler = serverless(app);