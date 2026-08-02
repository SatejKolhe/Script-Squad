import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import TaskItem from '../components/TaskItem';
import './FiltersLabels.css';

const PRESET_COLORS = [
  '#ef4444','#f97316','#eab308','#10b981','#06b6d4',
  '#6366f1','#8b5cf6','#ec4899','#64748b','#78716c',
];

const BUILT_IN_FILTERS = [
  {
    id: 'priority-urgent',
    label: 'Priority 1',
    icon: '🚩',
    color: '#ef4444',
    query: { priority: 'urgent' },
  },
  {
    id: 'priority-high',
    label: 'Priority 2',
    icon: '🚩',
    color: '#f97316',
    query: { priority: 'high' },
  },
  {
    id: 'priority-medium',
    label: 'Priority 3',
    icon: '🚩',
    color: '#eab308',
    query: { priority: 'medium' },
  },
  {
    id: 'no-date',
    label: 'No due date',
    icon: '📅',
    color: '#8b5cf6',
    query: { noDate: true },
  },
  {
    id: 'assigned-me',
    label: 'Assigned to me',
    icon: '👤',
    color: '#06b6d4',
    query: { assignedMe: true },
  },
  {
    id: 'all-tasks',
    label: 'All tasks',
    icon: '📋',
    color: '#6366f1',
    query: {},
  },
];

