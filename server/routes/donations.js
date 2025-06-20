const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');

const pool = new Pool({
  connectionString: 'postgresql://jjlim:npg_vkfzlprwGJ18@ep-fragrant-wind-a1u7i59x-pooler.ap-southeast-1.aws.neon.tech/sustenance_db?sslmode=require'
});

// Configure multer for receipt uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/receipts/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname))
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and image files are allowed'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Create a new donation
router.post('/', upload.single('receipt'), async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    const { 
      donation_type,
      amount,
      item_type, 
      quantity, 
      description, 
      condition, 
      pickup_address, 
      preferred_date, 
      preferred_time, 
      recipient_id,
      message
    } = req.body;

    // Verify recipient exists if recipient_id is provided
    if (recipient_id) {
      const recipientCheck = await pool.query(
        'SELECT recipient_id FROM recipient WHERE recipient_id = $1',
        [recipient_id]
      );

      if (recipientCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid recipient ID' });
      }
    }

    let result;

    if (donation_type === 'money') {
      // Handle monetary donation
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Valid amount is required for monetary donations' });
      }

      const receiptPath = req.file ? req.file.filename : null;
      
      // Insert into the new monetary_donations table
      result = await pool.query(
        `INSERT INTO monetary_donations 
         (user_id, recipient_id, amount, message, receipt_path, status, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
         RETURNING *`,
        [userId, recipient_id, amount, message, receiptPath, 'pending']
      );
    } else {
      // Handle goods donation
      if (!item_type) {
        return res.status(400).json({ error: 'Item type is required for goods donations' });
      }

      result = await pool.query(
        `INSERT INTO donations 
         (user_id, donation_type, item_type, quantity, description, condition, pickup_address, preferred_date, preferred_time, status, recipient_id, message, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW()) 
         RETURNING *`,
        [userId, 'goods', item_type, quantity, description, condition, pickup_address, preferred_date, preferred_time, 'pending', recipient_id, message]
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating donation:', error);
    res.status(500).json({ 
      error: 'Failed to create donation',
      details: error.message
    });
  }
});

