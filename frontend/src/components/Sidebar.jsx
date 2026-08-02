import React, { useState, useEffect, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../contexts/AuthContext';
import QuickAddTask from './QuickAddTask';
import './Sidebar.css';

// XP level calculation
function getLevel(xp) { return Math.floor((xp || 0) / 100) + 1; }
function getLevelProgress(xp) { return ((xp || 0) % 100); }

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [showAddTask, setShowAddTask] = useState(false);
  const [todayCount, setTodayCount] = useState(0);
  const [inboxCount, setInboxCount] = useState(0);
  const [projects, setProjects] = useState([]);

  const fetchCounts = useCallback(async () => {
    try {
      const [todayRes, inboxRes] = await Promise.all([
        api.get('/tasks/today'),
        api.get('/tasks/inbox'),
      ]);
      const todayData = todayRes.data.data || [];
      const inboxData = inboxRes.data.data || [];
      setTodayCount(todayData.filter(t => t.status !== 'done').length);
      setInboxCount(inboxData.filter(t => t.status !== 'done').length);
    } catch {}
  }, []);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await api.get('/projects');
      setProjects((res.data.data || []).slice(0, 5)); // show top 5 projects
    } catch {}
  }, []);

  useEffect(() => {
    fetchCounts();
    fetchProjects();
  }, [fetchCounts, fetchProjects]);

  const handleLogout = () => { logout(); onClose?.(); };
  const handleProfileClick = () => { navigate('/profile'); onClose?.(); };

  const level = getLevel(user?.xp);
  const levelProgress = getLevelProgress(user?.xp);
  const xp = user?.xp || 0;
  const streak = user?.streak || 0;

  const handleTaskAdded = (task) => {
    setShowAddTask(false);
    fetchCounts();
  };

  return (
    <>
      <aside className={`sidebar ${isOpen ? 'mobile-open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="logo-icon"><span>⚡</span></div>
          <div className="logo-text">
            <span className="logo-name">Script Squad</span>
            <span className="logo-tagline">Mission Control</span>
          </div>
        </div>

        {/* Add Task CTA */}
        <div className="sidebar-add-task-wrap">
          {showAddTask ? (
            <div className="sidebar-quick-add">
              <QuickAddTask
                onTaskAdded={handleTaskAdded}
                onCancel={() => setShowAddTask(false)}
                placeholder="Task name"
              />
            </div>
          ) : (
            <button
              className="sidebar-add-task-btn"
              onClick={() => setShowAddTask(true)}
              id="sidebar-add-task"
            >
              <span className="add-task-plus">+</span>
              <span>Add task</span>
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          {/* Views section */}
          <div className="nav-section-label">Views</div>

          <NavLink
            to="/inbox"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => onClose?.()}
          >
            <span className="nav-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
                <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>
              </svg>
            </span>
            <span className="nav-label">Inbox</span>
            {inboxCount > 0 && <span className="nav-badge">{inboxCount}</span>}
          </NavLink>

          <NavLink
            to="/today"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => onClose?.()}
          >
            <span className="nav-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            </span>
            <span className="nav-label">Today</span>
            {todayCount > 0 && <span className="nav-badge nav-badge-red">{todayCount}</span>}
          </NavLink>

          <NavLink
            to="/upcoming"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => onClose?.()}
          >
            <span className="nav-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
                <line x1="8" y1="14" x2="16" y2="14"/>
                <line x1="8" y1="18" x2="12" y2="18"/>
              </svg>
            </span>
            <span className="nav-label">Upcoming</span>
          </NavLink>

          {/* Navigation section */}
          <div className="nav-section-label" style={{ marginTop: '0.75rem' }}>Navigation</div>

          <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => onClose?.()}>
            <span className="nav-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
            </span>
            <span className="nav-label">Dashboard</span>
          </NavLink>

          <NavLink to="/projects" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => onClose?.()}>
            <span className="nav-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 7a2 2 0 012-2h4l2 3h10a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V7z"/>
              </svg>
            </span>
            <span className="nav-label">Projects</span>
          </NavLink>

          <NavLink to="/team" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => onClose?.()}>
            <span className="nav-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="7" r="3"/><circle cx="17" cy="7" r="3"/>
                <path d="M1 21v-2a5 5 0 015-5h6a5 5 0 015 5v2"/><path d="M17 10a3 3 0 013 3v2h2"/>
              </svg>
            </span>
            <span className="nav-label">Team</span>
          </NavLink>

          <NavLink to="/analytics" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => onClose?.()}>
            <span className="nav-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
              </svg>
            </span>
            <span className="nav-label">Analytics</span>
          </NavLink>

          <NavLink to="/wellbeing" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => onClose?.()}>
            <span className="nav-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            </span>
            <span className="nav-label">Wellbeing</span>
          </NavLink>

          {/* My Projects */}
          {projects.length > 0 && (
            <>
              <div className="nav-section-label" style={{ marginTop: '0.75rem' }}>My Projects</div>
              {projects.map(p => (
                <NavLink
                  key={p._id}
                  to={`/projects/${p._id}`}
                  className={({ isActive }) => `nav-item nav-item-project ${isActive ? 'active' : ''}`}
                  onClick={() => onClose?.()}
                >
                  <span className="nav-project-dot" style={{ background: p.color }} />
                  <span className="nav-label">{p.title}</span>
                </NavLink>
              ))}
            </>
          )}

          {/* Resources */}
          <div className="nav-section-label" style={{ marginTop: '0.75rem' }}>Resources</div>
          <NavLink to="/filters-labels" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => onClose?.()}>
            <span className="nav-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
                <line x1="7" y1="7" x2="7.01" y2="7"/>
              </svg>
            </span>
            <span className="nav-label">Filters & Labels</span>
          </NavLink>

          {/* Account */}
          <div className="nav-section-label" style={{ marginTop: '0.75rem' }}>Account</div>
          <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} onClick={() => onClose?.()}>
            <span className="nav-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

        {/* User Profile Footer */}
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
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </aside>
    </>
  );
}
