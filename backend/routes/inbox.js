const express = require('express');
const TeamInvite = require('../models/TeamInvite');
const Team = require('../models/Team');
const Task = require('../models/Task');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ─── Helper: get-or-create the calling user's team document ──────────────────
async function getOrCreateTeam(userId) {
  let team = await Team.findOne({ owner: userId });
  if (!team) {
    team = await Team.create({ owner: userId, members: [] });
  }
  return team;
}

// @route   GET /api/inbox/invites
// @desc    Get pending invites for the current user (as recipient)
// @access  Private
router.get('/invites', protect, async (req, res) => {
  try {
    const invites = await TeamInvite.find({ to: req.user._id, status: 'pending' })
      .populate('from', 'name email avatar')
      .lean();

    // Fetch OrgTeamJoinRequests where the user is the receiver (direct invites)
    const OrgTeamJoinRequest = require('../models/OrgTeamJoinRequest');
    const OrgTeam = require('../models/OrgTeam');
    const orgInvites = await OrgTeamJoinRequest.find({ receiverId: req.user._id, type: 'invite', status: 'pending' })
      .populate('senderId', 'name email avatar')
      .populate('teamId', 'name')
      .lean();

    // Fetch OrgTeamJoinRequests where the user is a leader of the team (join_requests)
    const OrgTeamMember = require('../models/OrgTeamMember');
    const myLeaderTeams = await OrgTeamMember.find({ userId: req.user._id, role: 'leader' }).select('teamId');
    const leaderTeamIds = myLeaderTeams.map(m => m.teamId);
    
    const orgJoinReqs = await OrgTeamJoinRequest.find({ teamId: { $in: leaderTeamIds }, type: 'join_request', status: 'pending' })
      .populate('senderId', 'name email avatar')
      .populate('teamId', 'name')
      .lean();

    const merged = [
      ...invites.map(i => ({ ...i, isOrgTeam: false })),
      ...orgInvites.map(i => ({ ...i, isOrgTeam: true, isJoinRequest: false })),
      ...orgJoinReqs.map(i => ({ ...i, isOrgTeam: true, isJoinRequest: true }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ success: true, data: merged });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/inbox/invites/sent
// @desc    Get invites sent by the current user (as leader)
// @access  Private
router.get('/invites/sent', protect, async (req, res) => {
  try {
    const invites = await TeamInvite.find({ from: req.user._id })
      .populate('to', 'name email avatar')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: invites });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/inbox/invites
// @desc    Send a team invite to a user by email
// @access  Private
router.post('/invites', protect, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const userToInvite = await User.findOne({ email: email.toLowerCase().trim() }).select(
      'name email avatar'
    );
    if (!userToInvite) {
      return res.status(404).json({ success: false, message: 'No user found with that email' });
    }

    // Cannot invite yourself
    if (userToInvite._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot invite yourself' });
    }

    // Check if already on team
    const team = await getOrCreateTeam(req.user._id);
    if (team.members.some((m) => m.toString() === userToInvite._id.toString())) {
      return res.status(400).json({ success: false, message: 'User is already in your team' });
    }

    // Check for existing pending invite
    const existing = await TeamInvite.findOne({
      from: req.user._id,
      to: userToInvite._id,
      status: 'pending',
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Invite already sent to this user' });
    }

    const invite = await TeamInvite.create({
      from: req.user._id,
      to: userToInvite._id,
    });

    await invite.populate('to', 'name email avatar');
    await invite.populate('from', 'name email avatar');

    // Emit socket event so recipient sees the invite in real-time
    if (req.io) {
      req.io.to(`user-${userToInvite._id}`).emit('team-invite', invite);
    }

    res.status(201).json({
      success: true,
      data: invite,
      message: `Invite sent to ${userToInvite.name}!`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PATCH /api/inbox/invites/:id/accept
// @desc    Accept a team invite
// @access  Private
router.patch('/invites/:id/accept', protect, async (req, res) => {
  try {
    const invite = await TeamInvite.findOne({
      _id: req.params.id,
      to: req.user._id,
      status: 'pending',
    });

    if (!invite) {
      return res.status(404).json({ success: false, message: 'Invite not found' });
    }

    // Add to leader's team
    const team = await getOrCreateTeam(invite.from);
    if (!team.members.some((m) => m.toString() === req.user._id.toString())) {
      team.members.push(req.user._id);
      await team.save();
    }

    // Also add the leader to the accepter's team (mutual)
    const myTeam = await getOrCreateTeam(req.user._id);
    if (!myTeam.members.some((m) => m.toString() === invite.from.toString())) {
      myTeam.members.push(invite.from);
      await myTeam.save();
    }

    invite.status = 'accepted';
    await invite.save();

    res.json({ success: true, message: 'Invite accepted! You are now teammates.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PATCH /api/inbox/invites/:id/decline
// @desc    Decline a team invite
// @access  Private
router.patch('/invites/:id/decline', protect, async (req, res) => {
  try {
    const invite = await TeamInvite.findOne({
      _id: req.params.id,
      to: req.user._id,
      status: 'pending',
    });

    if (!invite) {
      return res.status(404).json({ success: false, message: 'Invite not found' });
    }

    invite.status = 'declined';
    await invite.save();

    res.json({ success: true, message: 'Invite declined.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/inbox/tasks
// @desc    Get all uncompleted tasks for current user
// @access  Private
router.get('/tasks', protect, async (req, res) => {
  try {
    const tasks = await Task.find({
      owner: req.user._id,
      status: { $ne: 'done' },
    })
      .populate('project', 'title color')
      .sort({ createdAt: -1 })
      .limit(200);

    res.json({ success: true, data: tasks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/inbox/counts
// @desc    Get badge counts (pending invites + uncompleted tasks)
// @access  Private
router.get('/counts', protect, async (req, res) => {
  try {
    const [inviteCount, taskCount] = await Promise.all([
      TeamInvite.countDocuments({ to: req.user._id, status: 'pending' }),
      Task.countDocuments({ owner: req.user._id, status: { $ne: 'done' } }),
    ]);

    res.json({ success: true, data: { invites: inviteCount, tasks: taskCount } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
