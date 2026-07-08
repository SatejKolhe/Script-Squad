const express = require('express');
const mongoose = require('mongoose');
const Team = require('../models/Team');
const User = require('../models/User');
const Task = require('../models/Task');
const Project = require('../models/Project');
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

// @route   GET /api/team
// @desc    Get the current user's team roster (with member profiles)
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const team = await getOrCreateTeam(req.user._id);

    const members = await User.find({ _id: { $in: team.members } }).select(
      'name email avatar createdAt'
    );

    res.json({ success: true, data: members });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/team/search?q=<name or email>
// @desc    Search registered users to add to your team
// @access  Private
router.get('/search', protect, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.json({ success: true, data: [] });
    }

    const team = await getOrCreateTeam(req.user._id);
    const excludeIds = [req.user._id, ...team.members]; // don't show self or existing members

    const users = await User.find({
      _id: { $nin: excludeIds },
      $or: [
        { name: { $regex: q.trim(), $options: 'i' } },
        { email: { $regex: q.trim(), $options: 'i' } },
      ],
    })
      .select('name email avatar')
      .limit(8);

    res.json({ success: true, data: users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/team/activity
// @desc    For each team member, return their active tasks, projects and stats
// @access  Private
router.get('/activity', protect, async (req, res) => {
  try {
    const team = await getOrCreateTeam(req.user._id);
    if (!team.members.length) {
      return res.json({ success: true, data: [] });
    }

    const memberIds = team.members.map((id) => new mongoose.Types.ObjectId(id));

    // Task counts per member per status
    const taskStats = await Task.aggregate([
      { $match: { owner: { $in: memberIds } } },
      {
        $group: {
          _id: { owner: '$owner', status: '$status' },
          count: { $sum: 1 },
        },
      },
    ]);

    // In-Progress tasks (with project info) per member
    const inProgressTasks = await Task.find({
      owner: { $in: memberIds },
      status: 'inprogress',
    })
      .populate('project', 'title color')
      .select('title project timerStartedAt totalTimeSpent')
      .limit(50);

    // Projects where member is the owner
    const memberProjects = await Project.find({
      owner: { $in: memberIds },
    })
      .select('title color owner status')
      .limit(100);

    // Build per-member maps
    const statsMap = {}; // memberId → { todo, inprogress, done }
    taskStats.forEach(({ _id, count }) => {
      const uid = _id.owner.toString();
      if (!statsMap[uid]) statsMap[uid] = { todo: 0, inprogress: 0, done: 0 };
      statsMap[uid][_id.status] = count;
    });

    const inProgressMap = {}; // memberId → [tasks]
    inProgressTasks.forEach((t) => {
      const uid = t.owner ? t.owner.toString() : null;
      if (!uid) return;
      if (!inProgressMap[uid]) inProgressMap[uid] = [];
      inProgressMap[uid].push(t);
    });

    const projectsMap = {}; // memberId → [projects]
    memberProjects.forEach((p) => {
      const uid = p.owner.toString();
      if (!projectsMap[uid]) projectsMap[uid] = [];
      projectsMap[uid].push(p);
    });

    // Fetch full member profiles
    const members = await User.find({ _id: { $in: memberIds } }).select(
      'name email avatar createdAt'
    );

    const data = members.map((m) => {
      const uid = m._id.toString();
      return {
        user: m,
        stats: statsMap[uid] || { todo: 0, inprogress: 0, done: 0 },
        inProgressTasks: inProgressMap[uid] || [],
        projects: projectsMap[uid] || [],
      };
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/team/members
// @desc    Add a user to your team by email
// @access  Private
router.post('/members', protect, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // Find the user to add
    const userToAdd = await User.findOne({ email: email.toLowerCase().trim() }).select(
      'name email avatar'
    );
    if (!userToAdd) {
      return res.status(404).json({ success: false, message: 'No user found with that email' });
    }

    // Cannot add yourself
    if (userToAdd._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot add yourself' });
    }

    const team = await getOrCreateTeam(req.user._id);

    // Already a member?
    if (team.members.some((m) => m.toString() === userToAdd._id.toString())) {
      return res.status(400).json({ success: false, message: 'User is already in your team' });
    }

    team.members.push(userToAdd._id);
    await team.save();

    res.json({ success: true, data: userToAdd, message: `${userToAdd.name} added to your team!` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/team/members/:userId
// @desc    Remove a member from your team
// @access  Private
router.delete('/members/:userId', protect, async (req, res) => {
  try {
    const team = await getOrCreateTeam(req.user._id);
    const before = team.members.length;
    team.members = team.members.filter((m) => m.toString() !== req.params.userId);

    if (team.members.length === before) {
      return res.status(404).json({ success: false, message: 'Member not found in your team' });
    }

    await team.save();
    res.json({ success: true, message: 'Member removed from your team' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
