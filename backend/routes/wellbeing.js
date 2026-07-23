const express = require('express');
const mongoose = require('mongoose');
const SiteUsage = require('../models/SiteUsage');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/wellbeing/me
// @desc    Get current user's digital wellbeing data
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const usages = await SiteUsage.find({ user: req.user._id }).sort({ timeSpent: -1 });
    const user = await User.findById(req.user._id).select('isWellbeingPublic');
    
    res.json({
      success: true,
      data: {
        usages,
        isWellbeingPublic: user.isWellbeingPublic,
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/wellbeing/user/:userId
// @desc    Get teammate's digital wellbeing data (if public)
// @access  Private
router.get('/user/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).select('name isWellbeingPublic');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.isWellbeingPublic) {
      return res.status(403).json({ success: false, message: 'User wellbeing data is private' });
    }

    const usages = await SiteUsage.find({ user: userId }).sort({ timeSpent: -1 });

    res.json({
      success: true,
      data: {
        user,
        usages
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/wellbeing/log
// @desc    Log time spent on a site
// @access  Private
router.post('/log', protect, async (req, res) => {
  try {
    const { domain, timeSpent } = req.body;
    if (!domain || !timeSpent) {
      return res.status(400).json({ success: false, message: 'Domain and timeSpent are required' });
    }

    // Upsert logic for today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    let siteUsage = await SiteUsage.findOne({
      user: req.user._id,
      domain,
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    if (siteUsage) {
      siteUsage.timeSpent += timeSpent;
      await siteUsage.save();
    } else {
      siteUsage = await SiteUsage.create({
        user: req.user._id,
        domain,
        timeSpent,
        date: new Date()
      });
    }

    res.json({ success: true, data: siteUsage });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/wellbeing/settings
// @desc    Toggle public/private status of wellbeing data
// @access  Private
router.put('/settings', protect, async (req, res) => {
  try {
    const { isPublic } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { isWellbeingPublic: isPublic },
      { new: true, runValidators: true }
    ).select('isWellbeingPublic');
    
    res.json({ success: true, data: user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
