import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth, api } from '../contexts/AuthContext';
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
    to: '/inbox', label: 'Inbox', badgeKey: 'inbox',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />
      </svg>
    ),
  },
  {
    to: '/today', label: 'Today', badgeKey: 'today',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    to: '/upcoming', label: 'Upcoming',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    to: '/search', label: 'Search',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
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
    to: '/org-teams', label: 'Team',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
      </svg>
    ),
  },
  {
    to: '/team', label: 'Friends',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="7" r="3" /><circle cx="17" cy="7" r="3" />
        <path d="M1 21v-2a5 5 0 015-5h6a5 5 0 015 5v2" /><path d="M17 10a3 3 0 013 3v2h2" />
      </svg>
    ),
  },
  {
    to: '/chat', label: 'Chat', badgeKey: 'chat',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
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
  const [badges, setBadges] = useState({ inbox: 0, today: 0, chat: 0 });

  // Fetch badge counts
  useEffect(() => {
    if (!user) return;
    const fetchBadges = async () => {
      try {
        const [inboxRes, todayRes, chatRes] = await Promise.all([
          api.get('/inbox/counts').catch(() => ({ data: { data: { invites: 0 } } })),
          api.get('/tasks/today/count').catch(() => ({ data: { data: 0 } })),
          api.get('/chat/unread-count').catch(() => ({ data: { data: 0 } })),
        ]);
        setBadges({
          inbox: inboxRes.data.data?.invites || 0,
          today: todayRes.data.data || 0,
          chat: chatRes.data.data || 0,
        });
      } catch { }
    };
    fetchBadges();
    const interval = setInterval(fetchBadges, 30000);
    return () => clearInterval(interval);
  }, [user]);

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
      <div className="sidebar-logo">
        <div className="logo-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
        </div>
        <div className="logo-text">
          <span className="logo-name">TaskLoom</span>
          <span className="logo-tagline">Mission Control</span>
        </div>
      </div>

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
            {item.badgeKey && badges[item.badgeKey] > 0 && (
              <span className="nav-badge">{badges[item.badgeKey]}</span>
            )}
            {location.pathname.startsWith(item.to) && (
              <span className="nav-active-pip" />
            )}
          </NavLink>
        ))}

        <div className="nav-section-label" style={{ marginTop: '0.75rem' }}>Account</div>
        <NavLink
          to="/profile"
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          onClick={() => onClose?.()}
        >
          <span className="nav-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </span>
          <span className="nav-label">Profile</span>
        </NavLink>
      </nav>

      {user && (
        <div className="sidebar-xp-widget">
          <div className="xp-widget-row">
            <div className="xp-level-badge">Lv {level}</div>
            <div className="xp-streak">
              <span className="xp-streak-fire">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#d97706' }}>
                  <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"/>
                </svg>
              </span>
              <span className="xp-streak-count">{streak} day{streak !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <div className="xp-bar-wrap">
            <div className="xp-bar-fill" style={{ width: `${levelProgress}%` }} />
          </div>
          <div className="xp-bar-label">{xp} XP · {levelProgress}/100 to Lv {level + 1}</div>
        </div>
      )}

      <div className="sidebar-footer">
        {user && (
          <button className="sidebar-user sidebar-user-btn" onClick={handleProfileClick} title="View profile">
            <div className="avatar avatar-sm">
              {user.avatar ? <img src={user.avatar} alt={user.name} /> : user.name?.[0]?.toUpperCase()}
            </div>
            <div className="user-info">
              <div className="user-name">{user.name}</div>
              <div className="user-email">{user.email}</div>
            </div>
          </button>
        )}
        <button className="logout-btn btn-icon" onClick={handleLogout} title="Logout">
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
