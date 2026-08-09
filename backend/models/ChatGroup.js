const mongoose = require('mongoose');

const chatGroupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    orgTeamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OrgTeam',
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      }
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('ChatGroup', chatGroupSchema);
