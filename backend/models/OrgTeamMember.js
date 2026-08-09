const mongoose = require('mongoose');

const orgTeamMemberSchema = new mongoose.Schema(
  {
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrgTeam',
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['leader', 'member'],
      default: 'member',
    },
  },
  { timestamps: true }
);

// Prevent duplicate members in the same team
orgTeamMemberSchema.index({ teamId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('OrgTeamMember', orgTeamMemberSchema);
