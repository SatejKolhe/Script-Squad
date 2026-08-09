const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/tasks
// @desc    Get tasks (optionally filter by project)
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { project, status, priority, search, dueDate, sortBy } = req.query;
    // Build base filter based on project scoping
    let filter = {};

    if (project) {
      const proj = await Project.findById(project);
      if (proj && proj.orgTeamId) {
        const OrgTeamMember = require('../models/OrgTeamMember');
        const membership = await OrgTeamMember.findOne({ teamId: proj.orgTeamId, userId: req.user._id });
        if (membership) {
          if (membership.role === 'leader') {
            // Leaders see everything in the project
            filter.project = project;
          } else {
            // Members see their own, assigned, AND public tasks in the project
            filter.project = project;
            filter.$or = [
              { owner: req.user._id },
              { assignees: req.user._id },
              { isPrivate: false }
            ];
          }
        } else {
          // Not a member, can only see their own tasks in this project if any
          filter.project = project;
          filter.owner = req.user._id;
        }
      } else {
        // Not a team project, default logic
        filter.project = project;
        filter.owner = req.user._id;
      }
    } else {
      filter.owner = req.user._id;
    }

    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (search) filter.title = { $regex: search, $options: 'i' };
    if (dueDate) {
      const date = new Date(dueDate);
      filter.dueDate = { $lte: date };
    }

    let sortOptions = { order: 1, createdAt: -1 };
    if (sortBy === 'dueDate') sortOptions = { dueDate: 1 };
    if (sortBy === 'priority') sortOptions = { priority: -1 };
    if (sortBy === 'createdAt') sortOptions = { createdAt: -1 };

    const tasks = await Task.find(filter)
      .populate('assignees', 'name email avatar')
      .populate('project', 'title color')
      .sort(sortOptions);

    res.json({ success: true, data: tasks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/tasks
// @desc    Create task
// @access  Private
router.post(
  '/',
  protect,
  [
    body('title').trim().notEmpty().withMessage('Task title is required').isLength({ max: 200 }),
    body('project').notEmpty().withMessage('Project is required').isMongoId(),
    body('priority').optional().isIn(['low', 'medium', 'high']),
    body('status').optional().isIn(['todo', 'inprogress', 'done']),
    body('isPrivate').optional().isBoolean(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      // Verify project belongs to user OR user is in the team that owns the project
      let project = await Project.findOne({ _id: req.body.project, owner: req.user._id });
      
      // If not owned directly, check if it belongs to an orgTeam where user is a member
      if (!project) {
        project = await Project.findOne({ _id: req.body.project });
        if (!project || !project.orgTeamId) {
          return res.status(404).json({ success: false, message: 'Project not found or access denied' });
        }
        const OrgTeamMember = require('../models/OrgTeamMember');
        const membership = await OrgTeamMember.findOne({ teamId: project.orgTeamId, userId: req.user._id });
        if (!membership) {
          return res.status(403).json({ success: false, message: 'Access denied to this team project' });
        }
      }

      // If assignees are provided and it's a team project, validate them
      if (req.body.assignees && req.body.assignees.length > 0 && project.orgTeamId) {
        const OrgTeamMember = require('../models/OrgTeamMember');
        for (const assigneeId of req.body.assignees) {
          const isMember = await OrgTeamMember.findOne({ teamId: project.orgTeamId, userId: assigneeId });
          if (!isMember) {
            return res.status(400).json({ success: false, message: `Assignee ${assigneeId} is not a member of this team` });
          }
        }
      }

      // Get highest order in this project+status
      const lastTask = await Task.findOne({ project: req.body.project, status: req.body.status || 'todo' }).sort({
        order: -1,
      });
      const order = lastTask ? lastTask.order + 1 : 0;

      const task = await Task.create({
        ...req.body,
        owner: req.user._id,
        order,
      });

      const populated = await task.populate([
        { path: 'assignees', select: 'name email avatar' },
        { path: 'project', select: 'title color' },
      ]);

      res.status(201).json({ success: true, data: populated });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// @route   GET /api/tasks/today
// @desc    Get tasks due today (not done)
// @access  Private
router.get('/today', protect, async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const tasks = await Task.find({
      owner: req.user._id,
      status: { $ne: 'done' },
      dueDate: { $gte: startOfDay, $lt: endOfDay },
    })
      .populate('project', 'title color')
      .sort({ priority: -1, order: 1 });

    res.json({ success: true, data: tasks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/tasks/today/count
// @desc    Get count of tasks due today
// @access  Private
router.get('/today/count', protect, async (req, res) => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const count = await Task.countDocuments({
      owner: req.user._id,
      status: { $ne: 'done' },
      dueDate: { $gte: startOfDay, $lt: endOfDay },
    });

    res.json({ success: true, data: count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/tasks/upcoming
// @desc    Get tasks with due dates (grouped: overdue, today, tomorrow, this week, later)
// @access  Private
router.get('/upcoming', protect, async (req, res) => {
  try {
    const tasks = await Task.find({
      owner: req.user._id,
      status: { $ne: 'done' },
      dueDate: { $ne: null },
    })
      .populate('project', 'title color')
      .sort({ dueDate: 1 });

    res.json({ success: true, data: tasks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/tasks/search
// @desc    Search tasks and projects by query & filters (status, priority, due date, sort)
// @access  Private
router.get('/search', protect, async (req, res) => {
  try {
    const { q, status, priority, dueDate, sortBy } = req.query;

    const hasQuery = q && q.trim().length > 0;
    const hasStatus = status && status !== 'all';
    const hasPriority = priority && priority !== 'all';
    const hasDueDate = dueDate && dueDate !== 'all';
    const hasSort = sortBy && sortBy !== 'default';

    // If no search query and no filters/sort provided, return empty
    if (!hasQuery && !hasStatus && !hasPriority && !hasDueDate && !hasSort) {
      return res.json({ success: true, data: { tasks: [], projects: [] } });
    }

    const taskFilter = { owner: req.user._id };

    if (hasQuery) {
      taskFilter.title = { $regex: q.trim(), $options: 'i' };
    }

    if (hasStatus) {
      taskFilter.status = status;
    }

    if (hasPriority) {
      taskFilter.priority = priority;
    }

    if (hasDueDate) {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);

      if (dueDate === 'today') {
        taskFilter.dueDate = { $gte: startOfDay, $lt: endOfDay };
      } else if (dueDate === 'overdue') {
        taskFilter.dueDate = { $lt: startOfDay };
        if (!hasStatus) {
          taskFilter.status = { $ne: 'done' };
        }
      } else if (dueDate === 'this_week') {
        const endOfWeek = new Date(startOfDay);
        endOfWeek.setDate(endOfWeek.getDate() + 7);
        taskFilter.dueDate = { $gte: startOfDay, $lt: endOfWeek };
      } else {
        // Specific YYYY-MM-DD
        const specificDate = new Date(dueDate);
        if (!isNaN(specificDate.getTime())) {
          const specStart = new Date(specificDate.getFullYear(), specificDate.getMonth(), specificDate.getDate());
          const specEnd = new Date(specStart);
          specEnd.setDate(specEnd.getDate() + 1);
          taskFilter.dueDate = { $gte: specStart, $lt: specEnd };
        }
      }
    }

    const tasksPromise = Task.find(taskFilter)
      .populate('project', 'title color')
      .populate('assignees', 'name email avatar')
      .sort({ createdAt: -1 })
      .limit(50);

    const projectsPromise = hasQuery
      ? Project.find({
          owner: req.user._id,
          $or: [{ title: { $regex: q.trim(), $options: 'i' } }, { description: { $regex: q.trim(), $options: 'i' } }],
        })
          .sort({ createdAt: -1 })
          .limit(15)
      : Promise.resolve([]);

    let [tasks, projects] = await Promise.all([tasksPromise, projectsPromise]);

    if (sortBy === 'dueDateAsc' || sortBy === 'dueDate' || sortBy === 'dueDateDesc') {
      const isAsc = sortBy === 'dueDateAsc' || sortBy === 'dueDate';
      const getDueDateMs = (t) => {
        if (!t.dueDate) return null;
        const ms = new Date(t.dueDate).getTime();
        return isNaN(ms) ? null : ms;
      };

      tasks.sort((a, b) => {
        const timeA = getDueDateMs(a);
        const timeB = getDueDateMs(b);

        if (timeA !== null && timeB !== null) {
          if (timeA !== timeB) {
            return isAsc ? timeA - timeB : timeB - timeA;
          }
          return new Date(b.createdAt) - new Date(a.createdAt);
        }
        if (timeA !== null) return -1;
        if (timeB !== null) return 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
    }

    res.json({ success: true, data: { tasks, projects } });


  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});



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

// @route   PUT /api/tasks/reorder/bulk
// @desc    Bulk reorder tasks (for kanban drag-and-drop)
// @access  Private
router.put('/reorder/bulk', protect, async (req, res) => {
  try {
    const { tasks } = req.body; // [{ _id, status, order }]
    if (!Array.isArray(tasks)) {
      return res.status(400).json({ success: false, message: 'tasks array required' });
    }

    // Split into two groups:
    //  1. Tasks whose status changed  → need individual .save() to trigger timer middleware
    //  2. Tasks that only moved order → fast bulkWrite is fine
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

    // Handle status-changing tasks individually (triggers pre-save timer hook)
    await Promise.all(
      statusChangers.map(({ doc, update }) => {
        doc.status = update.status;
        doc.order = update.order;
        return doc.save();
      })
    );

    // Handle order-only tasks with fast bulkWrite
    if (orderOnly.length > 0) {
      const bulkOps = orderOnly.map((t) => ({
        updateOne: {
          filter: { _id: t._id, owner: req.user._id },
          update: { order: t.order },
        },
      }));
      await Task.bulkWrite(bulkOps);
    }

    // Return updated tasks so the frontend gets fresh timerStartedAt / totalTimeSpent
    const updated = await Task.find({ _id: { $in: taskIds } })
      .populate('assignees', 'name email avatar')
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
      .populate('assignees', 'name email avatar')
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
    body('priority').optional().isIn(['low', 'medium', 'high']),
    body('status').optional().isIn(['todo', 'inprogress', 'done']),
    body('isPrivate').optional().isBoolean(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      // Fetch current task to detect status transition
      const existing = await Task.findOne({ _id: req.params.id, owner: req.user._id });
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }

      const wasNotDone = existing.status !== 'done';
      const becomingDone = req.body.status === 'done';

      Object.assign(existing, req.body);
      await existing.save();

      const task = await Task.findById(existing._id)
        .populate('assignees', 'name email avatar')
        .populate('project', 'title color');

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
            // First ever completion
            user.streak = 1;
          } else {
            const lastDate = new Date(user.lastTaskCompletedAt);
            const lastDayStart = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());

            if (lastDayStart.getTime() === todayStart.getTime()) {
              // Already completed a task today — streak unchanged
            } else if (lastDayStart.getTime() === yesterdayStart.getTime()) {
              // Completed yesterday — extend streak
              user.streak = (user.streak || 0) + 1;
            } else {
              // Gap in streak — reset
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
