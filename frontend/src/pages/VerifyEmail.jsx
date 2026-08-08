import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { api } from '../contexts/AuthContext';
import './Auth.css';

export default function VerifyEmail() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    let timer;

    async function verify() {
      try {
        const res = await api.get(`/auth/verify-email/${token}`);
        if (!cancelled) {
          setStatus('success');
          setMessage(res.data.message || 'Email verified successfully!');
          timer = setTimeout(() => {
            navigate('/login', {
              state: { message: 'Email verified successfully! Please sign in to access your workspace.' },
            });
          }, 1800);
        }
      } catch (err) {
        if (!cancelled) {
          setStatus('error');
          setMessage(
            err.response?.data?.message ||
            'Verification failed. The link may be invalid or expired.'
          );
        }
      }
    }

    verify();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [token, navigate]);

  return (
    <div className="auth-page">
      <div className="auth-split-wrapper">
        {/* Left Column (50%): Warm Slate Off-White Panel */}
        <div className="auth-branding-panel">
          <div className="auth-branding-header">
            <Link to="/" className="landing-logo">
              <div className="landing-logo-icon">⚡</div>
              <span className="landing-logo-name">TaskLoom</span>
            </Link>
          </div>

          <div className="auth-branding-content">
            <h2 className="branding-headline">
              TaskLoom is where focused teams organize daily priorities.
            </h2>
            <p className="branding-sub">
              Plan tasks, track progress in real-time, and build lasting momentum with zero clutter.
            </p>

            <div className="branding-features-list">
              <div className="branding-feature-item">
                <span className="branding-feature-icon">🎯</span>
                <div>
                  <strong>Focused Task Tracking</strong>
                  <p>Prioritize by due dates, status, and project targets.</p>
                </div>
              </div>
              <div className="branding-feature-item">
                <span className="branding-feature-icon">⚡</span>
                <div>
                  <strong>Real-Time Sync</strong>
                  <p>Instant status & activity updates across devices.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="auth-branding-footer">
            <p className="branding-tagline">© {new Date().getFullYear()} TaskLoom · Built for focus</p>
          </div>
        </div>

        {/* Right Column (50%): Form Panel */}
        <div className="auth-form-panel">
          <div className="auth-card">
            <div className="auth-card-header">
              {status === 'loading' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                    <div className="spinner spinner-lg" />
                  </div>
                  <h2 className="auth-title">Verifying your email…</h2>
                  <p className="auth-subtitle">Please wait a moment while we activate your account.</p>
                </>
              )}

              {status === 'success' && (
                <>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎉</div>
                  <h2 className="auth-title">Email verified!</h2>
                  <p className="auth-subtitle">Your account is active. Redirecting to workspace...</p>
                </>
              )}

              {status === 'error' && (
                <>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>❌</div>
                  <h2 className="auth-title">Verification failed</h2>
                  <p className="auth-subtitle">The link may be invalid or expired.</p>
                </>
              )}
            </div>

            {status !== 'loading' && (
              <div className="auth-form" style={{ gap: '1rem' }}>
                <div className={status === 'success' ? 'auth-success-banner' : 'auth-error-banner'} style={{ margin: 0 }}>
                  {status === 'success' ? '✅' : '⚠️'} {message}
                </div>

                {status === 'success' && (
                  <Link to="/login" className="btn btn-primary w-full btn-lg" style={{ textDecoration: 'none', textAlign: 'center' }}>
                    Sign in to TaskLoom →
                  </Link>
                )}

                {status === 'error' && (
                  <Link to="/login" className="btn btn-primary w-full btn-lg" style={{ textDecoration: 'none', textAlign: 'center' }}>
                    Go to Login to resend verification
                  </Link>
                )}
              </div>
            )}

            <div className="auth-footer">
              <p>
                Need help?{' '}
                <Link to="/" className="auth-link">Back to home</Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
