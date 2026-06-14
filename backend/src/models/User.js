const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    googleId: {
      type: String,
      default: null
    },

    username: {
      type: String,
      required: true,
     
      trim: true
     
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true
    },

    profilePicture: {
      type: String,
      default: ""
    },

    bio: {
      type: String,
      default: ""
    },

    currentStreak: {
      type: Number,
      default: 0
    },

    longestStreak: {
      type: Number,
      default: 0
    },

    totalTasksCompleted: {
      type: Number,
      default: 0
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user"
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("User", userSchema);