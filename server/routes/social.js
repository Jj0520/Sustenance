const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Create a new post (NGO only)
router.post('/posts', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const { post_description } = req.body;
    const user = req.user;

    // Check if user is an NGO
    if (user.role !== 'recipient') {
      return res.status(403).json({ message: 'Only NGOs can create posts' });
    }

    if (!post_description) {
      return res.status(400).json({ message: 'Post description is required' });
    }

    const image_url = req.file ? req.file.filename : null;

    const result = await pool.query(
      `INSERT INTO blogpost (post_description, recipient_id, image_url) 
       VALUES ($1, $2, $3) RETURNING *`,
      [post_description, user.id, image_url]
    );

    res.status(201).json({
      message: 'Post created successfully',
      post: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all posts with comments and likes
router.get('/posts', async (req, res) => {
  try {
    const postsQuery = `
      SELECT 
        b.*,
        r.ngo_name as author_name,
        r.profile_image as author_profile_picture
      FROM blogpost b
      LEFT JOIN recipient r ON b.recipient_id = r.recipient_id
      ORDER BY b.date_posted DESC
    `;
    
    const postsResult = await pool.query(postsQuery);
    const posts = postsResult.rows;

    // Get current user info if authenticated
    const authHeader = req.headers.authorization;
    let currentUser = null;
    if (authHeader) {
      try {
        const token = authHeader.split(' ')[1];
        const jwt = require('jsonwebtoken');
        currentUser = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        // Token invalid, continue without user context
      }
    }

    // Get comments and likes for each post
    for (let post of posts) {
      // Get comments
      const commentsQuery = `
        SELECT 
          bc.*,
          CASE 
            WHEN bc.author_role = 'donor' THEN u.name
            WHEN bc.author_role = 'ngo' THEN r.ngo_name
          END as author_name
        FROM blogpost_comment bc
        LEFT JOIN users u ON bc.author_id = u.id AND bc.author_role = 'donor'
        LEFT JOIN recipient r ON bc.author_id = r.recipient_id AND bc.author_role = 'ngo'
        WHERE bc.post_id = $1
        ORDER BY bc.date_commented ASC
      `;
      const commentsResult = await pool.query(commentsQuery, [post.post_id]);
      post.comments = commentsResult.rows;

      // Get likes
      const likesQuery = `
        SELECT 
          l.*,
          CASE 
            WHEN l.user_role = 'donor' THEN u.name
            WHEN l.user_role = 'ngo' THEN r.ngo_name
          END as user_name
        FROM likes l
        LEFT JOIN users u ON l.user_id = u.id AND l.user_role = 'donor'
        LEFT JOIN recipient r ON l.user_id = r.recipient_id AND l.user_role = 'ngo'
        WHERE l.post_id = $1
      `;
      const likesResult = await pool.query(likesQuery, [post.post_id]);
      post.likes = likesResult.rows;
      post.likes_count = likesResult.rows.length;
      post.comments_count = commentsResult.rows.length;

      // Check if current user has liked this post
      post.user_has_liked = false;
      if (currentUser) {
        const user_role = currentUser.role === 'recipient' ? 'ngo' : 'donor';
        const userLikeQuery = `
          SELECT 1 FROM likes 
          WHERE post_id = $1 AND user_id = $2 AND user_role = $3
        `;
        const userLikeResult = await pool.query(userLikeQuery, [post.post_id, currentUser.id, user_role]);
        post.user_has_liked = userLikeResult.rows.length > 0;
      }
    }

    res.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get comments for a specific post
router.get('/posts/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;
    
          const commentsQuery = `
        SELECT 
          bc.*,
          CASE 
            WHEN bc.author_role = 'donor' THEN u.name
            WHEN bc.author_role = 'ngo' THEN r.ngo_name
          END as username,
          CASE 
            WHEN bc.author_role = 'donor' THEN u.photo_url
            WHEN bc.author_role = 'ngo' THEN r.profile_image
          END as user_profile_picture,
          bc.date_commented as created_at
        FROM blogpost_comment bc
        LEFT JOIN users u ON bc.author_id = u.id AND bc.author_role = 'donor'  
        LEFT JOIN recipient r ON bc.author_id = r.recipient_id AND bc.author_role = 'ngo'
        WHERE bc.post_id = $1
        ORDER BY bc.date_commented ASC
      `;
    
    const result = await pool.query(commentsQuery, [postId]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add a comment to a post
router.post('/posts/:postId/comments', authenticateToken, async (req, res) => {
  try {
    const { postId } = req.params;
    const { commentText } = req.body;
    const user = req.user;

    if (!commentText) {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    const author_role = user.role === 'recipient' ? 'ngo' : 'donor';

    const result = await pool.query(
      `INSERT INTO blogpost_comment (post_id, author_id, author_role, comment_text) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [postId, user.id, author_role, commentText]
    );

    // Get the inserted comment with user details
          const commentQuery = `
        SELECT 
          bc.*,
          CASE 
            WHEN bc.author_role = 'donor' THEN u.name
            WHEN bc.author_role = 'ngo' THEN r.ngo_name
          END as username,
          CASE 
            WHEN bc.author_role = 'donor' THEN u.photo_url
            WHEN bc.author_role = 'ngo' THEN r.profile_image
          END as user_profile_picture,
          bc.date_commented as created_at
        FROM blogpost_comment bc
        LEFT JOIN users u ON bc.author_id = u.id AND bc.author_role = 'donor'
        LEFT JOIN recipient r ON bc.author_id = r.recipient_id AND bc.author_role = 'ngo'
        WHERE bc.comment_id = $1
      `;
    
    const commentResult = await pool.query(commentQuery, [result.rows[0].comment_id]);

    res.status(201).json(commentResult.rows[0]);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add a comment to a post (legacy endpoint)
router.post('/comments', authenticateToken, async (req, res) => {
  try {
    const { post_id, comment_text } = req.body;
    const user = req.user;

    if (!post_id || !comment_text) {
      return res.status(400).json({ message: 'Post ID and comment text are required' });
    }

    const author_role = user.role === 'recipient' ? 'ngo' : 'donor';

    const result = await pool.query(
      `INSERT INTO blogpost_comment (post_id, author_id, author_role, comment_text) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [post_id, user.id, author_role, comment_text]
    );

    // Update comments count in blogpost table
    await pool.query(
      `UPDATE blogpost SET comments_count = comments_count + 1 WHERE post_id = $1`,
      [post_id]
    );

    res.status(201).json({
      message: 'Comment added successfully',
      comment: result.rows[0]
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Like/Unlike a post
router.post('/like', authenticateToken, async (req, res) => {
  try {
    const { post_id } = req.body;
    const user = req.user;

    if (!post_id) {
      return res.status(400).json({ message: 'Post ID is required' });
    }

    const user_role = user.role === 'recipient' ? 'ngo' : 'donor';

    // Check if user already liked this post
    const existingLike = await pool.query(
      `SELECT * FROM likes WHERE post_id = $1 AND user_id = $2 AND user_role = $3`,
      [post_id, user.id, user_role]
    );

    if (existingLike.rows.length > 0) {
      // Unlike the post
      await pool.query(
        `DELETE FROM likes WHERE post_id = $1 AND user_id = $2 AND user_role = $3`,
        [post_id, user.id, user_role]
      );

      // Update likes count
      await pool.query(
        `UPDATE blogpost SET likes_count = likes_count - 1 WHERE post_id = $1`,
        [post_id]
      );

      res.json({ message: 'Post unliked successfully', liked: false });
    } else {
      // Like the post
      await pool.query(
        `INSERT INTO likes (post_id, user_id, user_role) VALUES ($1, $2, $3)`,
        [post_id, user.id, user_role]
      );

      // Update likes count
      await pool.query(
        `UPDATE blogpost SET likes_count = likes_count + 1 WHERE post_id = $1`,
        [post_id]
      );

      res.json({ message: 'Post liked successfully', liked: true });
    }
  } catch (error) {
    console.error('Error liking/unliking post:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a post (NGO only, own posts)
router.delete('/posts/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    if (user.role !== 'recipient') {
      return res.status(403).json({ message: 'Only NGOs can delete posts' });
    }

    const result = await pool.query(
      `DELETE FROM blogpost WHERE post_id = $1 AND recipient_id = $2 RETURNING *`,
      [id, user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Post not found or not authorized' });
    }

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 