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
  },
  {
    timestamps: true,
  }
);

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