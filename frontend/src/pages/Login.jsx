import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import './Auth.css';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  // ── Login state ────────────────────────────────────────────────────────────
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  // ── Forgot password multi-step state ───────────────────────────────────────
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: Email, 2: OTP, 3: New Password, 4: Success
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotEmailError, setForgotEmailError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotBannerError, setForgotBannerError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  // Step 2: OTP & Cooldown
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpInputsRef = useRef([]);

  // Step 3: New Password
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newPasswordError, setNewPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // ── Resend Cooldown Countdown ──────────────────────────────────────────────
  useEffect(() => {
    let timer;
    if (forgotMode && forgotStep === 2 && resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [forgotMode, forgotStep, resendCooldown]);

  // ── Login handlers ─────────────────────────────────────────────────────────
  const validateLogin = () => {
    const e = {};
    if (!form.email) e.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.password) e.password = 'Password is required';
    return e;
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const v = validateLogin();
    if (Object.keys(v).length) {
      setErrors(v);
      return;
    }
    setErrors({});
    setServerError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      const data = err.response?.data;
      setServerError(data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (errors[e.target.name]) setErrors((prev) => ({ ...prev, [e.target.name]: '' }));
  };

  // ── Forgot Password Navigation & Reset ─────────────────────────────────────
  const resetForgotState = () => {
    setForgotMode(false);
    setForgotStep(1);
    setForgotEmail('');
    setForgotEmailError('');
    setForgotBannerError('');
    setForgotSuccess('');
    setForgotLoading(false);
    setOtp(['', '', '', '', '', '']);
    setOtpError('');
    setResendCooldown(0);
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
    setNewPasswordError('');
    setConfirmPasswordError('');
    setShowNewPassword(false);
  };

  const switchToForgot = () => {
    setForgotMode(true);
    setForgotStep(1);
    setForgotEmail(form.email || '');
    setForgotEmailError('');
    setForgotBannerError('');
    setForgotSuccess('');
    setServerError('');
  };

  const switchToLogin = () => {
    resetForgotState();
  };

  // ── Step 1: Send OTP ───────────────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    if (!forgotEmail || !/^\S+@\S+\.\S+$/.test(forgotEmail)) {
      setForgotEmailError('Please enter a valid email address');
      return;
    }
    setForgotEmailError('');
    setForgotBannerError('');
    setForgotLoading(true);

    try {
      const res = await axios.post('/api/auth/forgot-password/send-otp', {
        email: forgotEmail,
      });
      toast.success(res.data.message || 'Verification code sent to your email!');
      setForgotStep(2);
      setOtp(['', '', '', '', '', '']);
      setOtpError('');
      setResendCooldown(60); // 60 seconds countdown
      setTimeout(() => otpInputsRef.current[0]?.focus(), 150);
    } catch (err) {
      setForgotBannerError(
        err.response?.data?.message || 'Could not send verification code. Please check your email and try again.'
      );
    } finally {
      setForgotLoading(false);
    }
  };

  // ── Step 2: Resend OTP ─────────────────────────────────────────────────────
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || forgotLoading) return;
    setForgotLoading(true);
    setForgotBannerError('');
    setOtpError('');

    try {
      const res = await axios.post('/api/auth/forgot-password/send-otp', {
        email: forgotEmail,
      });
      toast.success('New verification code sent! Check your inbox.');
      setOtp(['', '', '', '', '', '']);
      setResendCooldown(60); // restart 60 seconds timer
      setTimeout(() => otpInputsRef.current[0]?.focus(), 150);
    } catch (err) {
      setForgotBannerError(
        err.response?.data?.message || 'Failed to resend code. Please try again.'
      );
    } finally {
      setForgotLoading(false);
    }
  };

  // ── Step 2: OTP Input Handlers ─────────────────────────────────────────────
  const handleOtpChange = (index, value) => {
    const cleaned = value.replace(/\D/g, '');
    if (otpError) setOtpError('');
    if (forgotBannerError) setForgotBannerError('');

    if (!cleaned) {
      const updated = [...otp];
      updated[index] = '';
      setOtp(updated);
      return;
    }

    const updated = [...otp];
    updated[index] = cleaned[cleaned.length - 1];
    setOtp(updated);

    if (index < 5 && cleaned) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasteData) return;

    const newOtp = ['', '', '', '', '', ''];
    for (let i = 0; i < pasteData.length; i++) {
      newOtp[i] = pasteData[i];
    }
    setOtp(newOtp);
    if (otpError) setOtpError('');

    const focusIdx = Math.min(pasteData.length, 5);
    otpInputsRef.current[focusIdx]?.focus();
  };

  // ── Step 2: Verify OTP ─────────────────────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const enteredOtp = otp.join('');
    if (enteredOtp.length !== 6) {
      setOtpError('Please enter all 6 digits of the verification code');
      return;
    }

    setOtpError('');
    setForgotBannerError('');
    setForgotLoading(true);

    try {
      const res = await axios.post('/api/auth/forgot-password/verify-otp', {
        email: forgotEmail,
        otp: enteredOtp,
      });

      setResetToken(res.data.resetToken);
      toast.success('Email verified successfully! 🎉');
      setForgotStep(3);
      setNewPassword('');
      setConfirmPassword('');
      setNewPasswordError('');
      setConfirmPasswordError('');
    } catch (err) {
      setOtpError(err.response?.data?.message || 'Invalid or expired verification code');
    } finally {
      setForgotLoading(false);
    }
  };

  // ── Step 3: Reset Password ─────────────────────────────────────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault();
    let hasErr = false;
    setNewPasswordError('');
    setConfirmPasswordError('');
    setForgotBannerError('');

    if (!newPassword) {
      setNewPasswordError('New password is required');
      hasErr = true;
    } else if (newPassword.length < 6) {
      setNewPasswordError('Password must be at least 6 characters');
      hasErr = true;
    }

    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your new password');
      hasErr = true;
    } else if (newPassword !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      hasErr = true;
    }

    if (hasErr) return;

    setForgotLoading(true);

    try {
      const res = await axios.post('/api/auth/forgot-password/reset', {
        email: forgotEmail,
        resetToken,
        password: newPassword,
      });

      setForgotSuccess(res.data.message || 'Password updated successfully! You can now sign in.');
      setForgotStep(4);
      toast.success('Password reset successfully! 🔒');
      setForm((prev) => ({ ...prev, email: forgotEmail, password: '' }));
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to reset password. Please try again.';
      if (msg.toLowerCase().includes('old password') || msg.toLowerCase().includes('same')) {
        setNewPasswordError(msg);
      } else {
        setForgotBannerError(msg);
      }
    } finally {
      setForgotLoading(false);
    }
  };

  const renderAuthFooter = () => (
    <div className="auth-footer">
      <p>
        Remember your password?{' '}
        <button type="button" className="auth-link auth-link-btn" onClick={switchToLogin}>
          Back to Sign In
        </button>
      </p>
    </div>
  );

  return (
    <div className="auth-page">
      {/* Animated background */}
      <div className="auth-bg">
        <div className="auth-orb orb-1" />
        <div className="auth-orb orb-2" />
        <div className="auth-orb orb-3" />
      </div>

      <div className="auth-container">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">⚡</div>
          <div>
            <h1 className="auth-logo-name">Script Squad</h1>
            <p className="auth-logo-tagline">Work Smarter Together</p>
          </div>
        </div>

        {/* Card */}
        <div className="auth-card card-glass">
          <div className="auth-card-header">
            <h2 className="auth-title">
              {!forgotMode && 'Welcome back'}
              {forgotMode && forgotStep === 1 && 'Forgot Password'}
              {forgotMode && forgotStep === 2 && 'Verify Your Email'}
              {forgotMode && forgotStep === 3 && 'Create New Password'}
              {forgotMode && forgotStep === 4 && 'Password Reset!'}
            </h2>
            <p className="auth-subtitle">
              {!forgotMode && 'Sign in to continue to your workspace'}
              {forgotMode && forgotStep === 1 && 'Enter your account email to receive a 6-digit verification code'}
              {forgotMode && forgotStep === 2 && 'Enter the 6-digit verification code sent to your email'}
              {forgotMode && forgotStep === 3 && 'Choose a strong new password that is different from your old one'}
              {forgotMode && forgotStep === 4 && 'Your password has been successfully updated'}
            </p>
          </div>

          {/* ── FORGOT PASSWORD STEP PROGRESS ── */}
          {forgotMode && forgotStep < 4 && (
            <div className="forgot-steps-bar">
              <div className={`forgot-step-item ${forgotStep === 1 ? 'active' : ''} ${forgotStep > 1 ? 'completed' : ''}`}>
                <span className="forgot-step-dot">{forgotStep > 1 ? '✓' : '1'}</span>
                <span>Email</span>
              </div>
              <div className={`forgot-step-line ${forgotStep > 1 ? 'completed' : ''}`} />
              <div className={`forgot-step-item ${forgotStep === 2 ? 'active' : ''} ${forgotStep > 2 ? 'completed' : ''}`}>
                <span className="forgot-step-dot">{forgotStep > 2 ? '✓' : '2'}</span>
                <span>Verify OTP</span>
              </div>
              <div className={`forgot-step-line ${forgotStep > 2 ? 'completed' : ''}`} />
              <div className={`forgot-step-item ${forgotStep === 3 ? 'active' : ''}`}>
                <span className="forgot-step-dot">3</span>
                <span>New Password</span>
              </div>
            </div>
          )}

          {/* ── LOGIN FORM ── */}
          {!forgotMode && (
            <>
              {serverError && (
                <div className="auth-error-banner">⚠️ {serverError}</div>
              )}

              <form onSubmit={handleLoginSubmit} className="auth-form" noValidate>
                <div className="form-group">
                  <label className="form-label" htmlFor="login-email">Email address</label>
                  <input
                    id="login-email"
                    type="email"
                    name="email"
                    className={`form-input ${errors.email ? 'error' : ''}`}
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={handleLoginChange}
                    autoComplete="email"
                    autoFocus
                  />
                  {errors.email && <span className="form-error">{errors.email}</span>}
                </div>

                <div className="form-group">
                  <div className="auth-label-row">
                    <label className="form-label" htmlFor="login-password">Password</label>
                    <button
                      type="button"
                      className="auth-forgot-link"
                      onClick={switchToForgot}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <input
                    id="login-password"
                    type="password"
                    name="password"
                    className={`form-input ${errors.password ? 'error' : ''}`}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={handleLoginChange}
                    autoComplete="current-password"
                  />
                  {errors.password && <span className="form-error">{errors.password}</span>}
                </div>

                <button
                  id="login-submit"
                  type="submit"
                  className="btn btn-primary w-full btn-lg"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="spinner spinner-sm" />
                      Signing in...
                    </>
                  ) : (
                    <>🔑 Sign In</>
                  )}
                </button>
              </form>

              <div className="auth-footer">
                <p>
                  Don't have an account?{' '}
                  <Link to="/register" className="auth-link">Create account →</Link>
                </p>
              </div>
            </>
          )}

          {/* ── FORGOT PASSWORD: STEP 1 (EMAIL) ── */}
          {forgotMode && forgotStep === 1 && (
            <>
              {forgotBannerError && (
                <div className="auth-error-banner">⚠️ {forgotBannerError}</div>
              )}

              <form onSubmit={handleSendOtp} className="auth-form" noValidate>
                <div className="form-group">
                  <label className="form-label" htmlFor="forgot-email">Account Email address</label>
                  <input
                    id="forgot-email"
                    type="email"
                    className={`form-input ${forgotEmailError ? 'error' : ''}`}
                    placeholder="you@example.com"
                    value={forgotEmail}
                    onChange={(e) => {
                      setForgotEmail(e.target.value);
                      if (forgotEmailError) setForgotEmailError('');
                      if (forgotBannerError) setForgotBannerError('');
                    }}
                    autoFocus
                  />
                  {forgotEmailError && <span className="form-error">{forgotEmailError}</span>}
                </div>

                <div className="auth-btn-row">
                  <button
                    type="button"
                    className="btn btn-secondary-dark w-full btn-lg"
                    onClick={resetForgotState}
                    disabled={forgotLoading}
                  >
                    Cancel
                  </button>
                  <button
                    id="forgot-submit-email"
                    type="submit"
                    className="btn btn-primary w-full btn-lg"
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? (
                      <>
                        <div className="spinner spinner-sm" />
                        Sending...
                      </>
                    ) : (
                      <>📩 Send OTP</>
                    )}
                  </button>
                </div>
              </form>
              {renderAuthFooter()}
            </>
          )}

          {/* ── FORGOT PASSWORD: STEP 2 (OTP VERIFICATION) ── */}
          {forgotMode && forgotStep === 2 && (
            <>
              {forgotBannerError && (
                <div className="auth-error-banner">⚠️ {forgotBannerError}</div>
              )}

              <form onSubmit={handleVerifyOtp} className="auth-form" noValidate>
                {/* Target email badge */}
                <div className="target-email-badge">
                  <span>Code sent to: <span className="target-email-text">{forgotEmail}</span></span>
                  <button
                    type="button"
                    className="change-email-btn"
                    onClick={() => {
                      setForgotStep(1);
                      setForgotBannerError('');
                    }}
                  >
                    ✏️ Change
                  </button>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ textAlign: 'center', display: 'block' }}>
                    Enter 6-digit Verification Code
                  </label>
                  <div className="otp-input-grid" onPaste={handleOtpPaste}>
                    {otp.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => (otpInputsRef.current[idx] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        className={`otp-digit-box ${digit ? 'filled' : ''} ${otpError ? 'error' : ''}`}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        autoFocus={idx === 0}
                      />
                    ))}
                  </div>
                  {otpError && (
                    <span className="form-error" style={{ textAlign: 'center', display: 'block', marginTop: '0.4rem' }}>
                      {otpError}
                    </span>
                  )}
                </div>

                {/* Resend OTP Row & 60-Second Cooldown */}
                <div className="resend-otp-container">
                  <span style={{ color: '#64748b' }}>Didn't get the code?</span>
                  {resendCooldown > 0 ? (
                    <span className="resend-cooldown-badge">
                      <span className="cooldown-pulse-dot" />
                      Resend in {resendCooldown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="resend-btn-active"
                      onClick={handleResendOtp}
                      disabled={forgotLoading}
                    >
                      🔄 Resend OTP
                    </button>
                  )}
                </div>

                <div className="auth-btn-row">
                  <button
                    type="button"
                    className="btn btn-secondary-dark w-full btn-lg"
                    onClick={resetForgotState}
                    disabled={forgotLoading}
                  >
                    Cancel
                  </button>
                  <button
                    id="verify-otp-btn"
                    type="submit"
                    className="btn btn-primary w-full btn-lg"
                    disabled={forgotLoading || otp.join('').length !== 6}
                  >
                    {forgotLoading ? (
                      <>
                        <div className="spinner spinner-sm" />
                        Verifying...
                      </>
                    ) : (
                      <>✅ Verify OTP</>
                    )}
                  </button>
                </div>
              </form>
              {renderAuthFooter()}
            </>
          )}

          {/* ── FORGOT PASSWORD: STEP 3 (NEW PASSWORD) ── */}
          {forgotMode && forgotStep === 3 && (
            <>
              {forgotBannerError && (
                <div className="auth-error-banner">⚠️ {forgotBannerError}</div>
              )}

              <form onSubmit={handleResetPassword} className="auth-form" noValidate>
                <div className="form-group">
                  <label className="form-label" htmlFor="forgot-new-password">New Password</label>
                  <div className="password-input-wrapper">
                    <input
                      id="forgot-new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      className={`form-input ${newPasswordError ? 'error' : ''}`}
                      placeholder="At least 6 characters"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (newPasswordError) setNewPasswordError('');
                        if (forgotBannerError) setForgotBannerError('');
                      }}
                      autoComplete="new-password"
                      autoFocus
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      tabIndex={-1}
                      title={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                  </div>
                  {newPasswordError && <span className="form-error">{newPasswordError}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="forgot-confirm-password">Confirm New Password</label>
                  <input
                    id="forgot-confirm-password"
                    type="password"
                    className={`form-input ${confirmPasswordError ? 'error' : ''}`}
                    placeholder="Re-enter your new password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (confirmPasswordError) setConfirmPasswordError('');
                      if (forgotBannerError) setForgotBannerError('');
                    }}
                    autoComplete="new-password"
                  />
                  {confirmPasswordError && <span className="form-error">{confirmPasswordError}</span>}
                </div>

                <div className="auth-btn-row">
                  <button
                    type="button"
                    className="btn btn-secondary-dark w-full btn-lg"
                    onClick={resetForgotState}
                    disabled={forgotLoading}
                  >
                    Cancel
                  </button>
                  <button
                    id="submit-reset-password"
                    type="submit"
                    className="btn btn-primary w-full btn-lg"
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? (
                      <>
                        <div className="spinner spinner-sm" />
                        Updating...
                      </>
                    ) : (
                      <>🔒 Reset Password</>
                    )}
                  </button>
                </div>
              </form>
              {renderAuthFooter()}
            </>
          )}

          {/* ── FORGOT PASSWORD: STEP 4 (SUCCESS) ── */}
          {forgotMode && forgotStep === 4 && (
            <div className="auth-form">
              <div className="auth-success-banner">
                ✅ {forgotSuccess}
              </div>
              <button
                type="button"
                className="btn btn-primary w-full btn-lg"
                style={{ marginTop: '0.75rem' }}
                onClick={switchToLogin}
              >
                🔑 Sign In with New Password
              </button>
            </div>
          )}
        </div>

        <p className="auth-bottom-text">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

