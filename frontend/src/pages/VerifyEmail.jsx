import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../contexts/AuthContext';
import './Auth.css';

export default function VerifyEmail() {
  const { token } = useParams();
  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      try {
        const res = await api.get(`/auth/verify-email/${token}`);
        if (!cancelled) {
          setStatus('success');
          setMessage(res.data.message || 'Email verified successfully!');
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
    return () => { cancelled = true; };
  }, [token]);

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
            {status === 'loading' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                  <div className="spinner spinner-lg" />
                </div>
                <h2 className="auth-title">Verifying your email…</h2>
                <p className="auth-subtitle">Please wait a moment.</p>
              </>
            )}

            {status === 'success' && (
              <>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎉</div>
                <h2 className="auth-title">Email verified!</h2>
                <p className="auth-subtitle">Your account is now active.</p>
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
                  🔑 Sign in to Script Squad →
                </Link>
              )}

              {status === 'error' && (
                <Link to="/login" className="btn btn-primary w-full btn-lg" style={{ textDecoration: 'none', textAlign: 'center' }}>
                  📧 Go to Login to resend verification
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

        <p className="auth-bottom-text">
          Script Squad · Email Verification
        </p>
      </div>
    </div>
  );
}
