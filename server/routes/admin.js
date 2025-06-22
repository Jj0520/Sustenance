const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

// Add this log to check if the route is being registered
console.log('Admin routes are being loaded');

// First, add our test and update-hash routes BEFORE other donation routes
router.get('/donations/test-route', (req, res) => {
  console.log('Test route hit!');
  res.json({ message: "Test route is working!" });
});

// Then all other existing routes
router.get('/donations', async (req, res) => {
  try {
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

    // Combine and sort
    const allDonations = [...goodsResult.rows, ...moneyResult.rows]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json(allDonations);
  } catch (error) {
    console.error('Error fetching donations:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update donation status
router.put('/donations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let { status, donation_type } = req.body;

    // Validate status
    if (!['pending', 'approved', 'received', 'completed', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    // If donation_type is not provided, infer from DB
    if (!donation_type) {
      // Try to find in goods donations
      const goods = await pool.query('SELECT * FROM donations WHERE id = $1', [id]);
      if (goods.rows.length > 0) {
        donation_type = 'goods';
      } else {
        // Try to find in monetary donations
        const money = await pool.query('SELECT * FROM monetary_donations WHERE id = $1', [id]);
        if (money.rows.length > 0) {
          donation_type = 'money';
        } else {
          return res.status(404).json({ message: 'Donation not found' });
        }
      }
    }

    let result;
    if (donation_type === 'goods') {
      result = await pool.query(
        'UPDATE donations SET status = $1 WHERE id = $2 RETURNING *',
        [status, id]
      );
    } else if (donation_type === 'money') {
      result = await pool.query(
        'UPDATE monetary_donations SET status = $1 WHERE id = $2 RETURNING *',
        [status, id]
      );
    } else {
      return res.status(400).json({ message: 'Invalid donation_type' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating donation:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update or add this route
router.get('/approved-donations', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*, u.name as user_name, r.ngo_name as recipient_name
      FROM donations d 
      JOIN users u ON d.user_id = u.id 
      LEFT JOIN recipient r ON d.recipient_id = r.recipient_id
      WHERE d.status = 'approved'
      ORDER BY d.id DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching approved donations:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// This is the endpoint that will handle /api/admin/users
router.get('/users', async (req, res) => {
  // Add this log to see if the endpoint is being hit
  console.log('GET /users endpoint hit');
  
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, created_at FROM users ORDER BY id ASC'
    );
    console.log('Query result:', result.rows); // Log the query result
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // First check if user has donations
    const donationCheck = await pool.query(
      'SELECT COUNT(*) FROM donations WHERE user_id = $1',
      [id]
    );

    if (donationCheck.rows[0].count > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete user with existing donations'
      });
    }

    // If no donations, proceed with deletion
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role } = req.body;
    const result = await pool.query(
      'UPDATE users SET name = $1, email = $2, role = $3 WHERE id = $4 RETURNING *',
      [name, email, role, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get donations ready for signing (status 'completed' or 'approved')
router.get('/signable-donations', async (req, res) => {
  try {
    // Fetch goods donations
    const goodsResult = await pool.query(
      `SELECT d.*, u.name as user_name, r.ngo_name as recipient_name, 'goods' as donation_type
       FROM donations d 
       LEFT JOIN users u ON d.user_id = u.id 
       LEFT JOIN recipient r ON d.recipient_id = r.recipient_id 
       WHERE d.status IN ('completed', 'approved')
       ORDER BY d.created_at DESC`
    );

    // Fetch monetary donations
    const moneyResult = await pool.query(
      `SELECT m.*, u.name as user_name, r.ngo_name as recipient_name, 'money' as donation_type
       FROM monetary_donations m
       LEFT JOIN users u ON m.user_id = u.id
       LEFT JOIN recipient r ON m.recipient_id = r.recipient_id
       WHERE m.status IN ('completed', 'approved')
       ORDER BY m.created_at DESC`
    );

    // Combine and sort
    const allDonations = [...goodsResult.rows, ...moneyResult.rows]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json(allDonations);
  } catch (error) {
    console.error('Error fetching signable donations:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get analytics data
router.get('/analytics', async (req, res) => {
  try {
    console.log('Analytics endpoint hit, user:', req.user);
    
    // Check if user is admin
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    // Get time filter from query params (default to 30 days)
    const timeFilter = req.query.timeFilter || '1m';
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;
    let daysInterval = 30;
    let dateCondition = '';
    
    if (timeFilter === 'custom' && startDate && endDate) {
      dateCondition = `created_at >= '${startDate}' AND created_at <= '${endDate} 23:59:59'`;
    } else {
      switch(timeFilter) {
        case '7d':
          daysInterval = 7;
          break;
        case '1m':
          daysInterval = 30;
          break;
        case '3m':
          daysInterval = 90;
          break;
        case '6m':
          daysInterval = 180;
          break;
        case '1y':
          daysInterval = 365;
          break;
        default:
          daysInterval = 30;
      }
      dateCondition = `created_at >= CURRENT_DATE - INTERVAL '${daysInterval} days'`;
    }
    
    console.log('Date condition:', dateCondition);
    console.log('Time filter:', timeFilter, 'Days interval:', daysInterval);

    // Get user signups count (donors and other non-admin users)
    const userSignupsResult = await pool.query(`
      SELECT COUNT(*) as count FROM users 
      WHERE role != 'admin'
    `);

    // Get donations count (both goods and monetary donations)
    const goodsDonationsResult = await pool.query(`
      SELECT COUNT(*) as count FROM donations
    `);
    
    const monetaryDonationsResult = await pool.query(`
      SELECT COUNT(*) as count FROM monetary_donations
    `);
    
    const totalDonations = parseInt(goodsDonationsResult.rows[0].count) + parseInt(monetaryDonationsResult.rows[0].count);

    // Get NGO signups count (including recipients table)
    const ngoUsersResult = await pool.query(`
      SELECT COUNT(*) as count FROM users 
      WHERE role = 'ngo'
    `);
    
    const recipientsResult = await pool.query(`
      SELECT COUNT(*) as count FROM recipient
    `);
    
    const totalNGOs = parseInt(ngoUsersResult.rows[0].count) + parseInt(recipientsResult.rows[0].count);

    // Get blockchain transactions count from both tables
    const goodsTxResult = await pool.query(`
      SELECT COUNT(*) as count FROM donations 
      WHERE transaction_hash IS NOT NULL AND transaction_hash != ''
    `);
    
    const monetaryTxResult = await pool.query(`
      SELECT COUNT(*) as count FROM monetary_donations 
      WHERE transaction_hash IS NOT NULL AND transaction_hash != ''
    `);
    
    const totalBlockchainTx = parseInt(goodsTxResult.rows[0].count) + parseInt(monetaryTxResult.rows[0].count);

    // Get time series data based on selected time filter
    const timeSeriesResult = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(CASE WHEN role != 'admin' THEN 1 END) as user_signups,
        0 as donations,
        COUNT(CASE WHEN role = 'ngo' THEN 1 END) as ngo_signups,
        0 as blockchain_transactions
      FROM users 
      WHERE ${dateCondition}
      GROUP BY DATE(created_at)
      
      UNION ALL
      
      SELECT 
        DATE(created_at) as date,
        0 as user_signups,
        COUNT(*) as donations,
        0 as ngo_signups,
        COUNT(CASE WHEN transaction_hash IS NOT NULL AND transaction_hash != '' THEN 1 END) as blockchain_transactions
      FROM donations 
      WHERE ${dateCondition}
      GROUP BY DATE(created_at)
      
      UNION ALL
      
      SELECT 
        DATE(created_at) as date,
        0 as user_signups,
        COUNT(*) as donations,
        0 as ngo_signups,
        COUNT(CASE WHEN transaction_hash IS NOT NULL AND transaction_hash != '' THEN 1 END) as blockchain_transactions
      FROM monetary_donations 
      WHERE ${dateCondition}
      GROUP BY DATE(created_at)
      
      UNION ALL
      
      SELECT 
        DATE(created_at) as date,
        0 as user_signups,
        0 as donations,
        COUNT(*) as ngo_signups,
        0 as blockchain_transactions
      FROM recipient 
      WHERE ${dateCondition}
      GROUP BY DATE(created_at)
      
      ORDER BY date ASC
    `);

    const analyticsData = {
      summary: {
        userSignups: parseInt(userSignupsResult.rows[0].count),
        donations: totalDonations,
        ngoSignups: totalNGOs,
        blockchainTransactions: totalBlockchainTx
      },
      timeSeries: timeSeriesResult.rows
    };

    console.log('Analytics data:', analyticsData);
    res.json({ success: true, data: analyticsData });
  } catch (error) {
    console.error('Error fetching analytics data:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics data', error: error.message });
  }
});

module.exports = router; 