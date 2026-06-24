const generateToken = require('../utils/generateToken');

const googleAuthSuccess = async (req, res) => {
  console.log("[Auth Controller] googleAuthSuccess triggered.");
  if (!req.user) {
    console.error("  - No user found in request! Passport authentication might have failed.");
    return res.status(401).json({ success: false, message: "Authentication failed" });
  }

  const token = generateToken(req.user._id);
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:4200";
  const redirectUrl = `${frontendUrl}/auth/callback?token=${token}`;

  console.log(`  - Authenticated user: ${req.user.username} (${req.user._id})`);
  console.log(`  - Generated JWT token starting with: ${token.substring(0, 10)}...`);
  console.log(`  - Redirecting browser to: ${redirectUrl}`);

  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.redirect(redirectUrl);
};

module.exports = {
  googleAuthSuccess,
};
