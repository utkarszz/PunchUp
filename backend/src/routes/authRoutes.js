const express = require("express");
const passport = require("../config/passport");

const {
  googleAuthSuccess
} = require("../controllers/authController");

const router = express.Router();

router.get(
  "/google",
  (req, res, next) => {
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    console.log("[Auth Route] GET /api/auth/google triggered. Redirecting to Google...");
    console.log(`  - Host: ${req.headers.host}`);
    console.log(`  - Protocol: ${req.protocol}`);
    console.log(`  - Original URL: ${req.originalUrl}`);
    next();
  },
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account"
  })
);

router.get(
  "/google/callback",
  (req, res, next) => {
    console.log("[Auth Route] GET /api/auth/google/callback received from Google.");
    console.log(`  - Host: ${req.headers.host}`);
    console.log(`  - Query keys: ${Object.keys(req.query).join(", ")}`);
    if (req.query.error) {
      console.error(`  - Google returned OAuth error: ${req.query.error}`);
    }
    next();
  },
  (req, res, next) => {
    passport.authenticate("google", { session: false }, (err, user, info) => {
      if (err) {
        console.error("=== GOOGLE OAUTH AUTHENTICATION ERROR ===");
        console.error("Error name:", err.name);
        console.error("Error message:", err.message);
        if (err.data) {
          console.error("OAuth error response data:", err.data);
        }
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:4200";
        return res.redirect(`${frontendUrl}/login?error=oauth_error&msg=${encodeURIComponent(err.message || 'OAuth Failed')}`);
      }
      if (!user) {
        console.warn("=== GOOGLE OAUTH NO USER FOUND ===", info);
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:4200";
        return res.redirect(`${frontendUrl}/login?error=no_user`);
      }
      req.user = user;
      return googleAuthSuccess(req, res);
    })(req, res, next);
  }
);

module.exports = router;