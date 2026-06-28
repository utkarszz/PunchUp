const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    googleId: {
      type: String,
      default: null
    },
    displayName: {
      type: String,
     required: true,
      trim: true
    },

    username: {
      type: String,
      required: true,
     unique: true,
      lowercase: true,
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


    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user"
    },
    isOnboarded: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("User", userSchema);