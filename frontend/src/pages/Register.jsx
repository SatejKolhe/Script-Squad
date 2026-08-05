import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Auth.css';

export default function Register() {
  const { register, resendVerification } = useAuth();

  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  // After successful registration, show "check inbox" screen instead of navigating
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState('');

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const v = validate();
    if (Object.keys(v).length) { setErrors(v); return; }
    setErrors({});
    setServerError('');
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      // Move to "check your inbox" state — no dashboard redirect
      setRegisteredEmail(form.email);
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

  const handleResend = async () => {
    setResendLoading(true);
    setResendMsg('');
    try {
      const res = await resendVerification(registeredEmail);
      setResendMsg(res.message || 'Verification email resent!');
    } catch (err) {
      setResendMsg(err.response?.data?.message || 'Could not resend. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  // ── "Check your inbox" screen ──────────────────────────────────────────────
  if (registeredEmail) {
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
              <h1 className="auth-logo-name">Script Squad</h1>
              <p className="auth-logo-tagline">Work Smarter Together</p>
            </div>
          </div>

          <div className="auth-card card-glass">
            <div className="auth-card-header">
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📬</div>
              <h2 className="auth-title">Check your inbox!</h2>
              <p className="auth-subtitle">
                We sent a verification link to<br />
                <strong style={{ color: '#818cf8' }}>{registeredEmail}</strong>
              </p>
            </div>

            <div className="auth-form" style={{ gap: '1rem' }}>
              <div className="auth-success-banner" style={{ margin: 0 }}>
                ✅ Account created! Click the link in the email to activate your account.
                The link expires in <strong>30 minutes</strong>.
              </div>

              <p style={{ color: '#8b95ae', fontSize: '0.85rem', textAlign: 'center', margin: 0 }}>
                Don't see it? Check your spam/junk folder.
              </p>

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
                id="resend-verification-btn"
                type="button"
                className="btn btn-primary w-full"
                onClick={handleResend}
                disabled={resendLoading}
              >
                {resendLoading ? (
                  <><div className="spinner spinner-sm" /> Resending...</>
                ) : (
                  <>📧 Resend verification email</>
                )}
              </button>
            </div>

            <div className="auth-footer">
              <p>
                Already verified?{' '}
                <Link to="/login" className="auth-link">Sign in →</Link>
              </p>
            </div>
          </div>

          <p className="auth-bottom-text">
            By creating an account, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    );
  }

  // ── Registration form ──────────────────────────────────────────────────────
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
            <h1 className="auth-logo-name">Script Squad</h1>
            <p className="auth-logo-tagline">Work Smarter Together</p>
          </div>
        </div>

        <div className="auth-card card-glass">
          <div className="auth-card-header">
            <h2 className="auth-title">Create your account</h2>
            <p className="auth-subtitle">Join Script Squad and start working smarter</p>
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
                  Creating account...
                </>
              ) : (
                <>🚀 Create Account</>
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
