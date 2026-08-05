const express = require('express');
const Message = require('../models/Message');
const Team = require('../models/Team');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/chat/conversations
// @desc    List team members with last message + unread count
// @access  Private
router.get('/conversations', protect, async (req, res) => {
  try {
    // Get team members
    let team = await Team.findOne({ owner: req.user._id });
    if (!team || team.members.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const memberIds = team.members;
    const members = await User.find({ _id: { $in: memberIds } }).select(
      'name email avatar'
    );

    // Get last message and unread count for each member
    const conversations = await Promise.all(
      members.map(async (member) => {
        const lastMessage = await Message.findOne({
          $or: [
            { from: req.user._id, to: member._id },
            { from: member._id, to: req.user._id },
          ],
        })
          .sort({ createdAt: -1 })
          .lean();

        const unreadCount = await Message.countDocuments({
          from: member._id,
          to: req.user._id,
          read: false,
        });

        return {
          user: member,
          lastMessage,
          unreadCount,
        };
      })
    );

    // Sort by last message time (most recent first)
    conversations.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt || 0;
      const bTime = b.lastMessage?.createdAt || 0;
      return new Date(bTime) - new Date(aTime);
    });

    res.json({ success: true, data: conversations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/chat/messages/:userId
// @desc    Get message history with a specific user
// @access  Private
router.get('/messages/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = 50;

    const messages = await Message.find({
      $or: [
        { from: req.user._id, to: userId },
        { from: userId, to: req.user._id },
      ],
    })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // Mark unread messages from this user as read
    await Message.updateMany(
      { from: userId, to: req.user._id, read: false },
      { read: true }
    );

    res.json({ success: true, data: messages.reverse() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/chat/messages
// @desc    Send a message
// @access  Private
router.post('/messages', protect, async (req, res) => {
  try {
    const { to, text } = req.body;
    if (!to || !text?.trim()) {
      return res.status(400).json({ success: false, message: 'Recipient and text are required' });
    }

    const message = await Message.create({
      from: req.user._id,
      to,
      text: text.trim(),
    });

    const populated = message.toObject();
    populated.from = {
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      avatar: req.user.avatar,
    };

    // Emit via Socket.io for real-time delivery
    if (req.io) {
      req.io.to(`user-${to}`).emit('chat-message', populated);
    }

    res.status(201).json({ success: true, data: populated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PATCH /api/chat/messages/read/:userId
// @desc    Mark messages from a user as read
// @access  Private
router.patch('/messages/read/:userId', protect, async (req, res) => {
  try {
    await Message.updateMany(
      { from: req.params.userId, to: req.user._id, read: false },
      { read: true }
    );
    res.json({ success: true, message: 'Messages marked as read' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/chat/unread-count
// @desc    Get total unread message count
// @access  Private
router.get('/unread-count', protect, async (req, res) => {
  try {
    const count = await Message.countDocuments({ to: req.user._id, read: false });
    res.json({ success: true, data: count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
