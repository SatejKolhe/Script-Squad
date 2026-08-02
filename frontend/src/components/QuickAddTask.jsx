import React, { useState, useRef, useEffect } from 'react';
import { api } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import './QuickAddTask.css';

const PRIORITIES = [
  { value: 'urgent', label: 'Priority 1', color: '#ef4444', icon: '🚩' },
  { value: 'high',   label: 'Priority 2', color: '#f97316', icon: '🚩' },
  { value: 'medium', label: 'Priority 3', color: '#eab308', icon: '🚩' },
  { value: 'low',    label: 'Priority 4', color: '#6366f1', icon: '🚩' },
];

const PRESET_COLORS = [
  '#ef4444','#f97316','#eab308','#10b981','#06b6d4','#6366f1','#8b5cf6','#ec4899','#64748b','#78716c',
];

export default function QuickAddTask({ onTaskAdded, defaultProject = null, defaultDueDate = null, placeholder = 'Task name', onCancel }) {
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(defaultDueDate || '');
  const [priority, setPriority] = useState('medium');
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [showLabelMenu, setShowLabelMenu] = useState(false);
  const [labels, setLabels] = useState([]);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#6366f1');
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(defaultProject);
  const [showProjectMenu, setShowProjectMenu] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const titleRef = useRef(null);
  const wrapperRef = useRef(null);

  // Fetch projects for the project selector
  useEffect(() => {
    api.get('/projects').then(res => {
      setProjects(res.data.data || []);
    }).catch(() => {});
  }, []);

  // Focus title when expanding
  useEffect(() => {
    if (expanded) {
      setTimeout(() => titleRef.current?.focus(), 50);
    }
  }, [expanded]);

  // Close menus when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowPriorityMenu(false);
        setShowLabelMenu(false);
        setShowProjectMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedPriority = PRIORITIES.find(p => p.value === priority);

  const addLabel = () => {
    if (!newLabelName.trim()) return;
    setLabels(prev => [...prev, { name: newLabelName.trim(), color: newLabelColor }]);
    setNewLabelName('');
    setNewLabelColor('#6366f1');
  };

  const removeLabel = (idx) => {
    setLabels(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!title.trim()) {
      titleRef.current?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        priority,
        labels,
        ...(dueDate ? { dueDate } : {}),
        ...(selectedProject ? { project: selectedProject._id } : {}),
      };
      const res = await api.post('/tasks', payload);
      toast.success('Task added!');
      onTaskAdded?.(res.data.data);
      // Reset
      setTitle('');
      setDescription('');
      setDueDate(defaultDueDate || '');
      setPriority('medium');
      setLabels([]);
      setSelectedProject(defaultProject);
      setExpanded(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add task');
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && e.target === titleRef.current) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      setExpanded(false);
      onCancel?.();
    }
  };

  if (!expanded) {
    return (
      <button className="quick-add-trigger" onClick={() => setExpanded(true)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        <span>Add task</span>
      </button>
    );
  }

  return (
    <div className="quick-add-form" ref={wrapperRef} onKeyDown={handleKeyDown}>
      {/* Title */}
      <input
        ref={titleRef}
        className="quick-add-title"
        placeholder={placeholder}
        value={title}
        onChange={e => setTitle(e.target.value)}
        maxLength={200}
      />

      {/* Description */}
      <textarea
        className="quick-add-desc"
        placeholder="Description"
        value={description}
        onChange={e => setDescription(e.target.value)}
        rows={2}
        maxLength={1000}
      />

      {/* Labels preview */}
      {labels.length > 0 && (
        <div className="quick-add-labels-preview">
          {labels.map((l, i) => (
            <span key={i} className="quick-add-label-tag" style={{ background: l.color + '22', color: l.color, borderColor: l.color + '44' }}>
              @{l.name}
              <button onClick={() => removeLabel(i)}>×</button>
            </span>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div className="quick-add-toolbar">
        <div className="quick-add-toolbar-left">
          {/* Due date */}
          <input
            type="date"
            className="quick-add-date-input"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            title="Due date"
          />

          {/* Priority */}
          <div className="qa-dropdown-wrap">
            <button
              className="qa-toolbar-btn"
              style={{ color: selectedPriority?.color }}
              onClick={() => { setShowPriorityMenu(v => !v); setShowLabelMenu(false); setShowProjectMenu(false); }}
              title="Set priority"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 3h18l-9 9V21l-4-2V12L3 3z"/>
              </svg>
              <span style={{ fontSize: '0.72rem' }}>{selectedPriority?.label}</span>
            </button>
            {showPriorityMenu && (
              <div className="qa-dropdown">
                {PRIORITIES.map(p => (
                  <button
                    key={p.value}
                    className={`qa-dropdown-item ${priority === p.value ? 'selected' : ''}`}
                    onClick={() => { setPriority(p.value); setShowPriorityMenu(false); }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill={p.color}>
                      <path d="M3 3h18l-9 9V21l-4-2V12L3 3z"/>
                    </svg>
                    <span>{p.label}</span>
                  </button>
                ))}
                <button className="qa-dropdown-item" onClick={() => { setPriority('medium'); setShowPriorityMenu(false); }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                  <span>Clear</span>
                </button>
              </div>
            )}
          </div>

          {/* Labels */}
          <div className="qa-dropdown-wrap">
            <button
              className="qa-toolbar-btn"
              onClick={() => { setShowLabelMenu(v => !v); setShowPriorityMenu(false); setShowProjectMenu(false); }}
              title="Add label"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
              </svg>
              <span style={{ fontSize: '0.72rem' }}>Label</span>
            </button>
            {showLabelMenu && (
              <div className="qa-dropdown qa-label-dropdown">
                <div className="qa-label-form">
                  <input
                    className="qa-label-input"
                    placeholder="Label name"
                    value={newLabelName}
                    onChange={e => setNewLabelName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addLabel(); } }}
                  />
                  <div className="qa-color-row">
                    {PRESET_COLORS.map(c => (
                      <button
                        key={c}
                        className={`qa-color-swatch ${newLabelColor === c ? 'active' : ''}`}
                        style={{ background: c }}
                        onClick={() => setNewLabelColor(c)}
                      />
                    ))}
                  </div>
                  <button className="qa-add-label-btn" onClick={addLabel} disabled={!newLabelName.trim()}>
                    Add label
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Project */}
          <div className="qa-dropdown-wrap">
            <button
              className="qa-toolbar-btn"
              onClick={() => { setShowProjectMenu(v => !v); setShowPriorityMenu(false); setShowLabelMenu(false); }}
              title="Assign to project"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 7a2 2 0 012-2h4l2 3h10a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V7z"/>
              </svg>
              <span style={{ fontSize: '0.72rem' }}>{selectedProject ? selectedProject.title : 'Inbox'}</span>
            </button>
            {showProjectMenu && (
              <div className="qa-dropdown">
                <button
                  className={`qa-dropdown-item ${!selectedProject ? 'selected' : ''}`}
                  onClick={() => { setSelectedProject(null); setShowProjectMenu(false); }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
                    <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>
                  </svg>
                  <span>Inbox</span>
                </button>
                {projects.map(p => (
                  <button
                    key={p._id}
                    className={`qa-dropdown-item ${selectedProject?._id === p._id ? 'selected' : ''}`}
                    onClick={() => { setSelectedProject(p); setShowProjectMenu(false); }}
                  >
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: p.color, flexShrink: 0, display: 'inline-block' }} />
                    <span>{p.title}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Submit / Cancel */}
        <div className="quick-add-toolbar-right">
          <button className="qa-cancel-btn" onClick={() => { setExpanded(false); onCancel?.(); }}>Cancel</button>
          <button
            className="qa-submit-btn"
            onClick={handleSubmit}
            disabled={!title.trim() || submitting}
          >
            {submitting ? 'Adding…' : 'Add task'}
          </button>
        </div>
      </div>
    </div>
  );
}
