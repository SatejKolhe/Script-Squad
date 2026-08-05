const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { sendPasswordResetOtpEmail } = require('../utils/emailService');

const router = express.Router();

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

const sendToken = (user, statusCode, res) => {
  const token = generateToken(user._id);
  res.status(statusCode).json({
    success: true,
    token,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      bio: user.bio || '',
      role: user.role,
      xp: user.xp || 0,
      streak: user.streak || 0,
      lastTaskCompletedAt: user.lastTaskCompletedAt || null,
      createdAt: user.createdAt,
    },
  });
};

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 50 }),
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, password } = req.body;

    try {
      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Email already in use' });
      }

      const user = await User.create({ name, email, password });
      sendToken(user, 201, res);
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      sendToken(user, 200, res);
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, async (req, res) => {
  res.json({ success: true, user: req.user });
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put(
  '/profile',
  protect,
  [body('name').trim().notEmpty().withMessage('Name is required')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const updateFields = {
        name: req.body.name,
        avatar: req.body.avatar,
      };
      if (typeof req.body.bio !== 'undefined') {
        updateFields.bio = req.body.bio.slice(0, 300);
      }
      const user = await User.findByIdAndUpdate(
        req.user._id,
        updateFields,
        { new: true, runValidators: true }
      );
      res.json({ success: true, user });
    } catch (err) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);


// @route   POST /api/auth/forgot-password/send-otp (and /api/auth/forgot-password)
// @desc    Generate and send 6-digit OTP to user's email
// @access  Public
router.post(
  ['/forgot-password/send-otp', '/forgot-password'],
  [body('email').isEmail().withMessage('Valid email is required').normalizeEmail()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }

    const { email } = req.body;

    try {
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'No account found with this email address.',
        });
      }

      // Generate 6-digit OTP and set 10-minute expiry
      const otp = user.generateResetOtp();
      await user.save({ validateBeforeSave: false });

      // Send OTP email (and log to console for development)
      await sendPasswordResetOtpEmail(user, otp);

      res.json({
        success: true,
        message: 'Verification code has been sent to your email.',
      });
    } catch (err) {
      console.error('Send OTP error:', err);
      res.status(500).json({ success: false, message: 'Server error. Could not send verification code.' });
    }
  }
);

// @route   POST /api/auth/forgot-password/verify-otp
// @desc    Verify 6-digit OTP and issue temporary reset token
// @access  Public
router.post(
  '/forgot-password/verify-otp',
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('otp').trim().isLength({ min: 6, max: 6 }).withMessage('A 6-digit OTP code is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { email, otp } = req.body;

    try {
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(400).json({ success: false, message: 'Invalid request.' });
      }

      if (!user.resetPasswordOtp || !user.resetPasswordOtpExpire) {
        return res.status(400).json({
          success: false,
          message: 'No active OTP request found. Please request a new code.',
        });
      }

      if (user.resetPasswordOtpExpire.getTime() < Date.now()) {
        return res.status(400).json({
          success: false,
          message: 'Verification code has expired. Please request a new one.',
        });
      }

      const hashedInputOtp = crypto.createHash('sha256').update(String(otp).trim()).digest('hex');

      if (hashedInputOtp !== user.resetPasswordOtp) {
        return res.status(400).json({
          success: false,
          message: 'Invalid verification code. Please check and try again.',
        });
      }

      // OTP verified successfully: clear OTP fields and issue short-lived reset token
      user.resetPasswordOtp = undefined;
      user.resetPasswordOtpExpire = undefined;
      const resetToken = user.generateResetToken(); // 15 min expiry
      await user.save({ validateBeforeSave: false });

      res.json({
        success: true,
        resetToken,
        message: 'Email verified successfully! You can now set your new password.',
      });
    } catch (err) {
      console.error('Verify OTP error:', err);
      res.status(500).json({ success: false, message: 'Server error. Could not verify code.' });
    }
  }
);

// @route   POST /api/auth/forgot-password/reset
// @desc    Reset password after OTP verification; rejects if same as old password
// @access  Public
router.post(
  '/forgot-password/reset',
  [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('resetToken').notEmpty().withMessage('Reset token is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { email, resetToken, password } = req.body;

    try {
      const hashedToken = crypto.createHash('sha256').update(String(resetToken).trim()).digest('hex');

      const user = await User.findOne({
        email,
        resetPasswordToken: hashedToken,
        resetPasswordExpire: { $gt: Date.now() },
      }).select('+password');

      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Reset session is invalid or has expired. Please restart the process.',
        });
      }

      // Check if new password is identical to current password
      const isSamePassword = await user.matchPassword(password);
      if (isSamePassword) {
        return res.status(400).json({
          success: false,
          message: 'New password cannot be the same as your old password. Please choose a different password.',
        });
      }

      // Set new password (pre-save middleware will bcrypt hash it)
      user.password = password;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      user.resetPasswordOtp = undefined;
      user.resetPasswordOtpExpire = undefined;
      await user.save();

      res.json({
        success: true,
        message: 'Password reset successfully! You can now sign in with your new password.',
      });
    } catch (err) {
      console.error('Reset password error:', err);
      res.status(500).json({ success: false, message: 'Server error. Could not reset password.' });
    }
  }
);

// Fallback route for legacy /reset-password/:token
router.post(
  '/reset-password/:token',
  [body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    try {
      const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

      const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpire: { $gt: Date.now() },
      }).select('+password');

      if (!user) {
        return res.status(400).json({ success: false, message: 'Reset link is invalid or has expired.' });
      }

      const isSamePassword = await user.matchPassword(req.body.password);
      if (isSamePassword) {
        return res.status(400).json({
          success: false,
          message: 'New password cannot be the same as your old password.',
        });
      }

      user.password = req.body.password;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();

      sendToken(user, 200, res);
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);


module.exports = router;
