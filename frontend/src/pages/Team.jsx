import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import './Team.css';

// ── Avatar helper ─────────────────────────────────────────────────────────────
function MemberAvatar({ user, size = 48, showActiveDot = false }) {
  const initials = user?.name
    ?.split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="member-avatar-wrap" style={{ width: size, height: size }}>
      <div className="member-avatar" style={{ width: size, height: size, fontSize: size * 0.35 }}>
        {user?.avatar ? (
          <img src={user.avatar} alt={user.name} />
        ) : (
          initials
        )}
      </div>
      {showActiveDot && <span className="member-active-dot" />}
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────
function TeamSkeleton() {
  return (
    <div className="team-skeleton-grid">
      {[1, 2, 3].map((i) => (
        <div key={i} className="team-skeleton-card">
          <div className="flex items-center gap-3">
            <div className="skeleton" style={{ width: 48, height: 48, borderRadius: '50%' }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton" style={{ height: 14, width: '60%', marginBottom: 8, borderRadius: 6 }} />
              <div className="skeleton" style={{ height: 11, width: '40%', borderRadius: 6 }} />
            </div>
          </div>
          <div className="skeleton" style={{ height: 64, borderRadius: 10 }} />
          <div className="skeleton" style={{ height: 36, borderRadius: 8 }} />
        </div>
      ))}
    </div>
  );
}

// ── Member Card ───────────────────────────────────────────────────────────────
function MemberCard({ memberData, onRemove }) {
  const { user, stats, inProgressTasks, projects } = memberData;
  const isActive = inProgressTasks && inProgressTasks.length > 0;
  const navigate = useNavigate();

  return (
    <div className="member-card animate-bounceIn">
      <div className="member-card-strip" />
      <div className="member-card-body">

        {/* Identity */}
        <div 
          className="member-identity" 
          onClick={() => navigate(`/team/${user._id}`)}
          style={{ cursor: 'pointer' }}
          title="View Profile"
        >
          <MemberAvatar user={user} size={48} showActiveDot={isActive} />
          <div className="member-info">
            <div className="member-name" style={{ color: 'var(--primary-color)' }}>{user.name}</div>
            <div className="member-email">{user.email}</div>
          </div>
          <button
            className="member-remove-btn"
            onClick={(e) => { e.stopPropagation(); onRemove(user._id, user.name); }}
            title="Remove from team"
          >
            ✕ Remove
          </button>
        </div>

        {/* Task Stats */}
        <div className="member-stats">
          <div className="member-stat">
            <span className="member-stat-num todo">{stats.todo}</span>
            <span className="member-stat-label">Todo</span>
          </div>
          <div className="member-stat">
            <span className="member-stat-num inprog">{stats.inprogress}</span>
            <span className="member-stat-label">In Progress</span>
          </div>
          <div className="member-stat">
            <span className="member-stat-num done">{stats.done}</span>
            <span className="member-stat-label">Done</span>
          </div>
        </div>

        {/* Active Tasks */}
        <div className="member-active-section">
          <div className="member-section-title">
            {isActive ? '🚀 Currently working on' : '💤 Current work'}
          </div>
          {isActive ? (
            inProgressTasks.slice(0, 3).map((task) => (
              <div key={task._id} className="member-active-task">
                <span className="member-task-dot" />
                <span className="member-task-name">{task.title}</span>
                {task.project && (
                  <span
                    className="member-task-project"
                    style={{
                      background: task.project.color + '22',
                      color: task.project.color,
                    }}
                  >
                    {task.project.title}
                  </span>
                )}
              </div>
            ))
          ) : (
            <span className="member-idle">No active tasks right now</span>
          )}
          {inProgressTasks && inProgressTasks.length > 3 && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', paddingLeft: '0.5rem' }}>
              +{inProgressTasks.length - 3} more task{inProgressTasks.length - 3 > 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Projects */}
        {projects && projects.length > 0 && (
          <div>
            <div className="member-section-title">📁 Projects</div>
            <div className="member-projects">
              {projects.slice(0, 6).map((p) => (
                <span key={p._id} className="member-project-chip">
                  <span
                    className="member-project-chip-dot"
                    style={{ background: p.color }}
                  />
                  {p.title}
                </span>
              ))}
              {projects.length > 6 && (
                <span className="member-project-chip">+{projects.length - 6} more</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Add Member Panel ──────────────────────────────────────────────────────────
function AddMemberPanel({ onMemberAdded }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState(null); // userId being added
  const dropdownRef = useRef(null);
  const searchTimer = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setResults([]);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = (value) => {
    setQuery(value);
    clearTimeout(searchTimer.current);
    if (value.trim().length < 2) { setResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get(`/team/search?q=${encodeURIComponent(value.trim())}`);
        setResults(res.data.data);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
  };

  const handleAdd = async (user) => {
    setAdding(user._id);
    try {
      await api.post('/team/members', { email: user.email });
      toast.success(`${user.name} added to your team! 🎉`);
      setResults([]);
      setQuery('');
      onMemberAdded();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add member');
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="add-member-card">
      <div className="add-member-title">
        <span>➕</span> Add Team Member
      </div>
      <div className="add-member-search-wrap" ref={dropdownRef}>
        <div className="add-member-input-row">
          <input
            id="team-member-search"
            type="text"
            className="form-input"
            placeholder="Search by name or email..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            autoComplete="off"
          />
          {searching && (
            <div style={{ display: 'flex', alignItems: 'center', paddingRight: '0.5rem' }}>
              <div className="spinner spinner-sm" />
            </div>
          )}
        </div>

        {results.length > 0 && (
          <div className="search-results-dropdown">
            {results.map((user) => (
              <div key={user._id} className="search-result-item">
                <div className="member-avatar" style={{ width: 36, height: 36, fontSize: 13, flexShrink: 0 }}>
                  {user.avatar ? <img src={user.avatar} alt={user.name} /> : user.name?.[0]?.toUpperCase()}
                </div>
                <div className="search-result-info">
                  <div className="search-result-name">{user.name}</div>
                  <div className="search-result-email">{user.email}</div>
                </div>
                <button
                  className="search-result-add-btn"
                  onClick={() => handleAdd(user)}
                  disabled={adding === user._id}
                >
                  {adding === user._id ? '...' : '+ Add'}
                </button>
              </div>
            ))}
          </div>
        )}

        {!searching && query.trim().length >= 2 && results.length === 0 && (
          <div className="search-results-dropdown">
            <div className="search-no-results">
              No users found matching "<strong>{query}</strong>"
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Team Page ────────────────────────────────────────────────────────────
export default function Team() {
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadActivity = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/team/activity');
      setActivity(res.data.data);
    } catch {
      toast.error('Failed to load team data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadActivity();
  }, [loadActivity]);

  const handleRemove = async (userId, name) => {
    if (!window.confirm(`Remove ${name} from your team?`)) return;
    try {
      await api.delete(`/team/members/${userId}`);
      toast.success(`${name} removed from your team`);
      setActivity((prev) => prev.filter((m) => m.user._id !== userId));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove member');
    }
  };

  const activeCount = activity.filter((m) => m.inProgressTasks?.length > 0).length;

  return (
    <div className="page-container animate-fadeIn">
      {/* Header */}
      <div className="team-header">
        <div className="team-header-info">
          <h1>Team</h1>
          <p>Track who's working on what, in real time</p>
          {!loading && (
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
              <span className="team-count-badge">
                👥 {activity.length} member{activity.length !== 1 ? 's' : ''}
              </span>
              {activeCount > 0 && (
                <span className="team-count-badge" style={{
                  background: 'rgba(16,185,129,0.1)',
                  borderColor: 'rgba(16,185,129,0.25)',
                  color: '#10b981',
                }}>
                  🚀 {activeCount} active now
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add Member */}
      <AddMemberPanel onMemberAdded={loadActivity} />

      {/* Member Cards */}
      {loading ? (
        <TeamSkeleton />
      ) : activity.length === 0 ? (
        <div className="team-empty">
          <div className="team-empty-icon">👥</div>
          <div className="team-empty-title">Your team is empty</div>
          <p className="team-empty-desc">
            Search for teammates above by name or email to add them. Once added, you'll see
            which projects and tasks they're working on right now.
          </p>
        </div>
      ) : (
        <div className="team-grid">
          {activity.map((memberData) => (
            <MemberCard
              key={memberData.user._id}
              memberData={memberData}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}
    </div>
  );
}
