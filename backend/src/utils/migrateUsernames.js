const User = require("../models/User");

const migrateUsernames = async () => {
  try {
    const users = await User.find();

    for (const user of users) {
      if (!user.displayName) {
        user.displayName = user.username;
      }

      if (
        user.username &&
        user.username.includes(" ")
      ) {
        user.username = user.username
          .toLowerCase()
          .replace(/\s+/g, "");
      }

      await user.save();
    }

    console.log("Migration completed");
  } catch (error) {
    console.error(error);
  }
};

module.exports = migrateUsernames;