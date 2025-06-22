const express = require('express');
const cors = require('cors');
const path = require('path');
const { authenticateToken, isAdmin } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const donationsRouter = require('./routes/donations');
const recipientsRouter = require('./routes/recipients');
const chatRoutes = require('./routes/chat');
const socialRoutes = require('./routes/social');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
require('dotenv').config();

const app = express();

// Debug middleware - add this first
app.use((req, res, next) => {
    console.log('Request received:', {
        method: req.method,
        path: req.url,
        headers: req.headers
    });
    next();
});

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://sustenance.vercel.app'] 
    : ['http://localhost:3002'], // Updated to match frontend port
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

  // Serve uploaded files statically
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Route Middlewares
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/admin', authenticateToken, isAdmin, adminRoutes);
app.use('/api/donations', donationsRouter);
app.use('/api/recipients', recipientsRouter); // Single route handler - auth is managed inside the router
app.use('/api/chat', chatRoutes); // Added chat routes
app.use('/api/social', socialRoutes); // Add social routes

// Test route directly in server.js
app.get('/api/test', (req, res) => {
    res.json({ message: 'Server is working' });
});

// Add this directly in server.js, not in a router file
app.post('/test-update-hash', async (req, res) => {
  try {
    const { id, transactionHash } = req.body;
    console.log('Direct test route - Updating hash for donation:', id, transactionHash);
    
    const pool = require('./config/db'); // Adjust path as needed
    const result = await pool.query(
      'UPDATE donations SET transaction_hash = $1 WHERE id = $2 RETURNING *',
      [transactionHash, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Donation not found' });
    }

    res.json({ success: true, donation: result.rows[0] });
  } catch (error) {
    console.error('Error updating transaction hash:', error);
    res.status(500).json({ error: 'Failed to update transaction hash' });
  }
});

// Add this at the top level of your server.js file
app.post('/direct-update-hash', async (req, res) => {
  try {
    const { id, transactionHash } = req.body;
    console.log('Direct update hash - Received data:', req.body);
    
    const pool = require('./config/db'); // Adjust path as needed
    const result = await pool.query(
      'UPDATE donations SET transaction_hash = $1 WHERE id = $2 RETURNING *',
      [transactionHash, id]
    );

    console.log('Query result:', result);
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Donation not found' });
    }

    res.json({ success: true, donation: result.rows[0] });
  } catch (error) {
    console.error('Error updating transaction hash:', error);
    res.status(500).json({ error: 'Failed to update transaction hash' });
  }
});

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function runChat(userInput) {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  const chat = model.startChat({
    history: [
      {
        role: "user",
        parts: [{ text: "You are a helpful assistant for a donation platform called Sustenance. Your name is Sustenance Assistant.\n\nSustenance is a donation platform that connects donors with NGOs. Donors can make donations to NGOs, and NGOs can accept or reject donations. The platform supports both monetary and in-kind donations.\n\nPayment methods accepted are bank transfer and credit card. Sustenance processes donations within 1-2 working days after donor confirmation." }],
      },
      {
        role: "model",
        parts: [{ text: "Hi there! I'm the Sustenance Assistant. I'm here to help you with any questions about donations, NGOs, or our platform." }],
      }
    ],
    generationConfig: {
      temperature: 0.7,
      topK: 1,
      topP: 1,
      maxOutputTokens: 2048,
    }
  });

  const result = await chat.sendMessage(userInput);
  return result.response.text();
}

// Serve static files
app.use(express.static('public'));

/*
const port = process.env.PORT || 5001; // Updated to match the working implementation
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
*/
module.exports = app;
