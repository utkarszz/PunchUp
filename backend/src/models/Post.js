const mongoose = require("mongoose");
const crypto = require("crypto");

const postSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },

    images: [
      {
        type: String,
      },
    ],

    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    commentsCount: {
      type: Number,
      default: 0,
    },

    shareId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

postSchema.pre("save", function (next) {
  if (!this.shareId) {
    this.shareId = "p_" + crypto.randomBytes(4).toString("hex");
  }
  next();
});

module.exports = mongoose.model("Post", postSchema);