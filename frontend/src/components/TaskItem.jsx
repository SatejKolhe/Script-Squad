import React, { useState } from 'react';
import './TaskItem.css';

const PRIORITY_CONFIG = {
  urgent: { color: '#ef4444', label: 'Urgent', icon: '🔴' },
  high:   { color: '#f97316', label: 'High',   icon: '🟠' },
  medium: { color: '#eab308', label: 'Medium', icon: '🟡' },
  low:    { color: '#6366f1', label: 'Low',    icon: '🔵' },
};

function formatDueDate(dueDate) {
  if (!dueDate) return null;
  const d = new Date(dueDate);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const taskDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const diff = (taskDay - today) / (1000 * 60 * 60 * 24);

  if (diff < 0) return { label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), overdue: true };
  if (diff === 0) return { label: 'Today', overdue: false, today: true };
  if (diff === 1) return { label: 'Tomorrow', overdue: false };
  if (diff <= 7) return { label: d.toLocaleDateString('en-US', { weekday: 'short' }), overdue: false };
  return { label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), overdue: false };
}

export default function TaskItem({ task, onComplete, onDelete, onEdit, showProject = true }) {
  const [completing, setCompleting] = useState(false);
  const [hovered, setHovered] = useState(false);

  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium;
  const dueDateInfo = formatDueDate(task.dueDate);
  const isDone = task.status === 'done';

  const handleComplete = async (e) => {
    e.stopPropagation();
    if (completing || isDone) return;
    setCompleting(true);
    await onComplete?.(task);
    setCompleting(false);
  };

  return (
    <div
      className={`task-item ${isDone ? 'task-done' : ''} ${hovered ? 'hovered' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Checkbox */}
      <button
        className={`task-checkbox ${isDone ? 'checked' : ''} ${completing ? 'completing' : ''}`}
        onClick={handleComplete}
        title={isDone ? 'Completed' : 'Mark as complete'}
        style={{ borderColor: priority.color }}
      >
        {(isDone || completing) && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1.5 5L3.8 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="task-content" onClick={() => onEdit?.(task)}>
        <div className="task-title-row">
          <span className={`task-title ${isDone ? 'strikethrough' : ''}`}>{task.title}</span>
          
          {/* Labels */}
          {task.labels && task.labels.length > 0 && (
            <div className="task-labels">
              {task.labels.map((label, i) => (
                <span
                  key={i}
                  className="task-label-chip"
                  style={{ background: label.color + '22', color: label.color, borderColor: label.color + '44' }}
                >
                  @{label.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Meta row */}
        <div className="task-meta">
          {showProject && task.project && (
            <span className="task-project-chip" style={{ color: task.project.color }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2 7a2 2 0 012-2h4l2 3h10a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V7z"/>
              </svg>
              {task.project.title}
            </span>
          )}
          {dueDateInfo && (
            <span className={`task-due ${dueDateInfo.overdue ? 'overdue' : ''} ${dueDateInfo.today ? 'today' : ''}`}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              {dueDateInfo.label}
            </span>
          )}
        </div>
      </div>

      {/* Hover actions */}
      {hovered && !isDone && (
        <div className="task-actions">
          <button className="task-action-btn" onClick={() => onEdit?.(task)} title="Edit">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button className="task-action-btn danger" onClick={(e) => { e.stopPropagation(); onDelete?.(task); }} title="Delete">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
            </svg>
          </button>
        </div>
      )}

      {/* Priority dot */}
      <div className="task-priority-dot" style={{ background: priority.color }} title={priority.label} />
    </div>
  );
}
