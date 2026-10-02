const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
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

    dueDate: {
      type: Date,
      required: [true, "Due date is required"],
      default: function () {
        const base = this.createdAt ? new Date(this.createdAt).getTime() : Date.now();
        return new Date(base + 24 * 60 * 60 * 1000);
      },
    },

    completed: {
      type: Boolean,
      default: false,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },

    pointsAwarded: {
      type: Boolean,
      default: false,
    },

    reminderInterval: {
      type: Number,
      enum: [0, 1, 2, 3, 4, 5],
      default: 0,
    },

    reminderEnabled: {
      type: Boolean,
      default: false,
    },

    nextReminderAt: {
      type: Date,
      default: null,
    },

    lastReminderSentAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

taskSchema.index({ reminderEnabled: 1, completed: 1, isDeleted: 1, nextReminderAt: 1 });

// Guarantee that missing or null dueDate is assigned 24 hours from creation before validation runs
taskSchema.pre("validate", function (next) {
  if (!this.dueDate) {
    const base = this.createdAt ? new Date(this.createdAt).getTime() : Date.now();
    this.dueDate = new Date(base + 24 * 60 * 60 * 1000);
  }
  next();
});

// Extra safety before saving
taskSchema.pre("save", function (next) {
  if (!this.dueDate) {
    const base = this.createdAt ? new Date(this.createdAt).getTime() : Date.now();
    this.dueDate = new Date(base + 24 * 60 * 60 * 1000);
  }
  next();
});

module.exports = mongoose.model("Task", taskSchema);