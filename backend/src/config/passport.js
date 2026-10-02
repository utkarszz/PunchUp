const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const User = require("../models/User");

const maskString = (str) => {
  if (!str) return "undefined";
  if (str.length <= 8) return "*".repeat(str.length);
  return `${str.substring(0, 4)}...${str.substring(str.length - 4)}`;
};

console.log("[Passport Config] Configuring GoogleStrategy:");
console.log(`  - clientID: ${maskString(process.env.GOOGLE_CLIENT_ID)}`);
console.log(`  - clientSecret: ${maskString(process.env.GOOGLE_CLIENT_SECRET)}`);
console.log(`  - callbackURL: ${process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback"}`);

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ||
        "/api/auth/google/callback",
      tokenURL: 'https://oauth2.googleapis.com/token',
      scope: ["profile", "email"],
      proxy: true,
    },

    async (accessToken, refreshToken, profile, done) => {
      console.log(`[Passport Google Strategy Callback] Received profile for ID: ${profile.id}`);
      console.log(`  - Display Name: ${profile.displayName}`);
      console.log(`  - Email: ${profile.emails && profile.emails[0] ? profile.emails[0].value : "N/A"}`);
      try {
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value.toLowerCase().trim() : "";

        // Check if user exists by googleId or email
        let user = await User.findOne({
          $or: [
            { googleId: profile.id },
            ...(email ? [{ email }] : [])
          ]
        });

        if (user) {
          console.log(`[Passport Google Strategy Callback] Existing user found in DB: ${user.username} (${user._id})`);
          if (!user.googleId) {
            user.googleId = profile.id;
            await user.save();
          }
          return done(null, user);
        }

        const displayName = (profile.displayName || "PunchUp User").trim();

        let baseUsername = displayName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");

        if (!baseUsername) {
          baseUsername = email ? email.split("@")[0].replace(/[^a-z0-9]/g, "") : "user";
        }
        if (!baseUsername) {
          baseUsername = "user";
        }

        let username = baseUsername;
        let counter = 1;

        while (
          await User.findOne({
            username,
          })
        ) {
          username = `${baseUsername}${counter}`;
          counter++;
        }

        console.log(`[Passport Google Strategy Callback] User not found. Creating new user with username: ${username}`);
        user = await User.create({
          googleId: profile.id,
          displayName,
          username,
          email: email || `user_${profile.id}@punchup.app`,
          profilePicture: profile.photos && profile.photos[0] ? profile.photos[0].value : "",
        });

        console.log(`[Passport Google Strategy Callback] Successfully created user: ${user.username} (${user._id})`);
        done(null, user);
      } catch (error) {
        console.error("[Passport Google Strategy Callback] Error during authentication callback:", error);
        done(error, null);
      }
    }
  )
);

module.exports = passport;