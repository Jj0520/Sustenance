const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');

const pool = new Pool({
    connectionString: 'postgresql://jjlim:npg_vkfzlprwGJ18@ep-fragrant-wind-a1u7i59x-pooler.ap-southeast-1.aws.neon.tech/sustenance_db?sslmode=require'
});

// Set up multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/') // Make sure this directory exists
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname))
    }
});

const upload = multer({ storage: storage });

// Add this at the top of your routes, right after the pool setup
router.get('/test-auth', (req, res) => {
    console.log('Auth test route hit');
    res.json({ message: 'Auth router is working' });
});

// REGISTER
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if user already exists
        const userExists = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );

        if (userExists.rows.length > 0) {
            return res.status(400).json({ message: 'Email already exists' });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const newUser = await pool.query(
            'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *',
            [name, email, hashedPassword]
        );

        res.json({ message: 'User registered successfully' });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// LOGIN
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const result = await pool.query(
            'SELECT id, name, email, password, photo_url, created_at, role FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ message: 'Email not found' });
        }

        const user = result.rows[0];
        console.log('Database returned user:', user); // Debug log

        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ message: 'Invalid password' });
        }

        // Create and assign token with role information
        const tokenPayload = {
            id: user.id,
            role: user.role || 'user'  // Ensure role is included
        };
        console.log('Token payload:', tokenPayload); // Debug log
        
        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET);

        const responseUser = {
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                photo_url: user.photo_url,
                created_at: user.created_at,
                role: user.role || 'user'
            }
        };

        console.log('Sending to frontend:', responseUser); // Debug log
        res.json(responseUser);
    } catch (error) {
        console.error('Login error:', error);
        res.status(400).json({ message: error.message });
    }
});

// Add this new route alongside your existing routes
router.post('/change-password', async (req, res) => {
    console.log('Change password route hit'); // Debug log
    try {
        const { currentPassword, newPassword } = req.body;
        console.log('Request body received:', { currentPassword: '***', newPassword: '***' }); // Debug log
        
        const authHeader = req.headers.authorization;
        console.log('Auth header:', authHeader ? 'Present' : 'Missing'); // Debug log
        
        if (!authHeader) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        // Get user from database
        const result = await pool.query(
            'SELECT * FROM users WHERE id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = result.rows[0];

        // Verify current password
        const validPassword = await bcrypt.compare(currentPassword, user.password);
        if (!validPassword) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update password in database
        await pool.query(
            'UPDATE users SET password = $1 WHERE id = $2',
            [hashedPassword, userId]
        );

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Add this at the top of your routes
router.get('/test', (req, res) => {
    console.log('Test route hit');
    res.json({ message: 'Auth router is working' });
});

// Add this new route to handle photo uploads
router.post('/upload-photo', upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        // Create the photo URL
        const photo_url = `http://localhost:5001/uploads/${req.file.filename}`;

        // Update user's photo_url in database
        await pool.query(
            'UPDATE users SET photo_url = $1 WHERE id = $2',
            [photo_url, userId]
        );

        res.json({ 
            message: 'Photo uploaded successfully',
            photo_url: photo_url
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ message: error.message });
    }
});

// Add user profile update endpoint (for users to update their own profiles)
router.put('/update-profile', async (req, res) => {
    try {
        const { name, email } = req.body;
        
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;

        // Check if email is being changed and if it's already in use by another user
        if (email) {
            const emailCheck = await pool.query(
                'SELECT id FROM users WHERE email = $1 AND id != $2',
                [email, userId]
            );
            if (emailCheck.rows.length > 0) {
                return res.status(400).json({ message: 'Email already in use by another user' });
            }
        }

        // Update user profile
        const result = await pool.query(
            'UPDATE users SET name = COALESCE($1, name), email = COALESCE($2, email) WHERE id = $3 RETURNING id, name, email, photo_url, created_at, role',
            [name, email, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            message: 'Profile updated successfully',
            user: result.rows[0]
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router; 