import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import GlobalSearch from './GlobalSearch';
import './Navbar.css';

const PAGE_TITLES = {
  '/dashboard':      { title: 'Dashboard',       subtitle: 'Overview of your work' },
  '/inbox':          { title: 'Inbox',            subtitle: 'Your catch-all task list' },
  '/today':          { title: 'Today',            subtitle: 'Tasks due today' },
  '/upcoming':       { title: 'Upcoming',         subtitle: 'Tasks in the next 7 days' },
  '/filters-labels': { title: 'Filters & Labels', subtitle: 'Organize with filters and labels' },
  '/projects':       { title: 'Projects',         subtitle: 'Manage all your projects' },
  '/analytics':      { title: 'Analytics',        subtitle: 'Insights & productivity trends' },
  '/team':           { title: 'Team',             subtitle: 'Track who\'s working on what' },
  '/wellbeing':      { title: 'Wellbeing',        subtitle: 'Monitor your digital habits' },
  '/profile':        { title: 'Profile',          subtitle: 'Your account & achievements' },
};

export default function Navbar({ onMenuToggle }) {
  const { toggleTheme, isDark } = useTheme();
  const { user } = useAuth();
  const location = useLocation();

  // Match the most specific route first (longest key that is a prefix of pathname)
  const pageKey = Object.keys(PAGE_TITLES)
    .filter((k) => location.pathname === k || location.pathname.startsWith(k + '/'))
    .sort((a, b) => b.length - a.length)[0] || '/dashboard';

  const { title, subtitle } = PAGE_TITLES[pageKey] || { title: 'Script Squad', subtitle: '' };

  return (
    <header className="navbar">
      {/* Mobile hamburger */}
      <button
        id="sidebar-toggle"
        className="hamburger-btn btn-icon"
        onClick={onMenuToggle}
        aria-label="Toggle sidebar"
        title="Toggle menu"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <div className="navbar-left">
        <div>
          <h1 className="navbar-title">{title}</h1>
          {subtitle && <p className="navbar-subtitle">{subtitle}</p>}
        </div>
      </div>

      <div className="navbar-right">
        {/* Global Search */}
        <GlobalSearch />

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
