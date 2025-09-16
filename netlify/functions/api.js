// File: netlify/functions/api.js

require('dotenv').config();
const express = require('express');
const serverless = require('serverless-http'); // Diperlukan untuk Netlify
const { google } = require('googleapis');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const https = require('https');

const app = express();
const router = express.Router(); // Gunakan router untuk endpoint

// --- KONFIGURASI DARI ENVIRONMENT VARIABLES ---
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const JWT_SECRET = process.env.JWT_SECRET;
const SHEET_NAME = 'Users';
const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);

app.use(cors());
app.use(express.json());

// --- FUNGSI HELPER & MIDDLEWARE ---
async function getSheetsInstance() {
    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const authClient = await auth.getClient();
    return google.sheets({ version: 'v4', auth: authClient });
}

function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).send({ error: 'Unauthorized: No token provided' });
    }
    const token = authHeader.split('Bearer ')[1];
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).send({ error: 'Unauthorized: Invalid token' });
        }
        req.user = decoded;
        next();
    });
}

// --- API ENDPOINTS (Gunakan `router` bukan `app`) ---
router.post('/login', async (req, res) => {
    const { userId, password } = req.body;
    try {
        const sheets = await getSheetsInstance();
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A:B`,
        });
        const rows = response.data.values || [];
        const userRow = rows.find(row => row && row[0] === userId);
        if (!userRow) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }
        const hashedPassword = userRow[1];
        const isMatch = await bcrypt.compare(password, hashedPassword);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }
        const token = jwt.sign({ userId: userRow[0] }, JWT_SECRET, { expiresIn: '1d' });
        res.json({ token });
    } catch (err) {
        console.error("Login error:", err.message);
        res.status(500).json({ error: 'Server error during login' });
    }
});

router.get('/getTokens', verifyToken, async (req, res) => {
    const userId = req.user.userId;
    try {
        const sheets = await getSheetsInstance();
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${SHEET_NAME}!A:C`,
        });
        const rows = response.data.values || [];
        const userRow = rows.find(row => row && row[0] === userId);
        if (userRow && userRow[2] !== undefined) {
            res.json({ tokens: parseInt(userRow[2], 10) || 0 });
        } else if (userRow) {
            res.json({ tokens: 0 });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (err) {
        console.error('Get tokens error:', err.message);
        res.status(500).json({ error: 'Failed to fetch tokens' });
    }
});

router.post('/deductTokens', verifyToken, async (req, res) => {
    // ... (kode deductTokens Anda)
});

router.post('/enhancePrompt', verifyToken, async (req, res) => {
    // ... (kode enhancePrompt Anda)
});


// --- BAGIAN PENTING UNTUK NETLIFY ---
app.use('/api/', router);
module.exports.handler = serverless(app);
