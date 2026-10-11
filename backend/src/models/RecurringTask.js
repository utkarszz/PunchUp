const mongoose = require("mongoose");

const recurringTaskSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },

    category: {
      type: String,
      default: "general",
    },

    frequency: {
      type: String,
      enum: ["daily"],
      default: "daily",
    },

    creationTime: {
      type: String,
      default: "07:00",
      validate: {
        validator: function (v) {
          return /^([01]\d|2[0-3]):([0-5]\d)$/.test(v);
        },
        message: "creationTime must be in HH:mm 24-hour format (e.g., 07:00)",
      },
    },

    timeZone: {
      type: String,
      default: "UTC",
      trim: true,
    },

    startDate: {
      type: Date,
      default: () => new Date(),
    },

    endDate: {
      type: Date,
      default: null,
    },

    reminderInterval: {
      type: Number,
      enum: [0, 1, 2, 3, 4, 5],
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    nextRunAt: {
      type: Date,
      default: null,
      index: true,
    },

    lastGeneratedDate: {
      type: String, // "YYYY-MM-DD" local calendar date
      default: null,
    },

    lastGeneratedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

recurringTaskSchema.index({ isActive: 1, nextRunAt: 1 });
recurringTaskSchema.index({ user: 1, isActive: 1 });

module.exports = mongoose.model("RecurringTask", recurringTaskSchema);
