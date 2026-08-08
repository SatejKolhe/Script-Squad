const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    avatar: {
      type: String,
      default: '',
    },
    bio: {
      type: String,
      default: '',
      maxlength: [300, 'Bio cannot exceed 300 characters'],
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    // ── Password Reset ──────────────────────────────────────────────────────
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    resetPasswordOtp: String,
    resetPasswordOtpExpire: Date,
    // ── Email Verification ──────────────────────────────────────────────────
    isVerified: {
      type: Boolean,
      default: false,
    },
    emailVerifyToken: String,
    emailVerifyExpire: Date,
    emailVerifyOtp: String,
    emailVerifyOtpExpire: Date,
    // ── XP & Streak ─────────────────────────────────────────────────────────
    xp: {
      type: Number,
      default: 0,
    },
    streak: {
      type: Number,
      default: 0,
    },
    lastTaskCompletedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// Compare entered password with stored hash
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate and hash password reset token
userSchema.methods.generateResetToken = function () {
  // Create a raw token
  const rawToken = crypto.randomBytes(32).toString('hex');

  // Hash the token and store it
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(rawToken)
    .digest('hex');

  // Set expiry to 15 minutes from now
  this.resetPasswordExpire = Date.now() + 15 * 60 * 1000;

  return rawToken;
};

// Generate and hash email verification token
userSchema.methods.generateVerifyToken = function () {
  const rawToken = crypto.randomBytes(32).toString('hex');

  this.emailVerifyToken = crypto
    .createHash('sha256')
    .update(rawToken)
    .digest('hex');

  // Set expiry to 30 minutes from now
  this.emailVerifyExpire = Date.now() + 30 * 60 * 1000;

  return rawToken;
};

// Generate and hash 6-digit email verification OTP
userSchema.methods.generateVerifyOtp = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  this.emailVerifyOtp = crypto
    .createHash('sha256')
    .update(otp)
    .digest('hex');

  // Set expiry to 10 minutes from now
  this.emailVerifyOtpExpire = Date.now() + 10 * 60 * 1000;

  return otp;
};

// Generate and hash 6-digit password reset OTP
userSchema.methods.generateResetOtp = function () {
  // Generate a 6-digit numeric OTP code
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Hash the OTP and store it
  this.resetPasswordOtp = crypto
    .createHash('sha256')
    .update(otp)
    .digest('hex');

  // Set expiry to 10 minutes from now
  this.resetPasswordOtpExpire = Date.now() + 10 * 60 * 1000;

  return otp;
};

module.exports = mongoose.model('User', userSchema);
