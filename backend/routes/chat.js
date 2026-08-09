const express = require('express');
const Message = require('../models/Message');
const Team = require('../models/Team');
const User = require('../models/User');
const ChatGroup = require('../models/ChatGroup');
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

    // Get group chats where user is a member
    const groupChats = await ChatGroup.find({ members: req.user._id }).lean();
    const groupConversations = await Promise.all(
      groupChats.map(async (group) => {
        const lastMessage = await Message.findOne({ toGroup: group._id })
          .sort({ createdAt: -1 })
          .populate('from', 'name email avatar')
          .lean();

        return {
          isGroup: true,
          group,
          lastMessage,
          unreadCount: 0, // Simplify unread count for groups
        };
      })
    );

    // Combine and sort
    const allConversations = [...conversations, ...groupConversations];
    
    // Sort by last message time (most recent first)
    allConversations.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt || 0;
      const bTime = b.lastMessage?.createdAt || 0;
      return new Date(bTime) - new Date(aTime);
    });

    res.json({ success: true, data: allConversations });
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
    const { isGroup } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = 50;

    let messages;
    if (isGroup === 'true') {
      messages = await Message.find({ toGroup: userId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('from', 'name email avatar')
        .lean();
    } else {
      messages = await Message.find({
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
    }

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
    const { to, toGroup, text } = req.body;
    if ((!to && !toGroup) || !text?.trim()) {
      return res.status(400).json({ success: false, message: 'Recipient and text are required' });
    }

    // Deduplicate: prevent exact same message from same user in last 2 seconds
    const twoSecondsAgo = new Date(Date.now() - 2000);
    const recentDuplicate = await Message.findOne({
      from: req.user._id,
      text: text.trim(),
      ...(toGroup ? { toGroup } : { to }),
      createdAt: { $gt: twoSecondsAgo }
    }).populate('from', 'name email avatar');

    if (recentDuplicate) {
      // Just return the existing message to the client, pretending it succeeded
      return res.status(200).json({ success: true, data: recentDuplicate.toObject() });
    }

    const messageData = {
      from: req.user._id,
      text: text.trim(),
    };
    if (toGroup) messageData.toGroup = toGroup;
    else messageData.to = to;

    const message = await Message.create(messageData);

    const populated = message.toObject();
    populated.from = {
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      avatar: req.user.avatar,
    };

    // Emit via Socket.io for real-time delivery
    if (req.io) {
      if (toGroup) {
        const group = await ChatGroup.findById(toGroup);
        if (group) {
          group.members.forEach((memberId) => {
            req.io.to(`user-${memberId.toString()}`).emit('chat-message', populated);
          });
        }
      } else {
        req.io.to(`user-${to}`).emit('chat-message', populated);
      }
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
