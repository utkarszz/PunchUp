const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;

const User = require("../models/User");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,

      clientSecret: process.env.GOOGLE_CLIENT_SECRET,

      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ||
        "http://localhost:5000/api/auth/google/callback",
    },

    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({
          googleId: profile.id,
        });

        if (user) {
          return done(null, user);
        }

        const displayName = profile.displayName;

        let baseUsername = displayName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");

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

        user = await User.create({
          googleId: profile.id,

          displayName,

          username,

          email: profile.emails[0].value,

          profilePicture: profile.photos[0].value,
        });

        done(null, user);
      } catch (error) {
        done(error, null);
      }
    }
  )
);

module.exports = passport;