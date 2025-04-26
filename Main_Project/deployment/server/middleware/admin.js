const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to check if user is an admin
module.exports = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    // Check if no token
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token, authorization denied' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user
    const user = await User.findById(decoded.id || decoded.user?.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    
    // Check if user is admin
    if (user.role !== 'admin') {
      console.log('User role:', user.role, 'User ID:', user._id);
      return res.status(403).json({ success: false, message: 'Not authorized as an admin' });
    }
    
    // Add user from payload
    req.user = user;
    next();
  } catch (err) {
    console.error('Admin middleware error:', err.message);
    res.status(401).json({ success: false, message: 'Token is not valid' });
  }
};
