const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const { authenticateToken, isAdmin } = require('../middleware/auth');

const pool = new Pool({
  connectionString: 'postgresql://jjlim:npg_vkfzlprwGJ18@ep-fragrant-wind-a1u7i59x-pooler.ap-southeast-1.aws.neon.tech/sustenance_db?sslmode=require'
});

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads/recipient-documents');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'Recipients route is working!' });
});

// Set up multer storage for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Public routes (no authentication required)
router.post('/register', upload.single('document'), async (req, res) => {
  try {
    const { 
      ngo_name,
      founded_date,
      ngo_description,
      email,
      username,
      password,
      website
    } = req.body;

    // Validate required fields
    if (!ngo_name || !founded_date || !ngo_description || !email || !username || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }
    
    // Check if document was uploaded
    if (!req.file) {
      return res.status(400).json({ message: 'Document is required' });
    }

    // Check if email already exists
    const emailExists = await pool.query(
      'SELECT * FROM recipient WHERE email = $1',
      [email]
    );

    if (emailExists.rows.length > 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Email already exists' });
    }

    // Check if username already exists
    const userExists = await pool.query(
      'SELECT * FROM recipient WHERE username = $1',
      [username]
    );

    if (userExists.rows.length > 0) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Read the uploaded file
    const documentData = fs.readFileSync(req.file.path);
    
    // Insert the recipient into the database
    const result = await pool.query(
      `INSERT INTO recipient 
       (ngo_name, founded_date, ngo_description, email, username, password, website, status, document_data, document_name, document_type) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
       RETURNING recipient_id, ngo_name, founded_date, ngo_description, email, username, status`,
      [
        ngo_name, 
        founded_date, 
        ngo_description, 
        email,
        username, 
        hashedPassword, 
        website || null,
        'pending',
        documentData,
        req.file.originalname,
        req.file.mimetype
      ]
    );

    // Delete the temporary file after storing in database
    fs.unlinkSync(req.file.path);
    
    res.status(201).json({
      message: 'NGO registration successful',
      recipient: result.rows[0]
    });
  } catch (error) {
    // Delete the uploaded file if there's an error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Error registering recipient:', error);
    res.status(500).json({ message: error.message });
  }
});

