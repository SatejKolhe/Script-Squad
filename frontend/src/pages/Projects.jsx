import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../contexts/AuthContext';
import Modal, { ConfirmModal } from '../components/Modal';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import './Projects.css';

const PROJECT_COLORS = [
  '#6366f1', '#ec4899', '#06b6d4', '#10b981',
  '#f59e0b', '#ef4444', '#8b5cf6', '#f97316',
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
];

const PRIORITY_META = {
  high:   { label: 'High',   emoji: '🔴', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  medium: { label: 'Medium', emoji: '🟡', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  low:    { label: 'Low',    emoji: '🟢', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
};

const defaultForm = {
  title: '', description: '',  color: '#6366f1',
  status: 'active',
  dueDate: '',
  isPrivate: false,
};

// ── AI Suggestions Panel ──────────────────────────────────────────────────────
function AISuggestionsPanel({ suggestions, selected, onToggle, onSelectAll, onDeselectAll }) {
  const allSelected = suggestions.length > 0 && selected.size === suggestions.length;

  return (
    <div className="ai-suggestions-panel">
      <div className="ai-suggestions-header">
        <div className="ai-badge">
          <span className="ai-badge-icon">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2z"/>
            </svg>
          </span>
          <span>AI Suggested Tasks</span>
          <span className="ai-badge-count">{suggestions.length}</span>
        </div>
        <button
          className="ai-select-all-btn"
          onClick={allSelected ? onDeselectAll : onSelectAll}
        >
          {allSelected ? 'Deselect All' : 'Select All'}
        </button>
      </div>
      <p className="ai-suggestions-hint">
        Select the tasks you'd like to add to your project:
      </p>
      <div className="ai-task-list">
        {suggestions.map((task) => {
          const isSelected = selected.has(task.id);
          const p = PRIORITY_META[task.priority] || PRIORITY_META.medium;
          return (
            <label
              key={task.id}
              className={`ai-task-item ${isSelected ? 'selected' : ''}`}
              htmlFor={`ai-task-${task.id}`}
            >
              <input
                type="checkbox"
                id={`ai-task-${task.id}`}
                checked={isSelected}
                onChange={() => onToggle(task.id)}
                className="ai-task-checkbox"
              />
              <div className="ai-task-check-visual">
                {isSelected && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </div>
              <div className="ai-task-content">
                <div className="ai-task-title">{task.title}</div>
                {task.description && (
                  <div className="ai-task-desc">{task.description}</div>
                )}
              </div>
              <span className={`badge badge-${task.priority}`}>
                {p.label}
              </span>
            </label>
          );
        })}
      </div>
      {selected.size > 0 && (
        <div className="ai-selection-info" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span>{selected.size} task{selected.size > 1 ? 's' : ''} selected</span>
        </div>
      )}
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────
function AISuggestionsLoading() {
  return (
    <div className="ai-suggestions-loading">
      <div className="ai-loading-header">
        <div className="ai-loading-spinner">
          <div className="ai-spinner-ring" />
        </div>
        <div>
          <div className="ai-loading-title">Generating suggestions…</div>
          <div className="ai-loading-subtitle">Gemini AI is analyzing your project</div>
        </div>
      </div>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="ai-task-skeleton">
          <div className="skeleton ai-skeleton-check" />
          <div className="ai-skeleton-text">
            <div className="skeleton ai-skeleton-title" style={{ width: `${60 + i * 8}%` }} />
            <div className="skeleton ai-skeleton-desc" style={{ width: `${40 + i * 5}%` }} />
          </div>
          <div className="skeleton ai-skeleton-badge" />
        </div>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // AI state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState(new Set());

  const loadProjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/projects', { params });
      setProjects(res.data.data);
    } catch {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(loadProjects, 300);
    return () => clearTimeout(timer);
  }, [loadProjects]);

  const openCreate = () => {
    setEditingProject(null);
    setForm(defaultForm);
    setFormErrors({});
    setAiSuggestions([]);
    setSelectedTaskIds(new Set());
    setShowModal(true);
  };

  const openEdit = (e, project) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingProject(project);
    setForm({
      title: project.title,
      description: project.description || '',
      color: project.color,
      status: project.status,
      dueDate: project.dueDate ? project.dueDate.split('T')[0] : '',
      isPrivate: project.isPrivate || false,
    });
    setFormErrors({});
    setAiSuggestions([]);
    setSelectedTaskIds(new Set());
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setAiSuggestions([]);
    setSelectedTaskIds(new Set());
  };

  const validateForm = () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Title is required';
    else if (form.title.length > 100) e.title = 'Max 100 characters';
    if (form.description.length > 500) e.description = 'Max 500 characters';
    return e;
  };

  // ── AI Suggest ──────────────────────────────────────────────────────────────
  const handleAISuggest = async () => {
    if (!form.title.trim()) {
      setFormErrors((p) => ({ ...p, title: 'Enter a project title first to get AI suggestions' }));
      return;
    }
    setAiLoading(true);
    setAiSuggestions([]);
    setSelectedTaskIds(new Set());
    try {
      const res = await api.post('/ai/suggest-tasks', {
        title: form.title,
        description: form.description,
      });
      setAiSuggestions(res.data.data);
      // Auto-select all by default
      setSelectedTaskIds(new Set(res.data.data.map((t) => t.id)));
      toast.success(`✨ ${res.data.data.length} AI task suggestions generated!`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'AI suggestion failed. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const toggleTaskSelection = (id) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAllTasks = () => setSelectedTaskIds(new Set(aiSuggestions.map((t) => t.id)));
  const deselectAllTasks = () => setSelectedTaskIds(new Set());

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const errors = validateForm();
    if (Object.keys(errors).length) { setFormErrors(errors); return; }
    setSaving(true);
    try {
      if (editingProject) {
        const res = await api.put(`/projects/${editingProject._id}`, form);
        setProjects((prev) =>
          prev.map((p) => p._id === editingProject._id ? { ...p, ...res.data.data } : p)
        );
        toast.success('Project updated!');
        handleCloseModal();
      } else {
        // 1. Create the project
        const res = await api.post('/projects', form);
        const newProject = res.data.data;

        // 2. Batch-create selected AI tasks (if any)
        const tasksToCreate = aiSuggestions.filter((t) => selectedTaskIds.has(t.id));
        if (tasksToCreate.length > 0) {
          await Promise.all(
            tasksToCreate.map((task) =>
              api.post('/tasks', {
                title: task.title,
                description: task.description,
                priority: task.priority,
                project: newProject._id,
              })
            )
          );
          toast.success(
            `🎉 Project created with ${tasksToCreate.length} AI-suggested task${tasksToCreate.length > 1 ? 's' : ''}!`
          );
        } else {
          toast.success('Project created! 🎉');
        }

        setProjects((prev) => [{
          ...newProject,
          taskCount: tasksToCreate.length,
          completedCount: 0,
        }, ...prev]);
        handleCloseModal();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save project');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/projects/${deleteTarget._id}`);
      setProjects((prev) => prev.filter((p) => p._id !== deleteTarget._id));
      toast.success('Project deleted');
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete project');
    }
  };

  const hasAiContent = aiLoading || aiSuggestions.length > 0;

  return (
    <div className="page-container animate-fadeIn">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-header-stats">
            <span className="project-count-badge">{projects.length} project{projects.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
        <div className="page-header-actions">
          <div className="search-bar" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              id="project-search"
            />
          </div>
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '140px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            id="status-filter"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button id="create-project-btn" className="btn btn-primary" onClick={openCreate}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* Projects grid */}
      {loading ? (
        <div className="loading-overlay"><div className="spinner spinner-lg" /></div>
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon" style={{ marginBottom: '0.5rem' }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
            </svg>
          </div>
          <div className="empty-state-title">No projects found</div>
          <div className="empty-state-desc">
            {search ? 'Try a different search term.' : 'Create your first project to get started!'}
          </div>
          {!search && (
            <button className="btn btn-primary" onClick={openCreate}>Create Project</button>
          )}
        </div>
      ) : (
        <div className="grid-auto">
          {projects.map((project) => (
            <Link key={project._id} to={`/projects/${project._id}`} className="project-card card animate-bounceIn">
              <div className="project-card-bar" style={{ background: project.color }} />
              <div className="project-card-body">
                <div className="project-card-header">
                  <div className="project-dot" style={{ background: project.color }} />
                  <div className="project-card-actions">
                    <button
                      id={`edit-project-${project._id}`}
                      className="btn-icon btn-sm"
                      onClick={(e) => openEdit(e, project)}
                      title="Edit project"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button
                      id={`delete-project-${project._id}`}
                      className="btn-icon btn-sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDeleteTarget(project);
                      }}
                      title="Delete project"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
                <h3 className="project-card-title">{project.title}</h3>
                {project.description && (
                  <p className="project-card-desc">{project.description}</p>
                )}
                <div className="project-card-footer">
                  <div className="project-progress-info">
                    <span className="text-xs text-muted">
                      {project.completedCount || 0}/{project.taskCount || 0} tasks
                    </span>
                    <span className="text-xs" style={{ color: '#2563eb', fontWeight: '600' }}>
                      {project.taskCount
                        ? Math.round(((project.completedCount || 0) / project.taskCount) * 100)
                        : 0}%
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${project.taskCount
                          ? Math.round(((project.completedCount || 0) / project.taskCount) * 100)
                          : 0}%`,
                        background: '#2563eb',
                      }}
                    />
                  </div>
                  <div className="project-card-meta">
                    <span className={`badge badge-${project.status}`}>{project.status}</span>
                    {project.dueDate && (
                      <span className="text-xs text-muted" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                        {format(new Date(project.dueDate), 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleCloseModal}
        title={editingProject ? 'Edit Project' : 'New Project'}
        size={hasAiContent && !editingProject ? 'lg' : 'md'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={handleCloseModal}>Cancel</button>
            <button
              id="save-project-btn"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving
                ? <><div className="spinner spinner-sm" /> Saving...</>
                : editingProject
                ? 'Save Changes'
                : aiSuggestions.length > 0 && selectedTaskIds.size > 0
                ? `Create Project + ${selectedTaskIds.size} Task${selectedTaskIds.size > 1 ? 's' : ''}`
                : 'Create Project'}
            </button>
          </>
        }
      >
        {/* Project title */}
        <div className="form-group">
          <label className="form-label">Project Title *</label>
          <input
            id="project-title-input"
            type="text"
            className={`form-input ${formErrors.title ? 'error' : ''}`}
            placeholder="My Awesome Project"
            value={form.title}
            onChange={(e) => {
              setForm((p) => ({ ...p, title: e.target.value }));
              setFormErrors((p) => ({ ...p, title: '' }));
              // Reset suggestions when title changes after generating
              if (aiSuggestions.length > 0) {
                setAiSuggestions([]);
                setSelectedTaskIds(new Set());
              }
            }}
            autoFocus
          />
          {formErrors.title && <span className="form-error">{formErrors.title}</span>}
        </div>

        {/* Description */}
        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea
            className={`form-textarea ${formErrors.description ? 'error' : ''}`}
            placeholder="What is this project about? The more detail, the better the AI suggestions!"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          />
          {formErrors.description && <span className="form-error">{formErrors.description}</span>}
        </div>

        {/* AI Suggest Button — only for new projects */}
        {!editingProject && (
          <button
            id="ai-suggest-btn"
            className={`btn-ai-suggest ${aiLoading ? 'loading' : ''}`}
            onClick={handleAISuggest}
            disabled={aiLoading}
            type="button"
          >
            {aiLoading ? (
              <>
                <div className="ai-btn-spinner" />
                Generating with Gemini AI…
              </>
            ) : aiSuggestions.length > 0 ? (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2z"/>
                </svg>
                Regenerate AI Suggestions
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2z"/>
                </svg>
                Suggest Tasks with AI
              </>
            )}
          </button>
        )}

        {/* AI Loading skeleton */}
        {aiLoading && <AISuggestionsLoading />}

        {/* AI Suggestions panel */}
        {!aiLoading && aiSuggestions.length > 0 && (
          <AISuggestionsPanel
            suggestions={aiSuggestions}
            selected={selectedTaskIds}
            onToggle={toggleTaskSelection}
            onSelectAll={selectAllTasks}
            onDeselectAll={deselectAllTasks}
          />
        )}

        {/* Color, Status, DueDate */}
        <div className="form-group">
          <label className="form-label">Project Color</label>
          <div className="color-picker">
            {PROJECT_COLORS.map((c) => (
              <button
                key={c}
                className={`color-swatch ${form.color === c ? 'active' : ''}`}
                style={{ background: c }}
                onClick={() => setForm((p) => ({ ...p, color: c }))}
                title={c}
              />
            ))}
          </div>
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Status</label>
            <select
              className="form-select"
              value={form.status}
              onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
            >
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Due Date</label>
            <input
              type="date"
              className="form-input"
              value={form.dueDate}
              onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
            />
          </div>
        </div>

        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
          <input 
            type="checkbox" 
            id="isPrivate" 
            checked={form.isPrivate} 
            onChange={(e) => setForm({ ...form, isPrivate: e.target.checked })}
            style={{ width: '1rem', height: '1rem', cursor: 'pointer' }}
          />
          <label htmlFor="isPrivate" style={{ margin: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {form.isPrivate ? '🔒 Private' : '🌍 Public'}
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 'normal' }}>
              {form.isPrivate ? '(Hidden from Friends)' : '(Visible to Friends)'}
            </span>
          </label>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Project"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This will permanently delete the project and all its tasks.`}
        confirmText="Yes, Delete"
      />
    </div>
  );
}
