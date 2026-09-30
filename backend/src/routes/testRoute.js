const express = require('express');
const router = express.Router();
const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// Gate all test/dev routes: NEVER accessible in production unless explicitly enabled
router.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEV_LOGIN !== 'true') {
    return res.status(404).json({ success: false, message: 'Not found' });
  }
  next();
});

router.get('/', (req, res) => {
  res.json({
    success: true,
    message: "Test route is working!"
  });
});

// DEV ONLY — get a token for any real user by username or email
// Usage: GET /test/token?username=utkarshsingh
//        GET /test/token?email=utkarzz1705@gmail.com
router.get('/token', async (req, res) => {
  try {
    const { username, email } = req.query;

    if (!username && !email) {
      return res.status(400).json({
        success: false,
        message: 'Provide ?username=<username> or ?email=<email> as a query param'
      });
    }

    const query = username ? { username } : { email };
    const user = await User.findOne(query).select('-__v');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: `No user found with ${username ? 'username: ' + username : 'email: ' + email}`
      });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user,
      hint: 'Use this token as: Authorization: Bearer <token>'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
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

// One-click dev login that redirects directly into the app
router.get('/dev-login', async (req, res) => {
  try {
    const email = req.query.email || 'utkarzz1705@gmail.com';
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        googleId: 'dev-google-id-' + Date.now(),
        displayName: 'Utkarsh Singh',
        username: 'utkarzz',
        email: email,
        profilePicture: 'https://api.dicebear.com/7.x/bottts/svg?seed=utkarzz',
        isOnboarded: true,
      });
    }
    const token = generateToken(user._id);
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:4200";
    return res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;