// Login route for recipients
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate required fields
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    // Check if recipient exists
    const result = await pool.query(
      'SELECT * FROM recipient WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const recipient = result.rows[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, recipient.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: recipient.recipient_id,
        username: recipient.username,
        role: 'recipient'
      }, 
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return token and recipient info (excluding password)
    res.json({
      token,
      recipient: {
        recipient_id: recipient.recipient_id,
        ngo_name: recipient.ngo_name,
        username: recipient.username,
        email: recipient.email,
        status: recipient.status
      }
    });
  } catch (error) {
    console.error('Error during recipient login:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get approved recipients (for the donation page)
router.get('/approved', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        recipient_id,
        ngo_name,
        ngo_description as description,
        email,
        founded_date,
        profile_image,
        bank_name,
        bank_account_number,
        bank_account_holder
       FROM recipient 
       WHERE status = 'approved'
       ORDER BY ngo_name`
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching approved recipients:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Unified endpoint for recipient to fetch both goods and monetary donations
router.get('/donations', authenticateToken, async (req, res) => {
  try {
    const recipientId = req.user.id;

    // Goods donations
    const goodsResult = await pool.query(
      `SELECT d.*, 'goods' as donation_type
       FROM donations d
       WHERE d.recipient_id = $1
       ORDER BY d.created_at DESC`,
      [recipientId]
    );

    // Monetary donations
    const moneyResult = await pool.query(
      `SELECT m.*, 'money' as donation_type
       FROM monetary_donations m
       WHERE m.recipient_id = $1
       ORDER BY m.created_at DESC`,
      [recipientId]
    );

    // Combine and sort
    const allDonations = [...goodsResult.rows, ...moneyResult.rows]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json(allDonations);
  } catch (error) {
    console.error('Error fetching recipient donations:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// NGO Profile routes (require recipient authentication only)
// Get NGO profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const recipientId = req.user.id;
    
    const result = await pool.query(
      `SELECT 
        recipient_id, ngo_name, founded_date, ngo_description, 
        email, address, phone, website, profile_image, status,
        bank_name, bank_account_number, bank_account_holder
       FROM recipient 
       WHERE recipient_id = $1`,
      [recipientId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update NGO profile
router.put('/profile', authenticateToken, upload.single('profile_image'), async (req, res) => {
  try {
    const recipientId = req.user.id;
    const {
      ngo_name,
      founded_date,
      ngo_description,
      email,
      address,
      phone,
      website,
      bank_name,
      bank_account_number,
      bank_account_holder
    } = req.body;

    // Check if email is being changed and if it's already in use
    if (email) {
      const emailCheck = await pool.query(
        'SELECT recipient_id FROM recipient WHERE email = $1 AND recipient_id != $2',
        [email, recipientId]
      );
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ message: 'Email already in use' });
      }
    }

    let profileImage = null;
    if (req.file) {
      const imageData = fs.readFileSync(req.file.path);
      profileImage = `data:${req.file.mimetype};base64,${imageData.toString('base64')}`;
      fs.unlinkSync(req.file.path); // Delete the temporary file
    }

    const result = await pool.query(
      `UPDATE recipient 
       SET 
        ngo_name = COALESCE($1, ngo_name),
        founded_date = COALESCE($2, founded_date),
        ngo_description = COALESCE($3, ngo_description),
        email = COALESCE($4, email),
        address = COALESCE($5, address),
        phone = COALESCE($6, phone),
        website = COALESCE($7, website),
        profile_image = COALESCE($8, profile_image),
        bank_name = COALESCE($9, bank_name),
        bank_account_number = COALESCE($10, bank_account_number),
        bank_account_holder = COALESCE($11, bank_account_holder),
        updated_at = NOW()
       WHERE recipient_id = $12
       RETURNING *`,
      [
        ngo_name,
        founded_date,
        ngo_description,
        email,
        address,
        phone,
        website,
        profileImage,
        bank_name,
        bank_account_number,
        bank_account_holder,
        recipientId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    res.json({
      message: 'Profile updated successfully',
      recipient: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get analytics data for recipient (no UNION, just sum in JS)
router.get('/analytics', authenticateToken, async (req, res) => {
  try {
    const recipientId = req.user.id;
    const { filter } = req.query; // 'all', '30d', '90d', '1y'

    // Calculate date filter
    let dateFilter = '';
    if (filter && filter !== 'all') {
      const days = {
        '30d': 30,
        '90d': 90,
        '1y': 365
      };
      const daysBack = days[filter] || 365;
      dateFilter = `AND created_at >= NOW() - INTERVAL '${daysBack} days'`;
    }

    // Goods donations stats
    const goodsStats = await pool.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(quantity), 0) as total_goods,
              COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) as pending_count,
              COALESCE(SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END), 0) as approved_count,
              COALESCE(SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END), 0) as rejected_count,
              COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) as completed_count
       FROM donations
       WHERE recipient_id = $1 ${dateFilter}`,
      [recipientId]
    );

    // Monetary donations stats
    const moneyStats = await pool.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total_money,
              COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) as pending_count,
              COALESCE(SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END), 0) as approved_count,
              COALESCE(SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END), 0) as rejected_count,
              COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) as completed_count
       FROM monetary_donations
       WHERE recipient_id = $1 ${dateFilter}`,
      [recipientId]
    );

    // For totalMoney, only sum non-pending monetary donations
    const moneyNonPending = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total_money
       FROM monetary_donations
       WHERE recipient_id = $1 AND status != 'pending' ${dateFilter}`,
      [recipientId]
    );
    const totalMoney = parseFloat(moneyNonPending.rows[0].total_money) || 0;

    // Add both totals for overall stats
    const totalDonations = parseInt(goodsStats.rows[0].count) + parseInt(moneyStats.rows[0].count);
    const totalGoods = parseInt(goodsStats.rows[0].total_goods);
    const statusBreakdown = {
      pending: parseInt(goodsStats.rows[0].pending_count) + parseInt(moneyStats.rows[0].pending_count),
      approved: parseInt(goodsStats.rows[0].approved_count) + parseInt(moneyStats.rows[0].approved_count),
      rejected: parseInt(goodsStats.rows[0].rejected_count) + parseInt(moneyStats.rows[0].rejected_count),
      completed: parseInt(goodsStats.rows[0].completed_count) + parseInt(moneyStats.rows[0].completed_count)
    };

    // For category breakdown, just show goods item types and 'Money' for monetary
    const goodsCategory = await pool.query(
      `SELECT item_type as category, COUNT(*) as count
       FROM donations
       WHERE recipient_id = $1 ${dateFilter}
       GROUP BY item_type
       ORDER BY count DESC
       LIMIT 10`,
      [recipientId]
    );
    const moneyCategory = await pool.query(
      `SELECT 'Money' as category, COUNT(*) as count
       FROM monetary_donations
       WHERE recipient_id = $1 ${dateFilter}`,
      [recipientId]
    );
    const categoryBreakdown = {};
    goodsCategory.rows.forEach(row => {
      categoryBreakdown[row.category] = parseInt(row.count);
    });
    if (moneyCategory.rows[0] && parseInt(moneyCategory.rows[0].count) > 0) {
      categoryBreakdown['Money'] = parseInt(moneyCategory.rows[0].count);
    }

    // Top donors (goods)
    const goodsDonors = await pool.query(
      `SELECT u.id, u.name, COUNT(d.id) as donation_count
       FROM donations d
       JOIN users u ON d.user_id = u.id
       WHERE d.recipient_id = $1 ${dateFilter}
       GROUP BY u.id, u.name
       ORDER BY donation_count DESC
       LIMIT 10`,
      [recipientId]
    );
    // Top donors (money)
    const moneyDonors = await pool.query(
      `SELECT u.id, u.name, COUNT(m.id) as donation_count
       FROM monetary_donations m
       JOIN users u ON m.user_id = u.id
       WHERE m.recipient_id = $1 ${dateFilter}
       GROUP BY u.id, u.name
       ORDER BY donation_count DESC
       LIMIT 10`,
      [recipientId]
    );
    // Merge top donors
    const donorMap = new Map();
    goodsDonors.rows.forEach(row => {
      if (!donorMap.has(row.id)) donorMap.set(row.id, { id: row.id, name: row.name, donationCount: 0 });
      donorMap.get(row.id).donationCount += parseInt(row.donation_count);
    });
    moneyDonors.rows.forEach(row => {
      if (!donorMap.has(row.id)) donorMap.set(row.id, { id: row.id, name: row.name, donationCount: 0 });
      donorMap.get(row.id).donationCount += parseInt(row.donation_count);
    });
    const topDonors = Array.from(donorMap.values()).sort((a, b) => b.donationCount - a.donationCount).slice(0, 10);

    // Recent donations (goods)
    const goodsRecent = await pool.query(
      `SELECT d.id, d.amount, d.item_type, d.status, d.created_at, 'goods' as donation_type, u.name as donor_name
       FROM donations d
       JOIN users u ON d.user_id = u.id
       WHERE d.recipient_id = $1 ${dateFilter}
       ORDER BY d.created_at DESC
       LIMIT 5`,
      [recipientId]
    );
    // Recent donations (money)
    const moneyRecent = await pool.query(
      `SELECT m.id, m.amount, NULL as item_type, m.status, m.created_at, 'money' as donation_type, u.name as donor_name
       FROM monetary_donations m
       JOIN users u ON m.user_id = u.id
       WHERE m.recipient_id = $1 ${dateFilter}
       ORDER BY m.created_at DESC
       LIMIT 5`,
      [recipientId]
    );
    // Merge and sort by created_at
    const recentDonations = [...goodsRecent.rows, ...moneyRecent.rows]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 10);

    // Prepare response
    const analyticsData = {
      totalDonations,
      totalGoods,
      totalMoney,
      statusBreakdown,
      categoryBreakdown,
      topDonors,
      recentDonations
    };

    res.json(analyticsData);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin-only routes (require authentication and admin privileges)
