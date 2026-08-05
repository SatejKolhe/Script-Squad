import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import './Today.css';

const PRIORITY_COLORS = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' };
const PRIORITY_ICONS = { high: '🔴', medium: '🟡', low: '🟢' };

export default function Today() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/tasks/today');
      setTasks(res.data.data);
    } catch {
      toast.error('Failed to load today\'s tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);

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

  const todayStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="page-container animate-fadeIn">
      <div className="today-header">
        <div>
          <h1>☀️ Today</h1>
          <p>{todayStr}</p>
        </div>
        <div className="today-count">
          <span className="today-count-num">{tasks.length}</span>
          <span className="today-count-label">task{tasks.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {loading ? (
        <div className="today-loading">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 72, borderRadius: 12, marginBottom: 8 }} />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="today-empty">
          <span className="today-empty-icon">🌟</span>
          <p>No tasks due today!</p>
          <span className="today-empty-sub">Enjoy your free day or set some due dates on your tasks.</span>
        </div>
      ) : (
        <div className="today-list">
          {tasks.map((task) => (
            <div key={task._id} className={`today-task-card ${task.status}`}>
              <button
                className={`today-task-check ${task.status}`}
                onClick={() => handleStatusChange(task._id, task.status === 'todo' ? 'inprogress' : 'done')}
                title={task.status === 'todo' ? 'Start task' : 'Complete task'}
              >
                {task.status === 'inprogress' ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>
                )}
              </button>
              <div className="today-task-body" onClick={() => navigate(`/projects/${task.project?._id}`)}>
                <div className="today-task-title">{task.title}</div>
                <div className="today-task-meta">
                  {task.project && (
                    <span className="today-task-project" style={{ background: task.project.color + '18', color: task.project.color }}>
                      {task.project.title}
                    </span>
                  )}
                  <span className="today-task-priority" style={{ color: PRIORITY_COLORS[task.priority] }}>
                    {PRIORITY_ICONS[task.priority]} {task.priority}
                  </span>
                </div>
              </div>
              <select
                className="today-task-status"
                value={task.status}
                onChange={(e) => handleStatusChange(task._id, e.target.value)}
                style={{ color: task.status === 'inprogress' ? '#6366f1' : '#8b95ae' }}
              >
                <option value="todo">To Do</option>
                <option value="inprogress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
