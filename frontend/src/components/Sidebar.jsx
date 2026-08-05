import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Sidebar.css';

const NAV_ITEMS = [
  {
    to: '/dashboard', label: 'Dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    to: '/projects', label: 'Projects',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 7a2 2 0 012-2h4l2 3h10a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V7z" />
      </svg>
    ),
  },
  {
    to: '/team', label: 'Team',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="7" r="3" /><circle cx="17" cy="7" r="3" />
        <path d="M1 21v-2a5 5 0 015-5h6a5 5 0 015 5v2" /><path d="M17 10a3 3 0 013 3v2h2" />
      </svg>
    ),
  },
  {
    to: '/analytics', label: 'Analytics',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" />
      </svg>
    ),
  },
];

// XP level calculation
function getLevel(xp) {
  return Math.floor((xp || 0) / 100) + 1;
}
function getLevelProgress(xp) {
  return ((xp || 0) % 100);
}

export default function Sidebar({ isOpen, onClose, mobileOpen, setMobileOpen }) {
  const isMobileOpen = isOpen !== undefined ? isOpen : mobileOpen;
  const handleClose = () => {
    onClose?.();
    setMobileOpen?.(false);
  };
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    handleClose();
  };

  const handleProfileClick = () => {
    navigate('/profile');
    handleClose();
  };

  const level = getLevel(user?.xp);
  const levelProgress = getLevelProgress(user?.xp);
  const xp = user?.xp || 0;
  const streak = user?.streak || 0;

  return (
    <aside className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-icon">
          <span>⚡</span>
        </div>

        <div className="logo-text">
          <span className="logo-name">Script Squad</span>
          <span className="logo-tagline">Mission Control</span>
        </div>

      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="nav-section-label">Navigation</div>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={handleClose}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
            {location.pathname.startsWith(item.to) && (
              <span className="nav-active-pip" />
            )}
          </NavLink>
        ))}

        {/* Profile link */}
        <div className="nav-section-label" style={{ marginTop: '0.75rem' }}>Account</div>
        <NavLink
          to="/profile"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={() => onClose?.()}
        >
          <span className="nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </span>
          <span className="nav-label">Profile</span>
        </NavLink>
      </nav>

      {/* XP & Streak Widget */}
      {user && (
        <div className="sidebar-xp-widget">
          <div className="xp-widget-row">
            <div className="xp-level-badge">Lv {level}</div>
            <div className="xp-streak">
              <span className="xp-streak-fire">🔥</span>
              <span className="xp-streak-count">{streak} day{streak !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <div className="xp-bar-wrap">
            <div className="xp-bar-fill" style={{ width: `${levelProgress}%` }} />
          </div>
          <div className="xp-bar-label">{xp} XP · {levelProgress}/100 to Lv {level + 1}</div>
        </div>
      )}

      {/* User Profile */}
      <div className="sidebar-footer">
        {user && (
          <button
            className="sidebar-user sidebar-user-btn"
            onClick={handleProfileClick}
            title="View profile"
          >
            <div className="avatar avatar-sm">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} />
              ) : (
                user.name?.[0]?.toUpperCase()
              )}
            </div>

            <div className="user-info">
              <div className="user-name">{user.name}</div>
              <div className="user-email">{user.email}</div>
            </div>
          </button>
        )}
        <button
          className="logout-btn btn-icon"
          onClick={handleLogout}
          title="Logout"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