router.use(authenticateToken);
router.use(isAdmin);

// Get all applications (admin only)
router.get('/applications', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        recipient_id,
        ngo_name,
        founded_date,
        ngo_description as description,
        email,
        username,
        status,
        created_at
       FROM recipient 
       ORDER BY 
         CASE 
           WHEN status = 'pending' THEN 1 
           WHEN status = 'approved' THEN 2 
           WHEN status = 'disabled' THEN 3
           ELSE 4 
         END,
         created_at DESC`
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// API endpoint to update recipient application status
router.put('/applications/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }
    
    const result = await pool.query(
      `UPDATE recipient 
       SET status = $1, updated_at = NOW()
       WHERE recipient_id = $2 
       RETURNING *`,
      [status, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Recipient application not found' });
    }
    
    res.json({
      message: `Application ${status}`,
      recipient: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating recipient application:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get document for a recipient
router.get('/document/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT document_data, document_type, document_name FROM recipient WHERE recipient_id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Document not found' });
    }

    const { document_data, document_type, document_name } = result.rows[0];

    res.setHeader('Content-Type', document_type);
    res.setHeader('Content-Disposition', `inline; filename="${document_name}"`);
    res.send(document_data);
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Toggle NGO status (Admin only - enable/disable approved NGOs)
router.put('/toggle-status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // 'enable' or 'disable'
    
    // Validate action
    if (!['enable', 'disable'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action. Use "enable" or "disable"' });
    }
    
    // Get current status
    const currentResult = await pool.query(
      'SELECT status FROM recipient WHERE recipient_id = $1',
      [id]
    );
    
    if (currentResult.rows.length === 0) {
      return res.status(404).json({ message: 'Recipient not found' });
    }
    
    const currentStatus = currentResult.rows[0].status;
    let newStatus;
    
    if (action === 'disable') {
      // Can only disable approved NGOs
      if (currentStatus !== 'approved') {
        return res.status(400).json({ message: 'Can only disable approved NGOs' });
      }
      newStatus = 'disabled';
    } else { // enable
      // Can only enable disabled NGOs (back to approved)
      if (currentStatus !== 'disabled') {
        return res.status(400).json({ message: 'Can only enable disabled NGOs' });
      }
      newStatus = 'approved';
    }
    
    // Update status
    const result = await pool.query(
      'UPDATE recipient SET status = $1, updated_at = NOW() WHERE recipient_id = $2 RETURNING *',
      [newStatus, id]
    );
    
    res.json({
      message: `NGO ${action}d successfully`,
      recipient: result.rows[0]
    });
  } catch (error) {
    console.error('Error toggling NGO status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 