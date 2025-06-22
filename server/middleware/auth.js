const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];
  
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    
    req.user = decoded;
    next();
  });
};

const isAdmin = (req, res, next) => {
  console.log('Decoded user:', req.user); // Debug log
  if (!req.user || req.user.role !== 'admin') {
    console.log('Access denied. User role:', req.user ? req.user.role : 'no user'); // Debug log
    return res.status(403).json({ message: 'Not authorized to access this resource' });
  }
  console.log('Access granted for admin'); // Debug log
  next();
};

module.exports = { authenticateToken, isAdmin }; 