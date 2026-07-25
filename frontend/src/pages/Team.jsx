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

// ── Assign Task Panel ─────────────────────────────────────────────────────────
const PRIORITY_OPTS = ['low', 'medium', 'high'];
const STATUS_LABELS = { todo: 'To Do', inprogress: 'In Progress', done: 'Done' };
const STATUS_COLORS = { todo: '#8b95ae', inprogress: '#6366f1', done: '#10b981' };

function AssignTaskPanel({ members, onTaskAssigned }) {
  const [form, setForm] = useState({
    assigneeId: '',
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [assignedTasks, setAssignedTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const loadAssignedTasks = useCallback(async () => {
    setLoadingTasks(true);
    try {
      const res = await api.get('/team/assigned-tasks');
      setAssignedTasks(res.data.data);
    } catch {
      // silently fail
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  useEffect(() => {
    loadAssignedTasks();
  }, [loadAssignedTasks]);

  const handleChange = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.assigneeId) { toast.error('Please select a team member'); return; }
    if (!form.title.trim()) { toast.error('Task title is required'); return; }
    setSubmitting(true);
    try {
      await api.post('/team/assign-task', {
        assigneeId: form.assigneeId,
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
        dueDate: form.dueDate || null,
      });
      toast.success('Task assigned successfully! 🎯');
      setForm({ assigneeId: '', title: '', description: '', priority: 'medium', dueDate: '' });
      onTaskAssigned();
      loadAssignedTasks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign task');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const res = await api.patch(`/team/assigned-tasks/${taskId}/status`, { status: newStatus });
      setAssignedTasks((prev) => prev.map((t) => (t._id === taskId ? res.data.data : t)));
      toast.success('Task status updated');
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (taskId, title) => {
    if (!window.confirm(`Delete task "${title}"?`)) return;
    try {
      await api.delete(`/team/assigned-tasks/${taskId}`);
      setAssignedTasks((prev) => prev.filter((t) => t._id !== taskId));
      toast.success('Task deleted');
    } catch {
      toast.error('Failed to delete task');
    }
  };

  // Filtered task list
  const filtered = assignedTasks.filter((t) => {
    const matchAssignee = filterAssignee === 'all' || t.assignee?._id === filterAssignee;
    const matchStatus = filterStatus === 'all' || t.status === filterStatus;
    return matchAssignee && matchStatus;
  });

  const isOverdue = (dueDate) => dueDate && new Date(dueDate) < new Date() ;
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null;

  return (
    <div className="assign-panel">
      {/* ── Section header ── */}
      <div className="assign-panel-header">
        <div className="assign-panel-title-row">
          <div className="assign-panel-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <polyline points="16 11 18 13 22 9"/>
            </svg>
          </div>
          <div>
            <h2 className="assign-panel-title">Leader Assignment</h2>
            <p className="assign-panel-sub">Assign tasks with deadlines to your team members</p>
          </div>
        </div>
        <div className="assign-panel-stats">
          <span className="assign-stat-pill">
            <span className="assign-stat-dot" style={{ background: '#6366f1' }} />
            {assignedTasks.filter(t => t.status === 'inprogress').length} Active
          </span>
          <span className="assign-stat-pill">
            <span className="assign-stat-dot" style={{ background: '#ef4444' }} />
            {assignedTasks.filter(t => isOverdue(t.dueDate) && t.status !== 'done').length} Overdue
          </span>
          <span className="assign-stat-pill">
            <span className="assign-stat-dot" style={{ background: '#10b981' }} />
            {assignedTasks.filter(t => t.status === 'done').length} Done
          </span>
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div className="assign-layout">
        {/* ── Left: form ── */}
        <div className="assign-form-col">
          <div className="assign-form-card">
            <div className="assign-form-card-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
              New Assignment
            </div>
            {members.length === 0 ? (
              <div className="assign-no-members">
                <span>👥</span>
                <p>Add team members first to start assigning tasks.</p>
              </div>
            ) : (
              <form className="assign-form" onSubmit={handleSubmit}>
                {/* Assignee */}
                <div className="form-group">
                  <label className="form-label">Assign to *</label>
                  <select
                    className="form-select"
                    value={form.assigneeId}
                    onChange={(e) => handleChange('assigneeId', e.target.value)}
                    required
                  >
                    <option value="">— Select teammate —</option>
                    {members.map((m) => (
                      <option key={m.user._id} value={m.user._id}>
                        {m.user.name} ({m.user.email})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Title */}
                <div className="form-group">
                  <label className="form-label">Task title *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Fix authentication bug"
                    value={form.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    maxLength={200}
                    required
                  />
                </div>

                {/* Description */}
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-textarea"
                    placeholder="What needs to be done? Add any context or requirements..."
                    value={form.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    rows={3}
                    maxLength={1000}
                  />
                </div>

                {/* Priority + Deadline row */}
                <div className="assign-form-row">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Priority</label>
                    <div className="priority-selector">
                      {PRIORITY_OPTS.map((p) => (
                        <button
                          key={p}
                          type="button"
                          className={`priority-btn priority-btn-${p} ${form.priority === p ? 'active' : ''}`}
                          onClick={() => handleChange('priority', p)}
                        >
                          {p === 'high' ? '🔴' : p === 'medium' ? '🟡' : '🟢'} {p}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Deadline</label>
                    <input
                      type="date"
                      className="form-input"
                      value={form.dueDate}
                      onChange={(e) => handleChange('dueDate', e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-full"
                  disabled={submitting}
                  style={{ marginTop: '0.25rem' }}
                >
                  {submitting ? (
                    <><div className="spinner spinner-sm" /> Assigning...</>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      Assign Task
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* ── Right: task board ── */}
        <div className="assign-tasks-col">
          {/* Filters */}
          <div className="assign-filters">
            <div className="assign-filter-group">
              <select
                className="assign-filter-select"
                value={filterAssignee}
                onChange={(e) => setFilterAssignee(e.target.value)}
              >
                <option value="all">All members</option>
                {members.map((m) => (
                  <option key={m.user._id} value={m.user._id}>{m.user.name}</option>
                ))}
              </select>
              <select
                className="assign-filter-select"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All statuses</option>
                <option value="todo">To Do</option>
                <option value="inprogress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
            <span className="assign-task-count">{filtered.length} task{filtered.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Task list */}
          <div className="assign-task-list">
            {loadingTasks ? (
              [1,2,3].map(i => (
                <div key={i} className="skeleton" style={{ height: 90, borderRadius: 12, marginBottom: 8 }} />
              ))
            ) : filtered.length === 0 ? (
              <div className="assign-empty">
                <span>🎯</span>
                <p>{assignedTasks.length === 0 ? 'No tasks assigned yet. Use the form to assign work to your team.' : 'No tasks match the current filters.'}</p>
              </div>
            ) : (
              filtered.map((task) => {
                const overdue = isOverdue(task.dueDate) && task.status !== 'done';
                const initials = task.assignee?.name?.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
                return (
                  <div
                    key={task._id}
                    className={`assign-task-card ${overdue ? 'overdue' : ''} ${task.status === 'done' ? 'task-done' : ''}`}
                  >
                    {/* Top row */}
                    <div className="assign-task-top">
                      <div className="assign-task-assignee">
                        <div className="avatar avatar-sm">{initials}</div>
                        <span className="assign-task-assignee-name">{task.assignee?.name}</span>
                      </div>
                      <div className="assign-task-meta">
                        <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                        <button
                          className="btn-icon assign-task-delete"
                          onClick={() => handleDelete(task._id, task.title)}
                          title="Delete task"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Title */}
                    <div className={`assign-task-title ${task.status === 'done' ? 'done-text' : ''}`}>
                      {task.title}
                    </div>
                    {task.description && (
                      <div className="assign-task-desc">{task.description}</div>
                    )}

                    {/* Bottom row */}
                    <div className="assign-task-bottom">
                      {task.dueDate && (
                        <span className={`assign-task-due ${overdue ? 'due-overdue' : ''}`}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                          </svg>
                          {overdue ? '⚠ ' : ''}{formatDate(task.dueDate)}
                        </span>
                      )}
                      {/* Status selector */}
                      <select
                        className="assign-status-select"
                        value={task.status}
                        onChange={(e) => handleStatusChange(task._id, e.target.value)}
                        style={{ color: STATUS_COLORS[task.status] }}
                      >
                        {Object.entries(STATUS_LABELS).map(([val, lbl]) => (
                          <option key={val} value={val}>{lbl}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
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

      {/* ── Leader Assignment Section ── */}
      <AssignTaskPanel members={activity} onTaskAssigned={loadActivity} />

      {/* Member Cards */}
      <div className="team-section-divider">
        <span className="team-section-label">👥 Team Members</span>
      </div>

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
