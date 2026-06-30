import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Sidebar.css';

const NAV_ITEMS = [
  { to: '/dashboard', icon: '⊞', label: 'Dashboard' },
  { to: '/projects', icon: '📁', label: 'Projects' },
  { to: '/analytics', icon: '📊', label: 'Analytics' },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-icon">
          <span>⚡</span>
        </div>
        {!collapsed && (
          <div className="logo-text">
            <span className="logo-name">Script Squad</span>
            <span className="logo-tagline">Work Smarter</span>
          </div>
        )}
        <button className="collapse-btn btn-icon" onClick={() => setCollapsed(!collapsed)} title="Toggle sidebar">
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="nav-section-label">{!collapsed && 'Menu'}</div>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            title={collapsed ? item.label : ''}
          >
            <span className="nav-icon">{item.icon}</span>
            {!collapsed && <span className="nav-label">{item.label}</span>}
            {!collapsed && location.pathname.startsWith(item.to) && (
              <span className="nav-active-dot" />
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Profile */}
      <div className="sidebar-footer">
        {user && (
          <div className="sidebar-user">
            <div className="avatar avatar-sm">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} />
              ) : (
                user.name?.[0]?.toUpperCase()
              )}
            </div>
            {!collapsed && (
              <div className="user-info">
                <div className="user-name">{user.name}</div>
                <div className="user-email">{user.email}</div>
              </div>
            )}
          </div>
        )}
        <button
          className="logout-btn btn-icon"
          onClick={logout}
          title="Logout"
        >
          🚪
        </button>
      </div>
    </aside>
  );
}
