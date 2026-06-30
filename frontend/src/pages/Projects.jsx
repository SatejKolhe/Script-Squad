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

const defaultForm = {
  title: '', description: '', color: '#6366f1', status: 'active', dueDate: '',
};

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
    setShowModal(true);
  };

  const validateForm = () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Title is required';
    else if (form.title.length > 100) e.title = 'Max 100 characters';
    if (form.description.length > 500) e.description = 'Max 500 characters';
    return e;
  };

  const handleSave = async () => {
    const errors = validateForm();
    if (Object.keys(errors).length) { setFormErrors(errors); return; }
    setSaving(true);
    try {
      if (editingProject) {
        const res = await api.put(`/projects/${editingProject._id}`, form);
        setProjects((prev) => prev.map((p) => p._id === editingProject._id ? { ...p, ...res.data.data } : p));
        toast.success('Project updated!');
      } else {
        const res = await api.post('/projects', form);
        setProjects((prev) => [{ ...res.data.data, taskCount: 0, completedCount: 0 }, ...prev]);
        toast.success('Project created! 🎉');
      }
      setShowModal(false);
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
          {/* Search */}
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
          {/* Status filter */}
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
              {/* Color bar */}
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
                      ✏️
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
                      🗑️
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
                    <span className="text-xs" style={{ color: project.color }}>
                      {project.taskCount ? Math.round(((project.completedCount || 0) / project.taskCount) * 100) : 0}%
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${project.taskCount ? Math.round(((project.completedCount || 0) / project.taskCount) * 100) : 0}%`,
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
        onClose={() => setShowModal(false)}
        title={editingProject ? 'Edit Project' : 'New Project'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button
              id="save-project-btn"
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? <><div className="spinner spinner-sm" /> Saving...</> : editingProject ? 'Save Changes' : 'Create Project'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Project Title *</label>
          <input
            id="project-title-input"
            type="text"
            className={`form-input ${formErrors.title ? 'error' : ''}`}
            placeholder="My Awesome Project"
            value={form.title}
            onChange={(e) => { setForm((p) => ({ ...p, title: e.target.value })); setFormErrors((p) => ({ ...p, title: '' })); }}
            autoFocus
          />
          {formErrors.title && <span className="form-error">{formErrors.title}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea
            className={`form-textarea ${formErrors.description ? 'error' : ''}`}
            placeholder="What is this project about?"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          />
          {formErrors.description && <span className="form-error">{formErrors.description}</span>}
        </div>

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
