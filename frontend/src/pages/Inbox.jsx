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

  const handleAccept = async (invite) => {
    try {
      if (invite.isOrgTeam) {
        await api.patch(`/orgTeams/requests/${invite._id}/accept`);
      } else {
        await api.patch(`/inbox/invites/${invite._id}/accept`);
      }
      toast.success('Invite accepted! 🎉');
      setInvites((prev) => prev.filter((i) => i._id !== invite._id));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to accept');
    }
  };

  const handleDecline = async (invite) => {
    try {
      if (invite.isOrgTeam) {
        await api.patch(`/orgTeams/requests/${invite._id}/decline`);
      } else {
        await api.patch(`/inbox/invites/${invite._id}/decline`);
      }
      toast.success('Invite declined');
      setInvites((prev) => prev.filter((i) => i._id !== invite._id));
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
          <h1 className="inbox-title">Inbox</h1>
          <p className="inbox-subtitle">Team invites and pending tasks</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="inbox-tabs">
        <button
          className={`inbox-tab ${tab === 'invites' ? 'active' : ''}`}
          onClick={() => setTab('invites')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          <span>Invites</span>
          {invites.length > 0 && <span className="inbox-tab-badge">{invites.length}</span>}
        </button>
        <button
          className={`inbox-tab ${tab === 'tasks' ? 'active' : ''}`}
          onClick={() => setTab('tasks')}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 11 12 14 22 4"/>
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
          </svg>
          <span>Tasks</span>
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
              <div className="inbox-empty-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
                  <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>
                </svg>
              </div>
              <p>No pending invites</p>
              <span className="inbox-empty-sub">When a team leader invites you, it will appear here.</span>
            </div>
          ) : (
            invites.map((invite) => {
              const sender = invite.isOrgTeam ? invite.senderId : invite.from;
              return (
              <div key={invite._id} className="invite-card animate-bounceIn">
                <div className="invite-avatar">
                  {sender?.avatar ? (
                    <img src={sender.avatar} alt={sender.name} />
                  ) : (
                    sender?.name?.[0]?.toUpperCase()
                  )}
                </div>
                <div className="invite-info">
                  <div className="invite-name">{sender?.name}</div>
                  <div className="invite-email">{sender?.email}</div>
                  <div className="invite-time">
                    {invite.isOrgTeam 
                      ? invite.isJoinRequest 
                          ? `Requested to join team "${invite.teamId?.name}"` 
                          : `Invited you to join team "${invite.teamId?.name}" as a ${invite.intendedRole === 'leader' ? 'Leader' : 'Member'}`
                      : `Invited you to be friends`
                    } · {timeAgo(invite.createdAt)}
                  </div>
                </div>
                <div className="invite-actions">
                  <button className="btn btn-primary btn-sm" onClick={() => handleAccept(invite)}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Accept
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleDecline(invite)}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 4 }}>
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                    Decline
                  </button>
                </div>
              </div>
            )})
          )}
        </div>
      ) : (
        <div className="inbox-list">
          {tasks.length === 0 ? (
            <div className="inbox-empty">
              <div className="inbox-empty-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
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
                  {task.status === 'inprogress' ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                  ) : (
                    '○'
                  )}
                </button>
                <div className="inbox-task-body" onClick={() => navigate(`/projects/${task.project?._id}`)}>
                  <div className="inbox-task-title">{task.title}</div>
                  <div className="inbox-task-meta">
                    {task.project && (
                      <span className="inbox-task-project" style={{ color: task.project.color, borderColor: task.project.color + '44' }}>
                        {task.project.title}
                      </span>
                    )}
                    <span className={`badge badge-${task.priority}`}>
                      {task.priority}
                    </span>
                    {task.dueDate && (
                      <span className={`inbox-task-due ${new Date(task.dueDate) < new Date() ? 'overdue' : ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        {formatDate(task.dueDate)}
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
