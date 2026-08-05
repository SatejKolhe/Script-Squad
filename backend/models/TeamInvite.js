const mongoose = require('mongoose');

const teamInviteSchema = new mongoose.Schema(
  {
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

// Prevent duplicate pending invites
teamInviteSchema.index({ from: 1, to: 1, status: 1 });

module.exports = mongoose.model('TeamInvite', teamInviteSchema);
