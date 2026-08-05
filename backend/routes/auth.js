const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const https = require('https');            // built-in — used for DNS-over-HTTPS MX check
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const {
  sendPasswordResetEmail,
  sendVerificationEmail,
  sendPasswordResetOtpEmail,
} = require('../utils/emailService');

const router = express.Router();

// ── Disposable / known-temporary email domain blocklist ───────────────────────
// These domains accept ANY address so MX records alone won't catch them.
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'guerrillamail.net', 'guerrillamail.org',
  'guerrillamail.de', 'guerrillamail.biz', 'guerrillamail.info',
  'tempmail.com', 'temp-mail.org', 'temp-mail.io',
  '10minutemail.com', '10minutemail.net', '10minutemail.org',
  'yopmail.com', 'yopmail.fr', 'yopmail.net',
  'throwam.com', 'sharklasers.com', 'spam4.me',
  'trashmail.com', 'trashmail.at', 'trashmail.io', 'trashmail.me', 'trashmail.net',
  'dispostable.com', 'maildrop.cc', 'spamgourmet.com', 'fakeinbox.com',
  'mailnull.com', 'spamex.com', 'mailnesia.com', 'getairmail.com',
  'discard.email', 'throwaway.email', 'tempr.email', 'nwytg.com',
  'mintemail.com', 'spamhereplease.com', 'boun.cr', 'safetymail.info',
  'crapmail.org', 'mailscrap.com', 'spamgob.com', 'qqzpp.com',
  'mohmal.com', 'tempemail.net', 'emailondeck.com', 'filzmail.com',
  'anonymbox.com', 'armyspy.com', 'cuvox.de', 'dayrep.com',
  'einrot.com', 'fleckens.hu', 'gustr.com', 'jourrapide.com',
  'rhyta.com', 'superrito.com', 'teleworm.us',
]);

function isDisposableDomain(email) {
  const domain = email.split('@')[1]?.toLowerCase();
  return domain ? DISPOSABLE_DOMAINS.has(domain) : false;
}

// ── MX record check via DNS-over-HTTPS ──────────────────────────────────────
// Uses Google's public DoH API (HTTPS) instead of raw UDP/TCP DNS sockets,
// which may be firewall-restricted. Checks whether the email domain has real
// mail servers — this is what blocks made-up domains like madeupdomain123.com.
// Note: a domain with real MX records is genuinely capable of receiving email,
// even if it looks like a typo (e.g. gnail.com is a real registered domain).
// The disposable blocklist above handles known fake-mail providers separately.
function domainHasMxRecord(email) {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return Promise.resolve(false);

  return new Promise((resolve) => {
    const url = `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`;
    const req = https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          // Status 0 = NOERROR; Answer array present means MX records exist
          resolve(json.Status === 0 && Array.isArray(json.Answer) && json.Answer.length > 0);
        } catch {
          resolve(false);
        }
      });
    });
    req.on('error', () => resolve(false));
    // 5-second safety timeout
    req.setTimeout(5000, () => { req.destroy(); resolve(false); });
  });
}

// ── JWT helpers ───────────────────────────────────────────────────────────────
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
// @desc    Register new user — validates domain via MX lookup, then sends verification email
// @access  Public
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 50 }),
    body('email').isEmail().withMessage('Invalid email address.').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  async (req, res) => {
    // ── 1. Basic format validation ────────────────────────────────────────────
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { name, email, password } = req.body;

    // ── 2. Disposable domain blocklist ───────────────────────────────────────
    if (isDisposableDomain(email)) {
      return res.status(400).json({
        success: false,
        message: 'Disposable or temporary email addresses are not allowed. Please use your real email.',
      });
    }

    // ── 3. MX record check — the real guard against fake/nonexistent domains ─
    // This is what stops gnail.com, madeupdomain123.com, yaho.com, etc.
    const mxOk = await domainHasMxRecord(email);
    if (!mxOk) {
      return res.status(400).json({
        success: false,
        message: "This email domain doesn't appear to accept mail. Please check for typos.",
      });
    }

    try {
      // ── 4. Duplicate check ──────────────────────────────────────────────────
      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Email already in use' });
      }

      // ── 5. Create user (isVerified defaults to false) ───────────────────────
      const user = await User.create({ name, email, password });

      // ── 6. Generate token and send verification email ───────────────────────
      const rawToken = user.generateVerifyToken();
      await user.save({ validateBeforeSave: false });

      const verifyUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-email/${rawToken}`;

      try {
        await sendVerificationEmail(user, verifyUrl);
      } catch (emailErr) {
        // Roll back token so user can request a new one via resend
        user.emailVerifyToken = undefined;
        user.emailVerifyExpire = undefined;
        await user.save({ validateBeforeSave: false });
        console.error('Verification email error:', emailErr.message);
        return res.status(500).json({
          success: false,
          message: 'Account created but we could not send the verification email. Please try the resend option.',
        });
      }

      // ── 7. Return success — NO JWT, user must verify first ──────────────────
      res.status(201).json({
        success: true,
        message: "We've sent a verification email — please confirm it to activate your account.",
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// @route   POST /api/auth/login
// @desc    Login — blocked if email not verified
// @access  Public
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Invalid email address.').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: errors.array()[0].msg });
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

// @route   GET /api/auth/verify-email/:token
// @desc    Verify email address using token from the link
// @access  Public
router.get('/verify-email/:token', async (req, res) => {
  try {
    const hashedToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    const user = await User.findOne({
      emailVerifyToken: hashedToken,
      emailVerifyExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Verification link is invalid or has expired. Please request a new one.',
      });
    }

    user.isVerified = true;
    user.emailVerifyToken = undefined;
    user.emailVerifyExpire = undefined;
    await user.save({ validateBeforeSave: false });

    res.json({ success: true, message: 'Email verified successfully! You can now log in.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/auth/resend-verification
// @desc    Resend the email verification link
// @access  Public
router.post(
  '/resend-verification',
  [body('email').isEmail().withMessage('Invalid email address.').normalizeEmail()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
    }

    try {
      const user = await User.findOne({ email: req.body.email });

      // Always respond generically to prevent email enumeration
      if (!user) {
        return res.json({ success: true, message: 'If that account exists and is unverified, a new link has been sent.' });
      }

      if (user.isVerified) {
        return res.json({ success: true, message: 'This email is already verified. Please log in.' });
      }

      // Rate-limit: if a token was created < 2 minutes ago (expiry still > 28 min away), block
      if (user.emailVerifyExpire && user.emailVerifyExpire > Date.now() + 28 * 60 * 1000) {
        return res.status(429).json({
          success: false,
          message: 'Please wait a moment before requesting another verification email.',
        });
      }

      const rawToken = user.generateVerifyToken();
      await user.save({ validateBeforeSave: false });

      const verifyUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-email/${rawToken}`;

      try {
        await sendVerificationEmail(user, verifyUrl);
        res.json({ success: true, message: 'Verification email resent! Check your inbox (and spam folder).' });
      } catch (emailErr) {
        user.emailVerifyToken = undefined;
        user.emailVerifyExpire = undefined;
        await user.save({ validateBeforeSave: false });
        console.error('Resend verification email error:', emailErr.message);
        res.status(500).json({ success: false, message: 'Could not send verification email. Please try again.' });
      }
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
