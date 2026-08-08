import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, api } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { format, isPast, isToday } from 'date-fns';
import './Dashboard.css';

const PRIORITY_COLOR = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' };
const STATUS_LABEL = { todo: 'Todo', inprogress: 'In Progress', done: 'Done' };

// Animated counter hook
function useCountUp(target, duration = 800) {
  const [value, setValue] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const start = prev.current;
    const diff = target - start;
    if (diff === 0) return;
    const startTime = performance.now();
    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + diff * eased));
      if (progress < 1) requestAnimationFrame(step);
      else prev.current = target;
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return value;
}

// Live global timer across all in-progress tasks
function GlobalTimerWidget({ tasks }) {
  const inProgress = tasks.filter((t) => t.status === 'inprogress');
  const [ms, setMs] = useState(0);

  useEffect(() => {
    const compute = () => {
      let total = 0;
      for (const t of inProgress) {
        total += t.totalTimeSpent || 0;
        if (t.timerStartedAt) total += Date.now() - new Date(t.timerStartedAt).getTime();
      }
      return Math.max(0, total);
    };
    setMs(compute());
    if (inProgress.length === 0) return;
    const iv = setInterval(() => setMs(compute()), 1000);
    return () => clearInterval(iv);
  }, [tasks]);

  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const pad = (n) => String(n).padStart(2, '0');
  const timeStr = h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;

  return (
    <div className={`global-timer-widget ${inProgress.length > 0 ? 'timer-active' : ''}`}>
      <div className="global-timer-header">
        {inProgress.length > 0 && <span className="global-timer-dot" />}
        <span className="global-timer-icon">{inProgress.length > 0 ? '⏱️' : '🕐'}</span>
        <span className="global-timer-label">Active Session</span>
      </div>
      <div className="global-timer-clock">{timeStr}</div>
      <div className="global-timer-sub">
        {inProgress.length > 0
          ? `${inProgress.length} task${inProgress.length > 1 ? 's' : ''} in progress`
          : 'No active timers'}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentTasks, setRecentTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quickTask, setQuickTask] = useState('');
  const [quickDate, setQuickDate] = useState('');
  const [isQuickPrivate, setIsQuickPrivate] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const fileInputRef = React.useRef(null);

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
    
    let urgentProject = projects.find(p => p.title.toLowerCase() === 'urgent work');
    if (!urgentProject) {
      try {
        const res = await api.post('/projects', { title: 'Urgent Work', color: '#ef4444' });
        urgentProject = res.data.data;
        setProjects(prev => [...prev, urgentProject]);
      } catch (err) {
        toast.error('Failed to create Urgent Work project');
        return;
      }
    }

    try {
      await api.post('/tasks', { 
        title: quickTask.trim(), 
        dueDate: quickDate || undefined,
        project: urgentProject._id,
        isPrivate: isQuickPrivate
      });
      setQuickTask('');
      setQuickDate('');
      setAiSuggestions([]);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast.success('Task added to Urgent Work!');
      loadDashboard();
    } catch (err) {
      toast.error('Failed to add task');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const handleAIAnalyze = async () => {
    setAiLoading(true);
    setAiSuggestions([]);
    try {
      if (selectedFile) {
        const reader = new FileReader();
        reader.onload = async (ev) => {
          try {
            const res = await api.post('/ai/extract-task', {
              fileData: ev.target.result,
              mimeType: selectedFile.type,
              text: quickTask,
            });
            if (res.data?.data) {
              if (res.data.data.title) setQuickTask(res.data.data.title);
              if (res.data.data.dueDate) setQuickDate(res.data.data.dueDate);
              if (res.data.data.suggestions) setAiSuggestions(res.data.data.suggestions);
              toast.success('✨ AI extracted task details from file!');
            }
          } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to analyze file with AI.');
          } finally {
            setAiLoading(false);
          }
        };
        reader.onerror = () => {
          toast.error('Failed to read file.');
          setAiLoading(false);
        };
        reader.readAsDataURL(selectedFile);
      } else {
        const res = await api.post('/ai/extract-task', { text: quickTask });
        if (res.data?.data) {
          if (res.data.data.title) setQuickTask(res.data.data.title);
          if (res.data.data.dueDate) setQuickDate(res.data.data.dueDate);
          if (res.data.data.suggestions) setAiSuggestions(res.data.data.suggestions);
          toast.success(quickTask.trim() ? '✨ AI smart-parsed your task!' : '✨ AI generated a task suggestion!');
        }
        setAiLoading(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'AI service error.');
      setAiLoading(false);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    // Optimistically update UI
    const prevTask = recentTasks.find((t) => t._id === taskId);
    const wasNotDone = prevTask && prevTask.status !== 'done';
    try {
      const res = await api.put(`/tasks/${taskId}`, { status: newStatus });
      setRecentTasks((prev) =>
        prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t))
      );
      if (newStatus === 'done' && wasNotDone) {
        const xpGained = 10;
        const updatedUser = res.data.updatedUser;
        if (updatedUser) {
          // Update localStorage + context via a lightweight state sync
          const stored = JSON.parse(localStorage.getItem('ss_user') || '{}');
          const merged = { ...stored, xp: updatedUser.xp, streak: updatedUser.streak, lastTaskCompletedAt: updatedUser.lastTaskCompletedAt };
          localStorage.setItem('ss_user', JSON.stringify(merged));
          // Force context re-read on next render by dispatching storage event
          window.dispatchEvent(new StorageEvent('storage', { key: 'ss_user', newValue: JSON.stringify(merged) }));
        }
        toast.success(`Task done! +${xpGained} XP ⚡`);
      }
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

  // Animated stat values
  const animTotal = useCountUp(stats?.totalTasks || 0);
  const animInProgress = useCountUp(getStatusCount('inprogress'));
  const animDone = useCountUp(getStatusCount('done'));
  const animOverdue = useCountUp(stats?.overdue || 0);

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-overlay">
          <div className="spinner spinner-lg" />
        </div>
      </div>
    );
  }

  // Gather all tasks for the live timer widget
  const inProgressTasks = recentTasks.filter((t) => t.status === 'inprogress');

  return (
    <div className="page-container animate-fadeIn">
      {/* Welcome Banner */}
      <div className="dashboard-banner">
        <div className="banner-bg-glow banner-bg-glow-1" />
        <div className="banner-bg-glow banner-bg-glow-2" />
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
        <div className="banner-right">
          <GlobalTimerWidget tasks={recentTasks} />
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
      </div>

      {/* XP & Streak Banner */}
      <div className="dashboard-xp-row">
        <div className="dashboard-xp-card">
          <span className="dashboard-xp-icon">⚡</span>
          <div className="dashboard-xp-info">
            <div className="dashboard-xp-value">{user?.xp || 0} XP</div>
            <div className="dashboard-xp-label">Total earned</div>
          </div>
        </div>
        <div className="dashboard-xp-card">
          <span className="dashboard-xp-icon">🔥</span>
          <div className="dashboard-xp-info">
            <div className="dashboard-xp-value">{user?.streak || 0} day{user?.streak !== 1 ? 's' : ''}</div>
            <div className="dashboard-xp-label">Current streak</div>
          </div>
        </div>
        <div className="dashboard-xp-card dashboard-xp-card-bar">
          <div className="dashboard-xp-level-row">
            <span className="dashboard-xp-level-text">Level {Math.floor((user?.xp || 0) / 100) + 1}</span>
            <span className="dashboard-xp-level-sub">{(user?.xp || 0) % 100}/100 XP</span>
          </div>
          <div className="dashboard-xp-bar-bg">
            <div className="dashboard-xp-bar-fill" style={{ width: `${(user?.xp || 0) % 100}%` }} />
          </div>
        </div>
        <Link to="/profile" className="dashboard-xp-card dashboard-xp-profile-link">
          <span className="dashboard-xp-icon">🏆</span>
          <div className="dashboard-xp-info">
            <div className="dashboard-xp-value">View Profile</div>
            <div className="dashboard-xp-label">Achievements →</div>
          </div>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid-4 mt-4">
        <div className="stat-card stat-card-purple">
          <div className="stat-icon stat-icon-purple">📋</div>
          <div>
            <div className="stat-number">{animTotal}</div>
            <div className="stat-label">Total Tasks</div>
          </div>
          <div className="stat-card-bg-icon">📋</div>
        </div>
        <div className="stat-card stat-card-cyan">
          <div className="stat-icon stat-icon-cyan">🚀</div>
          <div>
            <div className="stat-number">{animInProgress}</div>
            <div className="stat-label">In Progress</div>
          </div>
          <div className="stat-card-bg-icon">🚀</div>
        </div>
        <div className="stat-card stat-card-green">
          <div className="stat-icon stat-icon-green">✅</div>
          <div>
            <div className="stat-number">{animDone}</div>
            <div className="stat-label">Completed</div>
          </div>
          <div className="stat-card-bg-icon">✅</div>
        </div>
        <div className="stat-card stat-card-red">
          <div className="stat-icon stat-icon-red">⚠️</div>
          <div>
            <div className="stat-number" style={{ color: (stats?.overdue || 0) > 0 ? '#ef4444' : undefined }}>
              {animOverdue}
            </div>
            <div className="stat-label">Overdue</div>
          </div>
          <div className="stat-card-bg-icon">⚠️</div>
        </div>
      </div>

      {/* Quick Add + Recent Tasks */}
      <div className="dashboard-grid mt-4">
        {/* Quick Add */}
        <div className="card p-6">
          <h3 className="dashboard-section-title">⚡ Quick Add Task</h3>
          <form onSubmit={handleQuickAdd} className="quick-add-form" style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', width: '100%' }}>
              <input
                type="text"
                className="form-input flex-1"
                placeholder="Type a task name..."
                value={quickTask}
                onChange={(e) => setQuickTask(e.target.value)}
                id="quick-task-input"
              />
              
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type="date"
                  className="form-input"
                  style={{ 
                    width: '160px',
                    flexShrink: 0,
                    paddingRight: '36px'
                  }}
                  value={quickDate}
                  onChange={(e) => setQuickDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <input 
                type="file" 
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/*,application/pdf,text/plain"
                onChange={handleFileChange}
              />

              <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ 
                    padding: '0 0.75rem', 
                    fontSize: '1.2rem', 
                    minHeight: '40px',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    borderRadius: '8px',
                    transition: 'all 0.15s ease'
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach file"
                >
                  +
                </button>

                {selectedFile && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: 'var(--bg-secondary)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', fontSize: '0.75rem' }}>
                    <span style={{ maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {selectedFile.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1rem', lineHeight: '1' }}
                      title="Remove attachment"
                    >
                      &times;
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ 
                    padding: '0 0.75rem', 
                    minHeight: '40px',
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    borderColor: '#8b5cf6', 
                    color: '#8b5cf6',
                    borderRadius: '8px',
                    transition: 'all 0.15s ease'
                  }}
                  onClick={handleAIAnalyze}
                  disabled={aiLoading}
                  title="Extract task from attached file"
                >
                  <span>{aiLoading ? '⏳' : '✨'}</span> 
                  <span style={{ fontWeight: '500' }}>AI</span>
                </button>
              </div>

              <button
                type="button"
                className={`btn ${isQuickPrivate ? 'btn-ghost' : 'btn-outline'}`}
                style={{ 
                  padding: '0 0.75rem',
                  minHeight: '40px',
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  background: isQuickPrivate ? 'var(--bg-secondary)' : 'rgba(16, 185, 129, 0.1)',
                  borderColor: isQuickPrivate ? 'var(--border-color)' : '#10b981',
                  color: isQuickPrivate ? 'var(--text-muted)' : '#059669',
                  borderRadius: '8px',
                  transition: 'all 0.15s ease'
                }}
                onClick={() => setIsQuickPrivate(!isQuickPrivate)}
                title={isQuickPrivate ? "Private task" : "Public task"}
              >
                <span>{isQuickPrivate ? '🔒' : '🌍'}</span>
                <span style={{ fontWeight: '500' }}>{isQuickPrivate ? 'Private' : 'Public'}</span>
              </button>
              
              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={!quickTask.trim()}
                style={{
                  padding: '0 1.25rem',
                  minHeight: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  borderRadius: '8px',
                  transition: 'all 0.15s ease',
                  marginLeft: 'auto'
                }}
              >
                <span style={{ fontSize: '1.1rem' }}>+</span>
                <span style={{ fontWeight: '600' }}>Add</span>
              </button>
            </div>

            {aiSuggestions.length > 0 && (
              <div style={{
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                borderRadius: '10px',
                padding: '0.75rem 1rem',
                marginTop: '0.25rem'
              }}>
                <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#6366f1', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>✨</span> AI Extracted Action Steps & Suggestions:
                </div>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.825rem', color: 'var(--text-color)' }}>
                  {aiSuggestions.map((sug, i) => (
                    <li key={i} style={{ marginBottom: '0.25rem' }}>{sug}</li>
                  ))}
                </ul>
              </div>
            )}
          </form>

          {/* Project overview */}
          <div className="mt-4">
            <div className="section-title-row">
              <h3 className="dashboard-section-title">📁 Projects</h3>
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
            <h3 className="dashboard-section-title">📋 Recent Tasks</h3>
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
                <div key={task._id} className={`task-row ${task.status === 'inprogress' ? 'task-row-active' : ''}`}>
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
                      {task.status === 'inprogress' && (
                        <span className="task-row-live-badge">
                          <span className="task-row-live-dot" />
                          Live
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
