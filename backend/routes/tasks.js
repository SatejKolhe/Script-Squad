const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// Helper: build date range for today (midnight → 23:59:59)
// ─────────────────────────────────────────────────────────────────────────────
function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

// @route   GET /api/tasks
// @desc    Get tasks (optionally filter by project, status, priority, labels, search)
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { project, status, priority, search, dueDate, sortBy, label, inbox } = req.query;
    const filter = { owner: req.user._id };

    if (project) filter.project = project;
    if (inbox === 'true') filter.isInbox = true;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (search) filter.title = { $regex: search, $options: 'i' };
    if (label) filter['labels.name'] = { $regex: label, $options: 'i' };
    if (dueDate) {
      const date = new Date(dueDate);
      filter.dueDate = { $lte: date };
    }

    let sortOptions = { order: 1, createdAt: -1 };
    if (sortBy === 'dueDate') sortOptions = { dueDate: 1 };
    if (sortBy === 'priority') sortOptions = { priority: -1 };
    if (sortBy === 'createdAt') sortOptions = { createdAt: -1 };

    const tasks = await Task.find(filter)
      .populate('assignee', 'name email avatar')
      .populate('project', 'title color')
      .sort(sortOptions);

    res.json({ success: true, data: tasks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/tasks
// @desc    Create task (project is now optional — omit for Inbox)
// @access  Private
router.post(
  '/',
  protect,
  [
    body('title').trim().notEmpty().withMessage('Task title is required').isLength({ max: 200 }),
    body('project').optional({ nullable: true }).isMongoId(),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
    body('status').optional().isIn(['todo', 'inprogress', 'done']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      let order = 0;
      // If a project is provided, verify ownership
      if (req.body.project) {
        const project = await Project.findOne({ _id: req.body.project, owner: req.user._id });
        if (!project) {
          return res.status(404).json({ success: false, message: 'Project not found' });
        }
        // Get highest order in this project+status
        const lastTask = await Task.findOne({
          project: req.body.project,
          status: req.body.status || 'todo',
        }).sort({ order: -1 });
        order = lastTask ? lastTask.order + 1 : 0;
      } else {
        // Inbox task — get highest order among inbox tasks
        const lastInboxTask = await Task.findOne({
          owner: req.user._id,
          isInbox: true,
          status: req.body.status || 'todo',
        }).sort({ order: -1 });
        order = lastInboxTask ? lastInboxTask.order + 1 : 0;
      }

      const task = await Task.create({
        ...req.body,
        project: req.body.project || null,
        isInbox: !req.body.project,
        owner: req.user._id,
        order,
      });

      const populated = await task.populate([
        { path: 'assignee', select: 'name email avatar' },
        { path: 'project', select: 'title color' },
      ]);

      res.status(201).json({ success: true, data: populated });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// @route   GET /api/tasks/analytics/summary
// @desc    Get analytics data for current user
// @access  Private
// NOTE: This route MUST be defined before /:id to prevent Express from
//       matching the literal string "analytics" as a MongoDB ObjectId parameter.
router.get('/analytics/summary', protect, async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user._id);

    // Total tasks by status
    const statusCounts = await Task.aggregate([
      { $match: { owner: userId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    // Tasks completed per day (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const completedByDay = await Task.aggregate([
      { $match: { owner: userId, status: 'done', completedAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Priority breakdown
    const priorityCounts = await Task.aggregate([
      { $match: { owner: userId } },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
    ]);

    // Overdue tasks
    const overdue = await Task.countDocuments({
      owner: userId,
      status: { $ne: 'done' },
      dueDate: { $lt: new Date() },
    });

    // Total projects
    const totalProjects = await Project.countDocuments({ owner: userId });

    res.json({
      success: true,
      data: {
        statusCounts,
        completedByDay,
        priorityCounts,
        overdue,
        totalProjects,
        totalTasks: statusCounts.reduce((sum, s) => sum + s.count, 0),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/tasks/inbox
// @desc    Get Inbox tasks (no project / isInbox=true)
// @access  Private
router.get('/inbox', protect, async (req, res) => {
  try {
    const tasks = await Task.find({ owner: req.user._id, isInbox: true })
      .populate('assignee', 'name email avatar')
      .sort({ order: 1, createdAt: -1 });
    res.json({ success: true, data: tasks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/tasks/today
// @desc    Get tasks due today + overdue incomplete tasks
// @access  Private
router.get('/today', protect, async (req, res) => {
  try {
    const { start, end } = todayRange();

    const tasks = await Task.find({
      owner: req.user._id,
      status: { $ne: 'done' },
      dueDate: { $lte: end },
    })
      .populate('assignee', 'name email avatar')
      .populate('project', 'title color')
      .sort({ dueDate: 1, priority: -1 });

    res.json({ success: true, data: tasks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/tasks/upcoming
// @desc    Get tasks due in the next 7 days (excluding today)
// @access  Private
router.get('/upcoming', protect, async (req, res) => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const inSevenDays = new Date();
    inSevenDays.setDate(inSevenDays.getDate() + 7);
    inSevenDays.setHours(23, 59, 59, 999);

    const tasks = await Task.find({
      owner: req.user._id,
      status: { $ne: 'done' },
      dueDate: { $gte: tomorrow, $lte: inSevenDays },
    })
      .populate('assignee', 'name email avatar')
      .populate('project', 'title color')
      .sort({ dueDate: 1 });

    res.json({ success: true, data: tasks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/tasks/search
// @desc    Full-text search across all user tasks
// @access  Private
router.get('/search', protect, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 1) {
      return res.json({ success: true, data: [] });
    }
    const tasks = await Task.find({
      owner: req.user._id,
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { tags: { $regex: q, $options: 'i' } },
      ],
    })
      .populate('project', 'title color')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ success: true, data: tasks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/tasks/reorder/bulk
// @desc    Bulk reorder tasks (for kanban drag-and-drop)
// @access  Private
router.put('/reorder/bulk', protect, async (req, res) => {
  try {
    const { tasks } = req.body; // [{ _id, status, order }]
    if (!Array.isArray(tasks)) {
      return res.status(400).json({ success: false, message: 'tasks array required' });
    }

    const taskIds = tasks.map((t) => t._id);
    const existingTasks = await Task.find({ _id: { $in: taskIds }, owner: req.user._id });
    const existingMap = new Map(existingTasks.map((t) => [t._id.toString(), t]));

    const statusChangers = [];
    const orderOnly = [];

    for (const t of tasks) {
      const existing = existingMap.get(t._id.toString());
      if (!existing) continue;
      if (existing.status !== t.status) {
        statusChangers.push({ doc: existing, update: t });
      } else {
        orderOnly.push(t);
      }
    }

    await Promise.all(
      statusChangers.map(({ doc, update }) => {
        doc.status = update.status;
        doc.order = update.order;
        return doc.save();
      })
    );

    if (orderOnly.length > 0) {
      const bulkOps = orderOnly.map((t) => ({
        updateOne: {
          filter: { _id: t._id, owner: req.user._id },
          update: { order: t.order },
        },
      }));
      await Task.bulkWrite(bulkOps);
    }

    const updated = await Task.find({ _id: { $in: taskIds } })
      .populate('assignee', 'name email avatar')
      .populate('project', 'title color');

    res.json({ success: true, message: 'Tasks reordered', data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/tasks/:id
// @desc    Get single task
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, owner: req.user._id })
      .populate('assignee', 'name email avatar')
      .populate('project', 'title color');

    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    res.json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/tasks/:id
// @desc    Update task
// @access  Private
router.put(
  '/:id',
  protect,
  [
    body('title').optional().trim().notEmpty().isLength({ max: 200 }),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
    body('status').optional().isIn(['todo', 'inprogress', 'done']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const existing = await Task.findOne({ _id: req.params.id, owner: req.user._id });
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }

      const wasNotDone = existing.status !== 'done';
      const becomingDone = req.body.status === 'done';

      const task = await Task.findOneAndUpdate(
        { _id: req.params.id, owner: req.user._id },
        req.body,
        { new: true, runValidators: true }
      )
        .populate('assignee', 'name email avatar')
        .populate('project', 'title color');

      if (!task) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }

      // ── XP & Streak logic ────────────────────────────────────────────────
      let updatedUser = null;
      if (wasNotDone && becomingDone) {
        const user = await User.findById(req.user._id);
        if (user) {
          const XP_PER_TASK = 10;
          user.xp = (user.xp || 0) + XP_PER_TASK;

          const now = new Date();
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const yesterdayStart = new Date(todayStart);
          yesterdayStart.setDate(yesterdayStart.getDate() - 1);

          if (!user.lastTaskCompletedAt) {
            user.streak = 1;
          } else {
            const lastDate = new Date(user.lastTaskCompletedAt);
            const lastDayStart = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());

            if (lastDayStart.getTime() === todayStart.getTime()) {
              // Already completed a task today — streak unchanged
            } else if (lastDayStart.getTime() === yesterdayStart.getTime()) {
              user.streak = (user.streak || 0) + 1;
            } else {
              user.streak = 1;
            }
          }

          user.lastTaskCompletedAt = now;
          await user.save({ validateBeforeSave: false });
          updatedUser = {
            xp: user.xp,
            streak: user.streak,
            lastTaskCompletedAt: user.lastTaskCompletedAt,
          };
        }
      }

      res.json({ success: true, data: task, updatedUser });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// @route   DELETE /api/tasks/:id
// @desc    Delete task
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    res.json({ success: true, message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
