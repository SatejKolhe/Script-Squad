import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import './Navbar.css';

const PAGE_TITLES = {
  '/dashboard':  { title: 'Dashboard',   subtitle: 'Overview of your work' },
  '/projects':   { title: 'Projects',    subtitle: 'Manage all your projects' },
  '/analytics':  { title: 'Analytics',   subtitle: 'Insights & productivity trends' },
  '/team':       { title: 'Team',        subtitle: "Track who's working on what" },
  '/profile':    { title: 'Profile',     subtitle: 'Your account & achievements' },
};

export default function Navbar({ onMenuToggle, setMobileOpen }) {
  const { theme, toggleTheme, isDark } = useTheme();
  const { user } = useAuth();
  const location = useLocation();

  // Match the most specific route first (longest key that is a prefix of pathname)
  const pageKey = Object.keys(PAGE_TITLES)
    .filter((k) => location.pathname === k || location.pathname.startsWith(k + '/'))
    .sort((a, b) => b.length - a.length)[0] || '/dashboard';

  const { title, subtitle } = PAGE_TITLES[pageKey] || { title: 'Script Squad', subtitle: '' };

  return (
    <header className="navbar">

      <div className="navbar-left">
        <button
          className="mobile-menu-btn btn-icon"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          ☰
        </button>
        <div>
          <h1 className="navbar-title">{title}</h1>
          {subtitle && <p className="navbar-subtitle">{subtitle}</p>}
        </div>
      </div>

      <div className="navbar-right">
        {/* Date display */}
        <div className="navbar-date">
          {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </div>

        {/* Theme toggle */}
        <button
          id="theme-toggle"
          className="theme-toggle btn-icon"
          onClick={toggleTheme}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label="Toggle theme"
        >
          <span className="theme-icon">{isDark ? '☀️' : '🌙'}</span>
        </button>

        {/* User avatar — links to profile */}
        {user && (
          <Link to="/profile" className="navbar-avatar avatar" title="View profile">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} />
            ) : (
              user.name?.[0]?.toUpperCase()
            )}
          </Link>
        )}
      </div>
    </header>
  );
}
