import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import './Inbox.css';

const PRIORITY_COLORS = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' };
const PRIORITY_ICONS = { high: '🔴', medium: '🟡', low: '🟢' };

export default function Inbox() {
  const [tab, setTab] = useState('invites');
  const [invites, setInvites] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, taskRes] = await Promise.all([
        api.get('/inbox/invites'),
        api.get('/inbox/tasks'),
      ]);
      setInvites(invRes.data.data);
      setTasks(taskRes.data.data);
    } catch {
      toast.error('Failed to load inbox');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAccept = async (id) => {
    try {
      await api.patch(`/inbox/invites/${id}/accept`);
      toast.success('Invite accepted! 🎉');
      setInvites((prev) => prev.filter((i) => i._id !== id));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept');
    }
  };

  const handleDecline = async (id) => {
    try {
      await api.patch(`/inbox/invites/${id}/decline`);
      toast.success('Invite declined');
      setInvites((prev) => prev.filter((i) => i._id !== id));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to decline');
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const res = await api.put(`/tasks/${taskId}`, { status: newStatus });
      if (newStatus === 'done') {
        setTasks((prev) => prev.filter((t) => t._id !== taskId));
        toast.success('Task completed! +10 XP 🎉');
      } else {
        setTasks((prev) => prev.map((t) => (t._id === taskId ? res.data.data : t)));
      }
    } catch {
      toast.error('Failed to update task');
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '';
  const timeAgo = (d) => {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <div className="page-container animate-fadeIn">
      <div className="inbox-header">
        <div>
          <h1>📥 Inbox</h1>
          <p>Team invites and uncompleted tasks</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="inbox-tabs">
        <button
          className={`inbox-tab ${tab === 'invites' ? 'active' : ''}`}
          onClick={() => setTab('invites')}
        >
          <span>📨</span> Invites
          {invites.length > 0 && <span className="inbox-tab-badge">{invites.length}</span>}
        </button>
        <button
          className={`inbox-tab ${tab === 'tasks' ? 'active' : ''}`}
          onClick={() => setTab('tasks')}
        >
          <span>📋</span> Tasks
          {tasks.length > 0 && <span className="inbox-tab-badge">{tasks.length}</span>}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="inbox-loading">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12, marginBottom: 8 }} />
          ))}
        </div>
      ) : tab === 'invites' ? (
        <div className="inbox-list">
          {invites.length === 0 ? (
            <div className="inbox-empty">
              <span className="inbox-empty-icon">📭</span>
              <p>No pending invites</p>
              <span className="inbox-empty-sub">When a team leader invites you, it will appear here.</span>
            </div>
          ) : (
            invites.map((invite) => (
              <div key={invite._id} className="invite-card animate-bounceIn">
                <div className="invite-avatar">
                  {invite.from?.avatar ? (
                    <img src={invite.from.avatar} alt={invite.from.name} />
                  ) : (
                    invite.from?.name?.[0]?.toUpperCase()
                  )}
                </div>
                <div className="invite-info">
                  <div className="invite-name">{invite.from?.name}</div>
                  <div className="invite-email">{invite.from?.email}</div>
                  <div className="invite-time">Invited you to join their team · {timeAgo(invite.createdAt)}</div>
                </div>
                <div className="invite-actions">
                  <button className="btn btn-primary btn-sm" onClick={() => handleAccept(invite._id)}>
                    ✓ Accept
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleDecline(invite._id)}>
                    ✕ Decline
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="inbox-list">
          {tasks.length === 0 ? (
            <div className="inbox-empty">
              <span className="inbox-empty-icon">🎉</span>
              <p>All tasks completed!</p>
              <span className="inbox-empty-sub">You're all caught up. Go create some new tasks!</span>
            </div>
          ) : (
            tasks.map((task) => (
              <div key={task._id} className="inbox-task-card">
                <button
                  className={`inbox-task-check ${task.status}`}
                  onClick={() => handleStatusChange(task._id, task.status === 'todo' ? 'inprogress' : 'done')}
                  title={task.status === 'todo' ? 'Start' : 'Complete'}
                >
                  {task.status === 'inprogress' ? '⏳' : '○'}
                </button>
                <div className="inbox-task-body" onClick={() => navigate(`/projects/${task.project?._id}`)}>
                  <div className="inbox-task-title">{task.title}</div>
                  <div className="inbox-task-meta">
                    {task.project && (
                      <span className="inbox-task-project" style={{ color: task.project.color, borderColor: task.project.color + '44' }}>
                        {task.project.title}
                      </span>
                    )}
                    <span className="inbox-task-priority" style={{ color: PRIORITY_COLORS[task.priority] }}>
                      {PRIORITY_ICONS[task.priority]} {task.priority}
                    </span>
                    {task.dueDate && (
                      <span className={`inbox-task-due ${new Date(task.dueDate) < new Date() ? 'overdue' : ''}`}>
                        📅 {formatDate(task.dueDate)}
                      </span>
                    )}
                  </div>
                </div>
                <select
                  className="inbox-task-status-select"
                  value={task.status}
                  onChange={(e) => handleStatusChange(task._id, e.target.value)}
                >
                  <option value="todo">To Do</option>
                  <option value="inprogress">In Progress</option>
                  <option value="done">Done</option>
                </select>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
