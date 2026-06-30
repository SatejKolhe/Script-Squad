import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, api } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { format, isPast, isToday } from 'date-fns';
import './Dashboard.css';

const PRIORITY_COLOR = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' };
const STATUS_LABEL = { todo: 'Todo', inprogress: 'In Progress', done: 'Done' };

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentTasks, setRecentTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quickTask, setQuickTask] = useState('');
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [analyticsRes, tasksRes, projectsRes] = await Promise.all([
        api.get('/tasks/analytics/summary'),
        api.get('/tasks?sortBy=createdAt'),
        api.get('/projects'),
      ]);
      setStats(analyticsRes.data.data);
      setRecentTasks(tasksRes.data.data.slice(0, 8));
      setProjects(projectsRes.data.data);
      if (projectsRes.data.data.length > 0) setSelectedProject(projectsRes.data.data[0]._id);
    } catch (err) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (!quickTask.trim()) return;
    if (!selectedProject) { toast.error('Create a project first!'); return; }
    try {
      await api.post('/tasks', { title: quickTask.trim(), project: selectedProject });
      setQuickTask('');
      toast.success('Task added!');
      loadDashboard();
    } catch (err) {
      toast.error('Failed to add task');
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await api.put(`/tasks/${taskId}`, { status: newStatus });
      setRecentTasks((prev) =>
        prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t))
      );
      if (newStatus === 'done') toast.success('Task completed! 🎉');
    } catch (err) {
      toast.error('Failed to update task');
    }
  };

  const getStatusCount = (statusId) => {
    return stats?.statusCounts?.find((s) => s._id === statusId)?.count || 0;
  };

  const completionRate = stats
    ? Math.round((getStatusCount('done') / Math.max(stats.totalTasks, 1)) * 100)
    : 0;

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-overlay">
          <div className="spinner spinner-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-container animate-fadeIn">
      {/* Welcome Banner */}
      <div className="dashboard-banner">
        <div className="banner-content">
          <div className="banner-emoji">👋</div>
          <div>
            <h2 className="banner-title">Good {getGreeting()}, {user?.name?.split(' ')[0]}!</h2>
            <p className="banner-subtitle">
              {stats?.totalTasks === 0
                ? 'Start by creating your first project and adding tasks.'
                : `You have ${getStatusCount('todo')} tasks todo and ${getStatusCount('inprogress')} in progress.`}
            </p>
          </div>
        </div>
        <div className="banner-completion">
          <div className="completion-ring">
            <svg viewBox="0 0 80 80" className="ring-svg">
              <circle cx="40" cy="40" r="32" className="ring-bg" />
              <circle
                cx="40" cy="40" r="32"
                className="ring-fill"
                strokeDasharray={`${completionRate * 2.01} 201`}
              />
            </svg>
            <div className="ring-text">
              <span className="ring-percent">{completionRate}%</span>
              <span className="ring-label">Done</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid-4 mt-4">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.12)' }}>📋</div>
          <div>
            <div className="stat-number">{stats?.totalTasks || 0}</div>
            <div className="stat-label">Total Tasks</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(6,182,212,0.12)' }}>🚀</div>
          <div>
            <div className="stat-number">{getStatusCount('inprogress')}</div>
            <div className="stat-label">In Progress</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.12)' }}>✅</div>
          <div>
            <div className="stat-number">{getStatusCount('done')}</div>
            <div className="stat-label">Completed</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.12)' }}>⚠️</div>
          <div>
            <div className="stat-number" style={{ color: stats?.overdue > 0 ? '#ef4444' : undefined }}>
              {stats?.overdue || 0}
            </div>
            <div className="stat-label">Overdue</div>
          </div>
        </div>
      </div>

      {/* Quick Add + Recent Tasks */}
      <div className="dashboard-grid mt-4">
        {/* Quick Add */}
        <div className="card p-6">
          <h3 className="section-title">⚡ Quick Add Task</h3>
          <form onSubmit={handleQuickAdd} className="quick-add-form">
            <div className="form-group">
              <select
                className="form-select"
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                id="quick-project-select"
              >
                {projects.length === 0 ? (
                  <option value="">No projects — create one first</option>
                ) : (
                  projects.map((p) => (
                    <option key={p._id} value={p._id}>{p.title}</option>
                  ))
                )}
              </select>
            </div>
            <div className="quick-add-row">
              <input
                type="text"
                className="form-input"
                placeholder="Type a task name and press Enter..."
                value={quickTask}
                onChange={(e) => setQuickTask(e.target.value)}
                id="quick-task-input"
              />
              <button type="submit" className="btn btn-primary" disabled={!quickTask.trim()}>
                + Add
              </button>
            </div>
          </form>

          {/* Project overview */}
          <div className="mt-4">
            <div className="section-title-row">
              <h3 className="section-title">📁 Projects</h3>
              <Link to="/projects" className="text-sm" style={{ color: 'var(--brand-primary)' }}>View all →</Link>
            </div>
            <div className="project-list">
              {projects.slice(0, 4).map((p) => (
                <Link key={p._id} to={`/projects/${p._id}`} className="project-mini-card">
                  <div className="project-mini-dot" style={{ background: p.color }} />
                  <div className="project-mini-info">
                    <span className="project-mini-title">{p.title}</span>
                    <span className="project-mini-count">{p.taskCount || 0} tasks</span>
                  </div>
                  <div className="project-mini-progress">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${p.taskCount ? Math.round((p.completedCount / p.taskCount) * 100) : 0}%` }}
                      />
                    </div>
                  </div>
                </Link>
              ))}
              {projects.length === 0 && (
                <div className="empty-state" style={{ padding: '2rem' }}>
                  <div className="empty-state-icon">📁</div>
                  <p className="empty-state-desc">No projects yet. <Link to="/projects">Create one!</Link></p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Tasks */}
        <div className="card p-6">
          <div className="section-title-row">
            <h3 className="section-title">📋 Recent Tasks</h3>
            <Link to="/projects" className="text-sm" style={{ color: 'var(--brand-primary)' }}>All projects →</Link>
          </div>
          <div className="task-list">
            {recentTasks.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <div className="empty-state-icon">✅</div>
                <p className="empty-state-desc">No tasks yet. Create a project and start adding tasks!</p>
              </div>
            ) : (
              recentTasks.map((task) => (
                <div key={task._id} className="task-row">
                  <button
                    className={`task-check ${task.status === 'done' ? 'checked' : ''}`}
                    onClick={() =>
                      handleStatusChange(task._id, task.status === 'done' ? 'todo' : 'done')
                    }
                    title={task.status === 'done' ? 'Mark as todo' : 'Mark as done'}
                  />
                  <div className="task-row-info">
                    <span className={`task-row-title ${task.status === 'done' ? 'done' : ''}`}>
                      {task.title}
                    </span>
                    <div className="task-row-meta">
                      {task.project && (
                        <span className="tag" style={{ borderColor: task.project.color, color: task.project.color }}>
                          {task.project.title}
                        </span>
                      )}
                      {task.dueDate && (
                        <span
                          className="task-due"
                          style={{
                            color: isPast(new Date(task.dueDate)) && task.status !== 'done'
                              ? '#ef4444'
                              : isToday(new Date(task.dueDate))
                              ? '#f59e0b'
                              : 'var(--text-muted)',
                          }}
                        >
                          📅 {format(new Date(task.dueDate), 'MMM d')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div
                    className="priority-dot"
                    style={{ background: PRIORITY_COLOR[task.priority] }}
                    title={`Priority: ${task.priority}`}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}
