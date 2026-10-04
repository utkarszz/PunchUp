const mongoose = require('mongoose');

const focusSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      default: null,
    },
    duration: {
      type: Number,
      default: 0,
      min: [0, 'Duration cannot be negative'],
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'cancelled'],
      default: 'active',
      index: true,
    },
    timeZone: {
      type: String,
      default: 'UTC',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// High-performance compound indexes for user lookups and leaderboard aggregation
focusSessionSchema.index({ status: 1, startTime: -1, user: 1, duration: 1 });
focusSessionSchema.index({ user: 1, status: 1, startTime: -1 });
focusSessionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('FocusSession', focusSessionSchema);
