const mongoose = require('mongoose');

const pointEventSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
    },
    points: {
      type: Number,
      default: 10,
    },
    reason: {
      type: String,
      default: 'task_completion',
    },
    awardedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
);

// Primary anti-abuse index: exactly one award per (user, task, reason)
pointEventSchema.index({ user: 1, task: 1, reason: 1 }, { unique: true });

// Fast weekly aggregation query
pointEventSchema.index({ user: 1, awardedAt: 1 });

module.exports = mongoose.model('PointEvent', pointEventSchema);
