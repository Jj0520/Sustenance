const express = require('express');
const app = express();
const donationsRouter = require('./routes/donations');
const adminRouter = require('./routes/admin');
const recipientsRouter = require('./routes/recipients');
const authRouter = require('./routes/auth');
const cors = require('cors');

try {
  console.log('Loading chat routes...');
  const chatRoutes = require('./routes/chat');
  console.log('Chat routes loaded');

  // Important middleware
  app.use(express.json());
  app.use(cors({
    origin: 'http://localhost:3002' // Your frontend port
  }));

  // Debug logging middleware
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  // Test chat route directly in index.js
  app.post('/api/chat-test', (req, res) => {
    const { message } = req.body;
    res.json({ response: `Direct test: ${message}` });
  });

  // Basic test route
  app.get('/test', (req, res) => {
    res.json({ message: 'Server is working' });
  });

  console.log('Registering routes...');

  // Register all routes
  app.use('/api/auth', authRouter);
  app.use('/api/donations', donationsRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/recipients', recipientsRouter);

  console.log('Registering chat routes at /api/chat');
  app.use('/api/chat', chatRoutes);
  console.log('Chat routes registered');

  // Add this test route directly in the main file first
  app.get('/admin/donations/test', (req, res) => {
    res.json({ message: "Test route working!" });
  });

  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  });

  // Make sure your server is listening on port 5001
  const server = app.listen(5001, () => {
    console.log('Server is running on port 5001');
    console.log('Available routes:');
    console.log('- /api/chat/test (GET)');
    console.log('- /api/chat (POST)');
    console.log('- /api/chat-test (POST)');
  });

  server.on('error', (error) => {
    console.error('Server error:', error);
  });

} catch (error) {
  console.error('Startup error:', error);
} 