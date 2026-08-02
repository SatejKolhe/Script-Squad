import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import TaskItem from '../components/TaskItem';
import QuickAddTask from '../components/QuickAddTask';
import './Upcoming.css';

function getNext7Days() {
  const days = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    days.push(d);
  }
  return days;
}

function formatDayHeader(date) {
  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  if (date.getTime() === tomorrow.getTime()) return 'Tomorrow';
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function isSameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
}

export default function Upcoming() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTask, setEditingTask] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const days = getNext7Days();

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/tasks/upcoming');
      setTasks(res.data.data || []);
    } catch {
      toast.error('Failed to load upcoming tasks');
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

  const handleTaskAdded = (task) => {
    setTasks(prev => [...prev, task]);
  };

  const getTasksForDay = (day) =>
    tasks.filter(t => t.dueDate && isSameDay(new Date(t.dueDate), day));

  const totalTasks = tasks.length;

  return (
    <div className="upcoming-page">
      {/* Header */}
      <div className="upcoming-header">
        <div className="upcoming-title-row">
          <div className="upcoming-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              <line x1="8" y1="14" x2="8" y2="14" strokeWidth="3"/><line x1="12" y1="14" x2="12" y2="14" strokeWidth="3"/><line x1="16" y1="14" x2="16" y2="14" strokeWidth="3"/>
            </svg>
          </div>
          <h1 className="upcoming-title">Upcoming</h1>
          {totalTasks > 0 && <span className="upcoming-count">{totalTasks}</span>}
        </div>
        <p className="upcoming-subtitle">Tasks due in the next 7 days</p>
      </div>

      {/* Mini calendar strip */}
      <div className="upcoming-calendar-strip">
        {days.map((day, i) => {
          const count = getTasksForDay(day).length;
          return (
            <a key={i} href={`#day-${i}`} className="calendar-day-cell">
              <span className="cal-weekday">{day.toLocaleDateString('en-US', { weekday: 'short' })}</span>
              <span className="cal-date">{day.getDate()}</span>
              {count > 0 && <span className="cal-count">{count}</span>}
            </a>
          );
        })}
      </div>

      <div className="upcoming-content">
        {loading ? (
          <div className="upcoming-loading">
            {[...Array(6)].map((_, i) => <div key={i} className="task-skeleton" />)}
          </div>
        ) : (
          <>
            {days.map((day, i) => {
              const dayTasks = getTasksForDay(day);
              return (
                <div key={i} id={`day-${i}`} className="upcoming-day-section">
                  <div className={`upcoming-day-header ${i === 0 ? 'tomorrow' : ''}`}>
                    <div className="day-header-left">
                      <span className="day-header-label">{formatDayHeader(day)}</span>
                      <span className="day-header-date">
                        {day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    {dayTasks.length > 0 && (
                      <span className="day-task-count">{dayTasks.length} task{dayTasks.length !== 1 ? 's' : ''}</span>
                    )}
                  </div>

                  {dayTasks.length > 0 ? (
                    <div className="upcoming-task-list">
                      {dayTasks.map(task => (
                        <TaskItem
                          key={task._id}
                          task={task}
                          onComplete={handleComplete}
                          onDelete={handleDelete}
                          onEdit={handleEdit}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="upcoming-day-empty">
                      <span>No tasks — enjoy the day! ☀️</span>
                    </div>
                  )}

                  {/* Quick add for this day */}
                  <div className="upcoming-day-add">
                    <QuickAddTask
                      onTaskAdded={handleTaskAdded}
                      defaultDueDate={day.toISOString().split('T')[0]}
                      placeholder={`Add task for ${formatDayHeader(day)}`}
                    />
                  </div>
                </div>
              );
            })}
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
