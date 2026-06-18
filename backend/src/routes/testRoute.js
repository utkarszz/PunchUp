const express = require('express');
const router = express.Router();
const User = require('../models/User');
const generateToken = require('../utils/generateToken');

router.get('/', (req, res) => {
  res.json({
    success: true,
    message: "Test route is working!"
  });
});

router.get('/login-mock', async (req, res) => {
  try {
    let user = await User.findOne({ email: 'mockuser@example.com' });
    if (!user) {
      user = await User.create({
        googleId: 'mock-google-id-12345',
        username: 'MockUser',
        email: 'mockuser@example.com',
        profilePicture: 'https://api.dicebear.com/7.x/bottts/svg?seed=MockUser',
        bio: 'This is a mock bio for automated visual testing.'
      });
    }
    const token = generateToken(user._id);
    res.json({
      success: true,
      token,
      user
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;