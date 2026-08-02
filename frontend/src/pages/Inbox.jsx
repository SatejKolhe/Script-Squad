import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../contexts/AuthContext';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import TaskItem from '../components/TaskItem';
import QuickAddTask from '../components/QuickAddTask';
import './Inbox.css';

function groupTasks(tasks) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const overdue = tasks.filter(t => t.dueDate && new Date(t.dueDate) < today && t.status !== 'done');
  const todayTasks = tasks.filter(t => {
    if (!t.dueDate) return false;
    const d = new Date(t.dueDate);
    const taskDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return taskDay.getTime() === today.getTime() && t.status !== 'done';
  });
  const noDate = tasks.filter(t => !t.dueDate && t.status !== 'done');
  const completed = tasks.filter(t => t.status === 'done');

  return { overdue, todayTasks, noDate, completed };
}

export default function Inbox() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  const fetchTasks = useCallback(async () => {
    try {
      const res = await api.get('/tasks/inbox');
      setTasks(res.data.data || []);
    } catch {
      toast.error('Failed to load inbox');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleTaskAdded = (task) => {
    setTasks(prev => [task, ...prev]);
  };

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

  const { overdue, todayTasks, noDate, completed } = groupTasks(tasks);
  const activeTasks = [...overdue, ...todayTasks, ...noDate];

  return (
    <div className="inbox-page">
      {/* Header */}
      <div className="inbox-header">
        <div className="inbox-title-row">
          <div className="inbox-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
              <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>
            </svg>
          </div>
          <h1 className="inbox-title">Inbox</h1>
          {activeTasks.length > 0 && (
            <span className="inbox-count">{activeTasks.length}</span>
          )}
        </div>
        <p className="inbox-subtitle">Tasks without a project — your catch-all</p>
      </div>

      <div className="inbox-content">
        {loading ? (
          <div className="inbox-loading">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="task-skeleton" />
            ))}
          </div>
        ) : (
          <>
            {/* Quick add */}
            <div className="inbox-add-section">
              <QuickAddTask onTaskAdded={handleTaskAdded} placeholder="Add a task to Inbox" />
            </div>

            {/* Overdue */}
            {overdue.length > 0 && (
              <div className="inbox-group">
                <div className="inbox-group-header overdue-header">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  <span>Overdue</span>
                  <span className="group-count">{overdue.length}</span>
                </div>
                {overdue.map(task => (
                  <TaskItem
                    key={task._id}
                    task={task}
                    onComplete={handleComplete}
                    onDelete={handleDelete}
                    onEdit={handleEdit}
                    showProject={false}
                  />
                ))}
              </div>
            )}

            {/* Today */}
            {todayTasks.length > 0 && (
              <div className="inbox-group">
                <div className="inbox-group-header today-header">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  <span>Today</span>
                  <span className="group-count">{todayTasks.length}</span>
                </div>
                {todayTasks.map(task => (
                  <TaskItem key={task._id} task={task} onComplete={handleComplete} onDelete={handleDelete} onEdit={handleEdit} showProject={false} />
                ))}
              </div>
            )}

            {/* No date */}
            {noDate.length > 0 && (
              <div className="inbox-group">
                {noDate.map(task => (
                  <TaskItem key={task._id} task={task} onComplete={handleComplete} onDelete={handleDelete} onEdit={handleEdit} showProject={false} />
                ))}
              </div>
            )}

            {/* Empty state */}
            {activeTasks.length === 0 && (
              <div className="inbox-empty">
                <div className="inbox-empty-icon">📥</div>
                <h3>Your inbox is clear!</h3>
                <p>Add a task above to get started.</p>
              </div>
            )}

            {/* Completed */}
            {completed.length > 0 && (
              <div className="inbox-completed-section">
                <button
                  className="inbox-completed-toggle"
                  onClick={() => setShowCompleted(v => !v)}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: showCompleted ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                  {showCompleted ? 'Hide' : 'Show'} {completed.length} completed task{completed.length !== 1 ? 's' : ''}
                </button>
                {showCompleted && completed.map(task => (
                  <TaskItem key={task._id} task={task} onComplete={handleComplete} onDelete={handleDelete} onEdit={handleEdit} showProject={false} />
                ))}
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
