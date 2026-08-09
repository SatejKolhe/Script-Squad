const express = require('express');
const mongoose = require('mongoose');
const Team = require('../models/Team');
const User = require('../models/User');
const Task = require('../models/Task');
const Project = require('../models/Project');
const TeamInvite = require('../models/TeamInvite');
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
    const excludeIds = [req.user._id]; // don't show self

    const users = await User.find({
      _id: { $nin: excludeIds },
      deletionStatus: { $ne: 'pending_deletion' },
      $or: [
        { name: { $regex: q.trim(), $options: 'i' } },
        { email: { $regex: q.trim(), $options: 'i' } },
      ],
    })
      .select('name email avatar')
      .limit(8)
      .lean();


    // Fetch pending invites sent by this user
    const pendingInvites = await TeamInvite.find({
      from: req.user._id,
      status: 'pending'
    }).select('to');

    const pendingUserIds = pendingInvites.map(inv => inv.to.toString());
    const memberIds = team.members.map(id => id.toString());

    // Attach inviteStatus
    const usersWithStatus = users.map(user => {
      const uid = user._id.toString();
      let status = 'none';
      if (memberIds.includes(uid)) status = 'member';
      else if (pendingUserIds.includes(uid)) status = 'pending';
      return { ...user, inviteStatus: status };
    });

    res.json({ success: true, data: usersWithStatus });
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

    // In-Progress tasks (with project info) per member — exclude private tasks
    const inProgressTasks = await Task.find({
      owner: { $in: memberIds },
      status: 'inprogress',
      isPrivate: { $ne: true },
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

// @route   GET /api/team/member/:userId
// @desc    Get detailed profile of a specific team member
// @access  Private
router.get('/member/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const team = await getOrCreateTeam(req.user._id);

    // Verify if the requested user is in the team
    if (!team.members.some((m) => m.toString() === userId)) {
      return res.status(403).json({ success: false, message: 'User is not in your team' });
    }

    const memberId = new mongoose.Types.ObjectId(userId);

    // Get user details
    const member = await User.findById(memberId).select('-password');
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    // Get stats
    const taskStats = await Task.aggregate([
      { $match: { owner: memberId } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);
    
    const stats = { todo: 0, inprogress: 0, done: 0 };
    taskStats.forEach(({ _id, count }) => {
      stats[_id] = count;
    });

    // Get all tasks for this member (recent 50) — exclude private tasks
    const tasks = await Task.find({ owner: memberId, isPrivate: { $ne: true } })
      .populate('project', 'title color')
      .sort({ createdAt: -1 })
      .limit(50);

    // Get projects owned by this member
    const projects = await Project.find({ owner: memberId })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        user: member,
        stats,
        tasks,
        projects
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/team/assign-task
// @desc    Leader assigns a task to a team member
// @access  Private
router.post('/assign-task', protect, async (req, res) => {
  try {
    const { assigneeId, title, description, priority, dueDate, isPrivate } = req.body;

    if (!assigneeId || !title) {
      return res.status(400).json({ success: false, message: 'Assignee and title are required' });
    }

    // Verify the assignee is actually in the leader's team
    const team = await getOrCreateTeam(req.user._id);
    if (!team.members.some((m) => m.toString() === assigneeId)) {
      return res.status(403).json({ success: false, message: 'User is not in your team' });
    }

    // Find or create a shared "Team Tasks" project owned by the leader
    let project = await Project.findOne({
      owner: req.user._id,
      title: 'Team Tasks',
    });
    if (!project) {
      project = await Project.create({
        title: 'Team Tasks',
        description: 'Tasks assigned by team leader',
        owner: req.user._id,
        color: '#7c3aed',
      });
    }

    const task = await Task.create({
      title: title.trim(),
      description: description?.trim() || '',
      project: project._id,
      owner: req.user._id,          // creator = leader
      assignees: [assigneeId],          // assigned to member
      priority: priority || 'medium',
      dueDate: dueDate || null,
      status: 'todo',
      isPrivate: isPrivate === true || isPrivate === 'true',
    });

    await task.populate('assignees', 'name email avatar');
    await task.populate('project', 'title color');

    res.status(201).json({ success: true, data: task, message: 'Task assigned successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/team/assigned-tasks
// @desc    Get all tasks assigned by the current user (as leader)
// @access  Private
router.get('/assigned-tasks', protect, async (req, res) => {
  try {
    const tasks = await Task.find({ owner: req.user._id, assignees: { $not: { $size: 0 } } })
      .populate('assignees', 'name email avatar')
      .populate('project', 'title color')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ success: true, data: tasks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PATCH /api/team/assigned-tasks/:taskId/status
// @desc    Leader updates status of an assigned task
// @access  Private
router.patch('/assigned-tasks/:taskId/status', protect, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['todo', 'inprogress', 'done'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const task = await Task.findOne({ _id: req.params.taskId, owner: req.user._id });
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    task.status = status;
    await task.save();

    await task.populate('assignees', 'name email avatar');
    await task.populate('project', 'title color');

    res.json({ success: true, data: task });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/team/assigned-tasks/:taskId
// @desc    Leader deletes an assigned task
// @access  Private
router.delete('/assigned-tasks/:taskId', protect, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.taskId, owner: req.user._id });
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    res.json({ success: true, message: 'Task deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PATCH /api/team/assigned-tasks/:taskId/visibility
// @desc    Toggle isPrivate on an assigned task (leader only)
// @access  Private
router.patch('/assigned-tasks/:taskId/visibility', protect, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.taskId, owner: req.user._id });
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    task.isPrivate = !task.isPrivate;
    await task.save();

    await task.populate('assignees', 'name email avatar');
    await task.populate('project', 'title color');

    res.json({ success: true, data: task, message: task.isPrivate ? 'Task set to private' : 'Task set to public' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

