const mongoose = require('mongoose');

const orgTeamJoinRequestSchema = new mongoose.Schema(
  {
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrgTeam',
      required: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // Used if type === 'invite' to send to a specific user
    },
    type: {
      type: String,
      enum: ['invite', 'join_request'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('OrgTeamJoinRequest', orgTeamJoinRequestSchema);