// Get approved donations for admin to sign
router.get('/admin/approved', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verify if user is admin
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Get donations that are accepted and ready for blockchain processing
    const result = await pool.query(
      `SELECT d.*, u.name as user_name 
       FROM donations d 
       LEFT JOIN users u ON d.user_id = u.id 
       WHERE d.status = 'accepted' 
       ORDER BY d.created_at DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching donations:', error);
    res.status(500).json({ error: 'Failed to fetch donations' });
  }
});

// Update donation status (for admin)
router.put('/admin/:id', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verify if user is admin
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { id } = req.params;
    const { status } = req.body;

    // Update the donation status
    const result = await pool.query(
      'UPDATE donations SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Donation not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating donation status:', error);
    res.status(500).json({ error: 'Failed to update donation status' });
  }
});

// Add this new route for updating transaction hash
router.post('/update-hash', async (req, res) => {
  try {
    const { id, transactionHash } = req.body;
    console.log('Updating hash for donation:', id, transactionHash);
    
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

// Direct update hash route (no auth required)
router.post('/direct-update-hash', async (req, res) => {
  try {
    const { id, transactionHash, donation_type } = req.body;
    console.log('Direct update hash for donation:', id, transactionHash, donation_type);
    
    if (!donation_type || !['goods', 'money'].includes(donation_type)) {
      return res.status(400).json({ error: 'donation_type (goods or money) is required' });
    }

    let result;
    if (donation_type === 'goods') {
      result = await pool.query(
        'UPDATE donations SET transaction_hash = $1, status = $2 WHERE id = $3 RETURNING *',
        [transactionHash, 'approved', id]
      );
    } else if (donation_type === 'money') {
      result = await pool.query(
        'UPDATE monetary_donations SET transaction_hash = $1, status = $2 WHERE id = $3 RETURNING *',
        [transactionHash, 'approved', id]
    );
    }

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Donation not found' });
    }

    res.json({ success: true, donation: result.rows[0] });
  } catch (error) {
    console.error('Error updating transaction hash:', error);
    res.status(500).json({ error: 'Failed to update transaction hash' });
  }
});

// Get donations for a specific user
router.get('/user', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    // Fetch goods donations
    const goodsResult = await pool.query(
      `SELECT d.*, r.ngo_name as recipient_name, 'goods' as donation_type
       FROM donations d 
       LEFT JOIN recipient r ON d.recipient_id = r.recipient_id 
       WHERE d.user_id = $1 
       ORDER BY d.created_at DESC`,
      [userId]
    );

    // Fetch monetary donations
    const moneyResult = await pool.query(
      `SELECT m.*, r.ngo_name as recipient_name, 'money' as donation_type
       FROM monetary_donations m
       LEFT JOIN recipient r ON m.recipient_id = r.recipient_id
       WHERE m.user_id = $1
       ORDER BY m.created_at DESC`,
      [userId]
    );

    // Normalize and combine
    const allDonations = [...goodsResult.rows, ...moneyResult.rows]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json(allDonations);
  } catch (error) {
    console.error('Error fetching user donations:', error);
    res.status(500).json({ error: 'Failed to fetch donations' });
  }
});

// Get donations for a specific recipient
router.get('/recipient', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const recipientId = decoded.id;

    // Fetch goods donations
    const goodsResult = await pool.query(
      `SELECT d.*, u.name as donor_name, 'goods' as donation_type
       FROM donations d 
       JOIN users u ON d.user_id = u.id 
       WHERE d.recipient_id = $1 
       ORDER BY d.created_at DESC`,
      [recipientId]
    );

    // Fetch monetary donations
    const moneyResult = await pool.query(
      `SELECT m.*, u.name as donor_name, 'money' as donation_type
       FROM monetary_donations m
       JOIN users u ON m.user_id = u.id
       WHERE m.recipient_id = $1
       ORDER BY m.created_at DESC`,
      [recipientId]
    );

    // Normalize and combine
    const allDonations = [...goodsResult.rows, ...moneyResult.rows]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json(allDonations);
  } catch (error) {
    console.error('Error fetching recipient donations:', error);
    res.status(500).json({ error: 'Failed to fetch donations' });
  }
});

// Update donation status (for recipients)
router.put('/:id/status', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const recipientId = decoded.id;

    const { id } = req.params;
    let { status, donation_type } = req.body;

    // Validate status
    if (!['pending', 'approved', 'received', 'completed', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    // If donation_type is not provided, infer from DB
    if (!donation_type) {
      // Try to find in goods donations
      const goods = await pool.query('SELECT * FROM donations WHERE id = $1 AND recipient_id = $2', [id, recipientId]);
      if (goods.rows.length > 0) {
        donation_type = 'goods';
      } else {
        // Try to find in monetary donations
        const money = await pool.query('SELECT * FROM monetary_donations WHERE id = $1 AND recipient_id = $2', [id, recipientId]);
        if (money.rows.length > 0) {
          donation_type = 'money';
        } else {
      return res.status(404).json({ message: 'Donation not found or unauthorized' });
        }
      }
    }

    let result;
    if (donation_type === 'goods') {
      result = await pool.query(
      'UPDATE donations SET status = $1, updated_at = NOW() WHERE id = $2 AND recipient_id = $3 RETURNING *',
      [status, id, recipientId]
    );
    } else if (donation_type === 'money') {
      result = await pool.query(
        'UPDATE monetary_donations SET status = $1, updated_at = NOW() WHERE id = $2 AND recipient_id = $3 RETURNING *',
        [status, id, recipientId]
      );
    } else {
      return res.status(400).json({ message: 'Invalid donation_type' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating donation status:', error);
    res.status(500).json({ error: 'Failed to update donation status' });
  }
});

// Get all donations for admin
router.get('/admin', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verify if user is admin
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Fetch goods donations
    const goodsResult = await pool.query(
      `SELECT d.*, u.name as user_name, r.ngo_name as recipient_name, 'goods' as donation_type
       FROM donations d 
       LEFT JOIN users u ON d.user_id = u.id 
       LEFT JOIN recipient r ON d.recipient_id = r.recipient_id 
       ORDER BY d.created_at DESC`
    );

    // Fetch monetary donations
    const moneyResult = await pool.query(
      `SELECT m.*, u.name as user_name, r.ngo_name as recipient_name, 'money' as donation_type
       FROM monetary_donations m
       LEFT JOIN users u ON m.user_id = u.id
       LEFT JOIN recipient r ON m.recipient_id = r.recipient_id
       ORDER BY m.created_at DESC`
    );

    // Normalize and combine
    const allDonations = [...goodsResult.rows, ...moneyResult.rows]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json(allDonations);
  } catch (error) {
    console.error('Error fetching donations:', error);
    res.status(500).json({ error: 'Failed to fetch donations' });
  }
});

module.exports = router; 