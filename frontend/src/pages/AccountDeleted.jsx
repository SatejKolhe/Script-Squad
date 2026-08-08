import React from 'react';
import { Link } from 'react-router-dom';
import './AccountDeleted.css';

export default function AccountDeleted() {
  return (
    <div className="account-deleted-container">
      <div className="account-deleted-card animate-fadeIn">
        <div className="account-deleted-header">
          <div className="account-deleted-icon-badge">🗑️</div>
          <h1>Account Scheduled for Deletion</h1>
          <p className="account-deleted-subtitle">TaskLoom · 15-Day Grace Period</p>
        </div>

        <div className="account-deleted-body">
          <div className="account-deleted-alert">
            <span className="alert-icon">⏳</span>
            <div>
              <strong>Your account is now deactivated.</strong>
              <p>
                All your data will be retained for <strong>15 days</strong>. You can restore your account at any time within this window by simply logging back in with your credentials.
              </p>
            </div>
          </div>

          <p className="account-deleted-notice">
            After <strong>15 days</strong>, your account, projects, tasks, and all associated personal data will be <strong>permanently and irreversibly deleted</strong> from our servers.
          </p>

          <div className="account-deleted-actions">
            <Link to="/login" className="btn btn-primary btn-lg w-full">
              Return to Sign In →
            </Link>
          </div>
        </div>

        <div className="account-deleted-footer">
          <p>© {new Date().getFullYear()} TaskLoom. Thank you for having been with us.</p>
        </div>
      </div>
    </div>
  );
}
