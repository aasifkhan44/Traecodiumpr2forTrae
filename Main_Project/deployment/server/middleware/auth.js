const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async (req, res, next) => {
  // Get token from header
  const token = req.header('Authorization')?.replace('Bearer ', '');

  // Check if no token
  if (!token) {
    console.log('No token provided in request');
    return res.status(401).json({ success: false, message: 'No token, authorization denied' });
  }

  try {
    console.log('Verifying token...');
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token verified, decoded ID:', decoded.id || decoded.user?.id);

    // Get the user ID from the token
    const userId = decoded.id || (decoded.user ? decoded.user.id : null);
    
    if (!userId) {
      console.log('No user ID found in token');
      return res.status(401).json({ success: false, message: 'Invalid token format' });
    }

    // Check if user exists and add user to request
    const user = await User.findById(userId).select('-password');
    if (!user) {
      console.log('User not found for ID:', userId);
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    
    console.log('User found:', user.name, 'ID:', user._id, 'Balance:', user.balance);
    
    // Set the full user object on the request
    req.user = user;

    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    res.status(401).json({ success: false, message: 'Token is not valid' });
  }
};
