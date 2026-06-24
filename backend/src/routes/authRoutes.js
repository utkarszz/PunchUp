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
    scope: ["profile", "email"]
  })
);

router.get(
  "/google/callback",
  (req, res, next) => {
    console.log("[Auth Route] GET /api/auth/google/callback received from Google.");
    console.log(`  - Host: ${req.headers.host}`);
    console.log(`  - Protocol: ${req.protocol}`);
    console.log(`  - Query keys: ${Object.keys(req.query).join(", ")}`);
    if (req.query.error) {
      console.error(`  - Google returned OAuth error: ${req.query.error}`);
    }
    next();
  },
  passport.authenticate("google", {
    session: false
  }),
  googleAuthSuccess
);

module.exports = router;