export default function FiltersLabels() {
  const [activeFilter, setActiveFilter] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // Label management
  const [labels, setLabels] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ss_labels') || '[]'); } catch { return []; }
  });
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#6366f1');
  const [editingLabel, setEditingLabel] = useState(null);

  // Persist labels
  useEffect(() => {
    localStorage.setItem('ss_labels', JSON.stringify(labels));
  }, [labels]);

  const loadFilterTasks = useCallback(async (filter) => {
    setLoadingTasks(true);
    setTasks([]);
    try {
      let url = '/tasks?';
      if (filter.query.priority) url += `priority=${filter.query.priority}&`;
      if (filter.query.assignedMe) url += `assignedMe=true&`;
      // noDate handled client-side after fetch
      const res = await api.get(url.replace(/&$/, ''));
      let data = res.data.data || [];
      if (filter.query.noDate) {
        data = data.filter(t => !t.dueDate);
      }
      setTasks(data);
    } catch {
      toast.error('Failed to load tasks');
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  const loadLabelTasks = useCallback(async (label) => {
    setLoadingTasks(true);
    setTasks([]);
    try {
      const res = await api.get(`/tasks?label=${encodeURIComponent(label.name)}`);
      setTasks(res.data.data || []);
    } catch {
      toast.error('Failed to load tasks');
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  const handleFilterClick = (filter) => {
    setActiveFilter({ type: 'filter', ...filter });
    loadFilterTasks(filter);
  };

  const handleLabelClick = (label) => {
    setActiveFilter({ type: 'label', ...label });
    loadLabelTasks(label);
  };

  const addLabel = () => {
    if (!newLabelName.trim()) return;
    const label = { id: Date.now().toString(), name: newLabelName.trim(), color: newLabelColor };
    setLabels(prev => [...prev, label]);
    setNewLabelName('');
    setNewLabelColor('#6366f1');
    toast.success('Label created');
  };

  const deleteLabel = (id) => {
    setLabels(prev => prev.filter(l => l.id !== id));
    if (activeFilter?.id === id) { setActiveFilter(null); setTasks([]); }
    toast.success('Label deleted');
  };

  const saveEditLabel = () => {
    if (!editingLabel || !editingLabel.name.trim()) return;
    setLabels(prev => prev.map(l => l.id === editingLabel.id ? editingLabel : l));
    setEditingLabel(null);
    toast.success('Label updated');
  };

  const handleComplete = async (task) => {
    try {
      const res = await api.put(`/tasks/${task._id}`, { status: task.status === 'done' ? 'todo' : 'done' });
      setTasks(prev => prev.map(t => t._id === task._id ? res.data.data : t));
    } catch {
      toast.error('Failed to update task');
    }
  };

  const handleDelete = async (task) => {
    try {
      await api.delete(`/tasks/${task._id}`);
      setTasks(prev => prev.filter(t => t._id !== task._id));
    } catch {
      toast.error('Failed to delete task');
    }
  };

  return (
    <div className="fl-page">
      <div className="fl-sidebar-panel">
        {/* Filters section */}
        <div className="fl-section">
          <div className="fl-section-header">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            <span>Filters</span>
          </div>
          {BUILT_IN_FILTERS.map(f => (
            <button
              key={f.id}
              className={`fl-item ${activeFilter?.id === f.id ? 'active' : ''}`}
              onClick={() => handleFilterClick(f)}
            >
              <span className="fl-item-icon" style={{ color: f.color }}>{f.icon}</span>
              <span className="fl-item-label">{f.label}</span>
            </button>
          ))}
        </div>

        {/* Labels section */}
        <div className="fl-section">
          <div className="fl-section-header">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
            </svg>
            <span>Labels</span>
          </div>

          {labels.map(label => (
            <div
              key={label.id}
              className={`fl-label-item ${activeFilter?.id === label.id ? 'active' : ''}`}
            >
              <button
                className="fl-label-main"
                onClick={() => handleLabelClick(label)}
              >
                <span className="fl-label-dot" style={{ background: label.color }} />
                <span className="fl-item-label">@{label.name}</span>
              </button>
              <div className="fl-label-actions">
                <button
                  className="fl-label-edit-btn"
                  onClick={(e) => { e.stopPropagation(); setEditingLabel({ ...label }); }}
                  title="Edit"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button
                  className="fl-label-del-btn"
                  onClick={(e) => { e.stopPropagation(); deleteLabel(label.id); }}
                  title="Delete"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                </button>
              </div>
            </div>
          ))}

          {/* Add label form */}
          <div className="fl-add-label-form">
            <input
              className="fl-label-input"
              placeholder="New label name…"
              value={newLabelName}
              onChange={e => setNewLabelName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addLabel(); }}
              maxLength={50}
            />
            <div className="fl-color-row">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  className={`fl-color-swatch ${newLabelColor === c ? 'active' : ''}`}
                  style={{ background: c }}
                  onClick={() => setNewLabelColor(c)}
                />
              ))}
            </div>
            <button
              className="fl-add-btn"
              onClick={addLabel}
              disabled={!newLabelName.trim()}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add label
            </button>
          </div>
        </div>
      </div>

      {/* Task view panel */}
      <div className="fl-task-panel">
        {activeFilter ? (
          <>
            <div className="fl-task-panel-header">
              <span className="fl-panel-icon" style={{ color: activeFilter.color }}>
                {activeFilter.type === 'label' ? (
                  <span className="fl-panel-dot" style={{ background: activeFilter.color }} />
                ) : activeFilter.icon}
              </span>
              <div>
                <h2 className="fl-panel-title">
                  {activeFilter.type === 'label' ? `@${activeFilter.name}` : activeFilter.label}
                </h2>
                {!loadingTasks && (
                  <p className="fl-panel-count">{tasks.filter(t => t.status !== 'done').length} tasks</p>
                )}
              </div>
            </div>

            {loadingTasks ? (
              <div className="fl-loading">
                {[...Array(4)].map((_, i) => <div key={i} className="task-skeleton" />)}
              </div>
            ) : tasks.length === 0 ? (
              <div className="fl-empty">
                <div className="fl-empty-icon">🔍</div>
                <p>No tasks match this filter</p>
              </div>
            ) : (
              <div className="fl-task-list">
                {tasks.filter(t => t.status !== 'done').map(task => (
                  <TaskItem
                    key={task._id}
                    task={task}
                    onComplete={handleComplete}
                    onDelete={handleDelete}
                    onEdit={() => {}}
                  />
                ))}
                {tasks.filter(t => t.status === 'done').length > 0 && (
                  <div className="fl-completed-note">
                    + {tasks.filter(t => t.status === 'done').length} completed
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="fl-placeholder">
            <div className="fl-placeholder-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.25 }}>
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
              </svg>
            </div>
            <h3>Select a filter or label</h3>
            <p>Choose from the left panel to view matching tasks</p>
          </div>
        )}
      </div>

      {/* Edit label modal */}
      {editingLabel && (
        <div className="edit-overlay" onClick={() => setEditingLabel(null)}>
          <div className="edit-modal" onClick={e => e.stopPropagation()}>
            <h3>Edit Label</h3>
            <input
              className="edit-modal-input"
              value={editingLabel.name}
              onChange={e => setEditingLabel(p => ({ ...p, name: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') saveEditLabel(); }}
              autoFocus
            />
            <div className="fl-color-row" style={{ marginBottom: '1rem' }}>
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  className={`fl-color-swatch ${editingLabel.color === c ? 'active' : ''}`}
                  style={{ background: c }}
                  onClick={() => setEditingLabel(p => ({ ...p, color: c }))}
                />
              ))}
            </div>
            <div className="edit-modal-actions">
              <button className="edit-cancel" onClick={() => setEditingLabel(null)}>Cancel</button>
              <button className="edit-save" onClick={saveEditLabel}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
