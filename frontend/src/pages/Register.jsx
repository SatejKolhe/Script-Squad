import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import './Auth.css';

export default function Register() {
  const { register, resendVerification, verifyEmailOtp } = useAuth();
  const navigate = useNavigate();

  // ── Step 1 Form State ─────────────────────────────────────────────────────
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  // ── Step 2 Verification State ─────────────────────────────────────────────
  const [step, setStep] = useState(1); // 1: Register Form, 2: OTP Verification
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMsg, setResendMsg] = useState('');
  const [isVerifiedSuccess, setIsVerifiedSuccess] = useState(false);

  const otpInputsRef = useRef([]);

  // ── Countdown timer for Resend Cooldown ────────────────────────────────────
  useEffect(() => {
    let timer;
    if (step === 2 && resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, resendCooldown]);

  // ── Validation for Step 1 ──────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Full name is required';
    else if (form.name.length < 2) e.name = 'Name must be at least 2 characters';
    if (!form.email) e.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = 'Invalid email address.';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 6) e.password = 'Password must be at least 6 characters';
    if (!form.confirmPassword) e.confirmPassword = 'Please confirm your password';
    else if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    return e;
  };

  // ── Step 1 Submit: Create pending account & send OTP ───────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (Object.keys(v).length) { setErrors(v); return; }
    setErrors({});
    setServerError('');
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      setRegisteredEmail(form.email);
      setStep(2);
      setResendCooldown(60);
      toast.success('Verification code sent to your email!');
      setTimeout(() => otpInputsRef.current[0]?.focus(), 150);
    } catch (err) {
      setServerError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (errors[e.target.name]) setErrors((prev) => ({ ...prev, [e.target.name]: '' }));
  };

  // ── OTP Digit Input Handlers ───────────────────────────────────────────────
  const handleOtpChange = (index, value) => {
    const cleaned = value.replace(/\D/g, '');
    if (otpError) setOtpError('');
    if (resendMsg) setResendMsg('');

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

  // ── Step 2 OTP Submission: Verify OTP Code ────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const enteredOtp = otp.join('');
    if (enteredOtp.length !== 6) {
      setOtpError('Please enter all 6 digits of the verification code');
      return;
    }

    setOtpError('');
    setResendMsg('');
    setVerifyLoading(true);

    try {
      const res = await verifyEmailOtp(registeredEmail, enteredOtp);
      toast.success(res.message || 'Email verified successfully! 🎉');
      setIsVerifiedSuccess(true);
    } catch (err) {
      setOtpError(err.response?.data?.message || 'Invalid or expired verification code');
    } finally {
      setVerifyLoading(false);
    }
  };

  // ── Resend Verification Code ───────────────────────────────────────────────
  const handleResend = async () => {
    if (resendCooldown > 0 || resendLoading) return;
    setResendLoading(true);
    setResendMsg('');
    setOtpError('');

    try {
      const res = await resendVerification(registeredEmail);
      toast.success('New verification code sent! Check your inbox.');
      setResendMsg(res.message || 'Verification code resent!');
      setOtp(['', '', '', '', '', '']);
      setResendCooldown(60);
      setTimeout(() => otpInputsRef.current[0]?.focus(), 150);
    } catch (err) {
      setResendMsg(err.response?.data?.message || 'Could not resend code. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  // ── Render Step 2: 2-Step OTP Verification Screen ──────────────────────────
  if (step === 2) {
    return (
      <div className="auth-page">
        <div className="auth-bg">
          <div className="auth-orb orb-1" />
          <div className="auth-orb orb-2" />
          <div className="auth-orb orb-3" />
        </div>

        <div className="auth-container">
          <div className="auth-logo">
            <div className="auth-logo-icon">⚡</div>
            <div>
              <h1 className="auth-logo-name">TaskLoom</h1>
              <p className="auth-logo-tagline">Work Smarter Together</p>
            </div>
          </div>

          <div className="auth-card card-glass">
            {isVerifiedSuccess ? (
              // ── Verified Success View ──
              <div className="auth-form" style={{ textAlign: 'center', gap: '1.25rem' }}>
                <div style={{ fontSize: '3.5rem', margin: '0.5rem 0 0' }}>🎉</div>
                <div className="auth-card-header" style={{ padding: 0 }}>
                  <h2 className="auth-title">Email Verified!</h2>
                  <p className="auth-subtitle">
                    Your account is active. You can now log in to access your workspace.
                  </p>
                </div>

                <div className="auth-success-banner" style={{ margin: 0 }}>
                  ✅ Account activated successfully!
                </div>

                <button
                  type="button"
                  className="btn btn-primary w-full btn-lg"
                  onClick={() => navigate('/login')}
                >
                  🔑 Sign in to Script Squad →
                </button>
              </div>
            ) : (
              // ── Step 2 OTP Form View ──
              <>
                <div className="auth-card-header">
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔐</div>
                  <h2 className="auth-title">2-Step Email Verification</h2>
                  <p className="auth-subtitle">
                    We sent a 6-digit verification code to<br />
                    <strong style={{ color: '#818cf8' }}>{registeredEmail}</strong>
                  </p>
                </div>

                {/* Target email badge with change button */}
                <div className="target-email-badge">
                  <span>Code sent to: <span className="target-email-text">{registeredEmail}</span></span>
                  <button
                    type="button"
                    className="change-email-btn"
                    onClick={() => {
                      setStep(1);
                      setServerError('');
                    }}
                  >
                    ✏️ Change
                  </button>
                </div>

                <form onSubmit={handleVerifyOtp} className="auth-form" noValidate>
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
                    <span style={{ color: '#64748b' }}>Didn't receive the code?</span>
                    {resendCooldown > 0 ? (
                      <span className="resend-cooldown-badge">
                        <span className="cooldown-pulse-dot" />
                        Resend in {resendCooldown}s
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="resend-btn-active"
                        onClick={handleResend}
                        disabled={resendLoading}
                      >
                        {resendLoading ? 'Sending...' : '🔄 Resend Code'}
                      </button>
                    )}
                  </div>

                  {resendMsg && (
                    <div
                      className={
                        resendMsg.toLowerCase().includes('could not') || resendMsg.toLowerCase().includes('wait')
                          ? 'auth-error-banner'
                          : 'auth-success-banner'
                      }
                      style={{ margin: 0 }}
                    >
                      {resendMsg}
                    </div>
                  )}

                  <button
                    id="verify-register-otp-btn"
                    type="submit"
                    className="btn btn-primary w-full btn-lg"
                    disabled={verifyLoading || otp.join('').length !== 6}
                  >
                    {verifyLoading ? (
                      <>
                        <div className="spinner spinner-sm" />
                        Verifying...
                      </>
                    ) : (
                      <>✅ Confirm & Activate Account</>
                    )}
                  </button>
                </form>

                <p style={{ color: '#8b95ae', fontSize: '0.825rem', textAlign: 'center', marginTop: '1rem' }}>
                  💡 You can also click the verification link sent to your email.
                </p>

                <div className="auth-footer">
                  <p>
                    Already verified?{' '}
                    <Link to="/login" className="auth-link">Sign in →</Link>
                  </p>
                </div>
              </>
            )}
          </div>

          <p className="auth-bottom-text">
            Script Squad · 2-Step Authentication & Email Verification
          </p>
        </div>
      </div>
    );
  }

  // ── Render Step 1: Registration Details Form ───────────────────────────────
  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-orb orb-1" />
        <div className="auth-orb orb-2" />
        <div className="auth-orb orb-3" />
      </div>

      <div className="auth-container">
        <div className="auth-logo">
          <div className="auth-logo-icon">⚡</div>
          <div>
            <h1 className="auth-logo-name">TaskLoom</h1>
            <p className="auth-logo-tagline">Work Smarter Together</p>
          </div>
        </div>

        <div className="auth-card card-glass">
          <div className="auth-card-header">
            <h2 className="auth-title">Create your account</h2>
            <p className="auth-subtitle">Join Script Squad — Step 1 of 2</p>
          </div>

          {serverError && (
            <div className="auth-error-banner">⚠️ {serverError}</div>
          )}

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="reg-name">Full name</label>
              <input
                id="reg-name"
                type="text"
                name="name"
                className={`form-input ${errors.name ? 'error' : ''}`}
                placeholder="John Doe"
                value={form.name}
                onChange={handleChange}
                autoComplete="name"
                autoFocus
              />
              {errors.name && <span className="form-error">{errors.name}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-email">Email address</label>
              <input
                id="reg-email"
                type="email"
                name="email"
                className={`form-input ${errors.email ? 'error' : ''}`}
                placeholder="you@example.com"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
              />
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-password">Password</label>
              <input
                id="reg-password"
                type="password"
                name="password"
                className={`form-input ${errors.password ? 'error' : ''}`}
                placeholder="Min. 6 characters"
                value={form.password}
                onChange={handleChange}
                autoComplete="new-password"
              />
              {errors.password && <span className="form-error">{errors.password}</span>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="reg-confirm">Confirm password</label>
              <input
                id="reg-confirm"
                type="password"
                name="confirmPassword"
                className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
                placeholder="••••••••"
                value={form.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
              />
              {errors.confirmPassword && <span className="form-error">{errors.confirmPassword}</span>}
            </div>

            <button
              id="register-submit"
              type="submit"
              className="btn btn-primary w-full btn-lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="spinner spinner-sm" />
                  Verifying email domain...
                </>
              ) : (
                <>🚀 Next: Send Verification Code →</>
              )}
            </button>
          </form>

          <div className="auth-footer">
            <p>
              Already have an account?{' '}
              <Link to="/login" className="auth-link">Sign in →</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
