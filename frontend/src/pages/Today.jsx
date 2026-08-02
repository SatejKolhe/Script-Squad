import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import TaskItem from '../components/TaskItem';
import QuickAddTask from '../components/QuickAddTask';
import './Today.css';

function getTodayLabel() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function isOverdue(task) {
  if (!task.dueDate) return false;
  const taskDate = new Date(task.dueDate);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return taskDate < today;
}

export default function Today() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/tasks/today');
      setTasks(res.data.data || []);
    } catch {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleComplete = async (task) => {
    try {
      const newStatus = task.status === 'done' ? 'todo' : 'done';
      const res = await api.put(`/tasks/${task._id}`, { status: newStatus });
      setTasks(prev => prev.map(t => t._id === task._id ? res.data.data : t));
      if (newStatus === 'done') toast.success('Task completed! +10 XP 🎉');
    } catch {
      toast.error('Failed to update task');
    }
  };

  const handleDelete = async (task) => {
    try {
      await api.delete(`/tasks/${task._id}`);
      setTasks(prev => prev.filter(t => t._id !== task._id));
      toast.success('Task deleted');
    } catch {
      toast.error('Failed to delete task');
    }
  };

  const handleTaskAdded = (task) => {
    setTasks(prev => [...prev, task]);
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setEditTitle(task.title);
  };

  const handleEditSave = async () => {
    if (!editingTask || !editTitle.trim()) return;
    try {
      const res = await api.put(`/tasks/${editingTask._id}`, { title: editTitle.trim() });
      setTasks(prev => prev.map(t => t._id === editingTask._id ? res.data.data : t));
      setEditingTask(null);
      toast.success('Task updated');
    } catch {
      toast.error('Failed to update task');
    }
  };

  const active = tasks.filter(t => t.status !== 'done');
  const completed = tasks.filter(t => t.status === 'done');
  const overdue = active.filter(isOverdue);
  const today = active.filter(t => !isOverdue(t));

  const completionPercent = tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0;

  return (
    <div className="today-page">
      {/* Header */}
      <div className="today-header">
        <div className="today-title-row">
          <div>
            <h1 className="today-title">Today</h1>
            <p className="today-date">{getTodayLabel()}</p>
          </div>
          {tasks.length > 0 && (
            <div className="today-karma">
              <div className="karma-ring">
                <svg width="52" height="52" viewBox="0 0 52 52">
                  <circle cx="26" cy="26" r="22" fill="none" stroke="var(--border-color)" strokeWidth="4"/>
                  <circle
                    cx="26" cy="26" r="22"
                    fill="none"
                    stroke="var(--brand-primary)"
                    strokeWidth="4"
                    strokeDasharray={`${2 * Math.PI * 22}`}
                    strokeDashoffset={`${2 * Math.PI * 22 * (1 - completionPercent / 100)}`}
                    strokeLinecap="round"
                    transform="rotate(-90 26 26)"
                    style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                  />
                </svg>
                <span className="karma-pct">{completionPercent}%</span>
              </div>
              <div className="karma-label">
                <span className="karma-done">{completed.length}</span>
                <span className="karma-sep">/</span>
                <span className="karma-total">{tasks.length}</span>
                <span className="karma-text">done</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="today-content">
        {loading ? (
          <div className="today-loading">
            {[...Array(5)].map((_, i) => <div key={i} className="task-skeleton" />)}
          </div>
        ) : (
          <>
            {/* Quick add */}
            <div className="today-add-section">
              <QuickAddTask
                onTaskAdded={handleTaskAdded}
                defaultDueDate={new Date().toISOString().split('T')[0]}
                placeholder="Add a task for today"
              />
            </div>

            {/* Overdue */}
            {overdue.length > 0 && (
              <div className="today-section">
                <div className="today-section-header overdue">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  <span>Overdue</span>
                  <span className="section-count">{overdue.length}</span>
                </div>
                <div className="today-task-list">
                  {overdue.map(task => (
                    <TaskItem key={task._id} task={task} onComplete={handleComplete} onDelete={handleDelete} onEdit={handleEdit} />
                  ))}
                </div>
              </div>
            )}

            {/* Today's tasks */}
            {today.length > 0 ? (
              <div className="today-section">
                <div className="today-section-header">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  <span>Today</span>
                  <span className="section-count">{today.length}</span>
                </div>
                <div className="today-task-list">
                  {today.map(task => (
                    <TaskItem key={task._id} task={task} onComplete={handleComplete} onDelete={handleDelete} onEdit={handleEdit} />
                  ))}
                </div>
              </div>
            ) : overdue.length === 0 ? (
              <div className="today-empty">
                <div className="today-empty-icon">🎉</div>
                <h3>All clear for today!</h3>
                <p>Add a task or enjoy your day.</p>
              </div>
            ) : null}

            {/* Completed */}
            {completed.length > 0 && (
              <div className="today-completed">
                <button
                  className="completed-toggle"
                  onClick={() => setShowCompleted(v => !v)}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: showCompleted ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                  {showCompleted ? 'Hide' : 'Show'} {completed.length} completed
                </button>
                {showCompleted && (
                  <div className="today-task-list">
                    {completed.map(task => (
                      <TaskItem key={task._id} task={task} onComplete={handleComplete} onDelete={handleDelete} onEdit={handleEdit} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Edit modal */}
      {editingTask && (
        <div className="edit-overlay" onClick={() => setEditingTask(null)}>
          <div className="edit-modal" onClick={e => e.stopPropagation()}>
            <h3>Edit Task</h3>
            <input
              className="edit-modal-input"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleEditSave(); if (e.key === 'Escape') setEditingTask(null); }}
              autoFocus
            />
            <div className="edit-modal-actions">
              <button className="edit-cancel" onClick={() => setEditingTask(null)}>Cancel</button>
              <button className="edit-save" onClick={handleEditSave}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
