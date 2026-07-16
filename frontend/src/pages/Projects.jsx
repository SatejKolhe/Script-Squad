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
  title: '', description: '', color: '#6366f1', status: 'active', dueDate: '',
};

// ── AI Suggestions Panel ──────────────────────────────────────────────────────
function AISuggestionsPanel({ suggestions, selected, onToggle, onSelectAll, onDeselectAll }) {
  const allSelected = suggestions.length > 0 && selected.size === suggestions.length;

  return (
    <div className="ai-suggestions-panel">
      <div className="ai-suggestions-header">
        <div className="ai-badge">
          <span className="ai-badge-icon">✨</span>
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
                {isSelected && <span className="ai-task-checkmark">✓</span>}
              </div>
              <div className="ai-task-content">
                <div className="ai-task-title">{task.title}</div>
                {task.description && (
                  <div className="ai-task-desc">{task.description}</div>
                )}
              </div>
              <span
                className="ai-priority-badge"
                style={{ color: p.color, background: p.bg }}
              >
                {p.emoji} {p.label}
              </span>
            </label>
          );
        })}
      </div>
      {selected.size > 0 && (
        <div className="ai-selection-info">
          <span>✅ {selected.size} task{selected.size > 1 ? 's' : ''} selected</span>
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
            <span className="project-count-badge">{projects.length} projects</span>
          </div>
        </div>
        <div className="page-header-actions">
          <div className="search-bar">
            <span>🔍</span>
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
            + New Project
          </button>
        </div>
      </div>

      {/* Projects grid */}
      {loading ? (
        <div className="loading-overlay"><div className="spinner spinner-lg" /></div>
      ) : projects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📁</div>
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
                    >✏️</button>
                    <button
                      id={`delete-project-${project._id}`}
                      className="btn-icon btn-sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDeleteTarget(project);
                      }}
                      title="Delete project"
                    >🗑️</button>
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
                    <span className="text-xs" style={{ color: project.color }}>
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
                        background: project.color,
                      }}
                    />
                  </div>
                  <div className="project-card-meta">
                    <span className={`badge badge-${project.status}`}>{project.status}</span>
                    {project.dueDate && (
                      <span className="text-xs text-muted">
                        📅 {format(new Date(project.dueDate), 'MMM d, yyyy')}
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
        title={editingProject ? 'Edit Project' : '✨ New Project'}
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
                ? `🚀 Create Project + ${selectedTaskIds.size} Task${selectedTaskIds.size > 1 ? 's' : ''}`
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
              <>✨ Regenerate AI Suggestions</>
            ) : (
              <>✨ Suggest Tasks with AI</>
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
