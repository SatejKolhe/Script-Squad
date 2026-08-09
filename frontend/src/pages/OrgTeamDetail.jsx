import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import Modal, { ConfirmModal } from '../components/Modal';

export default function OrgTeamDetail() {
  const { id } = useParams();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('members'); // members, projects, tasks

  useEffect(() => {
    fetchTeamDetail();
  }, [id]);

  const fetchTeamDetail = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/orgTeams/${id}`);
      if (res.data.success) {
        setTeam(res.data.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch team');
    } finally {
      setLoading(false);
    }
  };

  const copyJoinCode = () => {
    if (!team?.joinCode) return;
    navigator.clipboard.writeText(team.joinCode);
    toast.success('Join code copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
        <div className="spinner spinner-lg"></div>
      </div>
    );
  }

  if (!team) return null;

  return (
    <div className="page-container animate-fadeIn org-teams-page">
      <div className="org-team-detail-header">
        <div className="org-team-detail-info">
          <div className="org-team-detail-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <div>
            <h1 className="org-team-detail-title">{team.name}</h1>
            <p className="org-team-detail-desc">{team.description}</p>
          </div>
        </div>
        <div className="org-team-detail-actions">
          {team.myRole === 'leader' && (
            <div className="join-code-display" style={{ marginTop: 0, padding: '0.5rem 1rem', fontSize: '1rem' }}>
              <span>Code: <strong>{team.joinCode}</strong></span>
              <button className="btn-icon btn-sm" onClick={copyJoinCode} title="Copy Code" style={{ marginLeft: '1rem' }}>
                📋
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="org-team-tabs">
        <button
          className={`org-team-tab ${activeTab === 'members' ? 'active' : ''}`}
          onClick={() => setActiveTab('members')}
        >
          Members ({team.memberCount})
        </button>
        <button
          className={`org-team-tab ${activeTab === 'projects' ? 'active' : ''}`}
          onClick={() => setActiveTab('projects')}
        >
          Projects
        </button>
        {team.myRole === 'leader' && (
          <button
            className={`org-team-tab ${activeTab === 'tasks' ? 'active' : ''}`}
            onClick={() => setActiveTab('tasks')}
          >
            Assign Task
          </button>
        )}
      </div>

      <div className="org-team-tab-content">
        {activeTab === 'members' && <MembersTab team={team} />}
        {activeTab === 'projects' && <ProjectsTab team={team} />}
        {activeTab === 'tasks' && team.myRole === 'leader' && <AssignTaskTab team={team} />}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────
// MEMBERS TAB
// ────────────────────────────────────────────────────────
function MembersTab({ team }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);

  useEffect(() => {
    fetchMembers();
  }, [team._id]);

  const fetchMembers = async () => {
    try {
      const res = await api.get(`/orgTeams/${team._id}/members`);
      if (res.data.success) {
        setMembers(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to fetch members');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!removeTarget) return;
    try {
      const res = await api.delete(`/orgTeams/${team._id}/members/${removeTarget.userId._id}`);
      if (res.data.success) {
        toast.success(res.data.message);
        fetchMembers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove member');
    } finally {
      setRemoveTarget(null);
    }
  };

  const handleMakeLeader = async (memberId) => {
    try {
      const res = await api.put(`/orgTeams/${team._id}/members/${memberId}/role`, { role: 'leader' });
      if (res.data.success) {
        toast.success('Member promoted to leader!');
        fetchMembers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to promote member');
    }
  };

  const handleMakeMember = async (memberId) => {
    try {
      const res = await api.put(`/orgTeams/${team._id}/members/${memberId}/demote`);
      if (res.data.success) {
        toast.success('Leader demoted to member!');
        fetchMembers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to demote leader');
    }
  };

  return (
    <div>
      {team.myRole === 'leader' && (
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={() => setShowInviteModal(true)}>
            + Add Team Member
          </button>
        </div>
      )}

      {loading ? (
        <div className="spinner" style={{ margin: '0 auto' }}></div>
      ) : (
        <div className="member-list">
          {members.map((m) => {
            const isMe = m.userId._id === team.myRole; // wait, myRole is string. We don't have my user ID easily here, but we can check if it's the current user later if needed.
            return (
              <div key={m._id} className="member-card">
                <div className="member-info">
                  <div className="member-avatar">
                    {m.userId.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="member-details">
                    <h3>{m.userId.name}</h3>
                    <p>{m.userId.email}</p>
                  </div>
                  <span className={`badge ${m.role === 'leader' ? 'badge-success' : 'badge-secondary'}`} style={{ marginLeft: '1rem' }}>
                    {m.role}
                  </span>
                </div>
                <div className="member-actions" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {team.myRole === 'leader' && m.role !== 'leader' && (
                    <button
                      className="btn-icon text-muted"
                      style={{ fontSize: '1.25rem' }}
                      onClick={() => handleMakeLeader(m.userId._id)}
                      title="Make Leader"
                    >
                      👑
                    </button>
                  )}
                  {team.myRole === 'leader' && m.role === 'leader' && (
                    <button
                      className="btn-icon text-muted"
                      style={{ fontSize: '1.25rem', transform: 'rotate(180deg)' }}
                      onClick={() => handleMakeMember(m.userId._id)}
                      title="Make Member (Demote)"
                    >
                      👑
                    </button>
                  )}
                  {team.myRole === 'leader' && (
                    <button
                      className="btn-icon text-muted hover-danger"
                      onClick={() => setRemoveTarget(m)}
                      title="Remove Member"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showInviteModal && (
        <InviteMemberModal team={team} onClose={() => setShowInviteModal(false)} />
      )}

      <ConfirmModal
        isOpen={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        onConfirm={handleRemoveMember}
        title="Remove Member"
        message={`Are you sure you want to remove ${removeTarget?.userId?.name} from the team?`}
        confirmText="Remove"
      />
    </div>
  );
}

function InviteMemberModal({ team, onClose }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [invitingId, setInvitingId] = useState(null);
  const [intendedRoles, setIntendedRoles] = useState({});

  useEffect(() => {
    const timer = setTimeout(() => {
      if (search.trim().length >= 2) {
        handleSearch();
      } else {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleSearch = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/orgTeams/${team._id}/search?q=${encodeURIComponent(search)}`);
      if (res.data.success) {
        setResults(res.data.data);
      }
    } catch (err) {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (user) => {
    try {
      setInvitingId(user._id);
      const role = intendedRoles[user._id] || 'member';
      const res = await api.post(`/orgTeams/${team._id}/invite`, { email: user.email, intendedRole: role });
      if (res.data.success) {
        toast.success('Invite sent!');
        setResults(prev => prev.map(u => u._id === user._id ? { ...u, inviteStatus: 'pending' } : u));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send invite');
    } finally {
      setInvitingId(null);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Invite Team Member</h2>
          <button className="close-btn" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <label>Search by Name or Email</label>
          <input
            type="text"
            className="form-input"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>
        
        <div style={{ minHeight: '150px', maxHeight: '300px', overflowY: 'auto', paddingRight: '0.5rem' }}>
          {loading ? (
            <div className="spinner" style={{ margin: '2rem auto' }}></div>
          ) : results.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {results.map(user => (
                <div key={user._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--brand-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{user.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{user.email}</div>
                    </div>
                  </div>
                  
                  {user.inviteStatus === 'member' ? (
                    <span className="badge badge-success">Member</span>
                  ) : user.inviteStatus === 'pending' ? (
                    <span className="badge badge-todo">Requested</span>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem', color: 'var(--text-secondary)', marginRight: '1rem', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={intendedRoles[user._id] === 'leader'}
                          onChange={(e) => setIntendedRoles(prev => ({ ...prev, [user._id]: e.target.checked ? 'leader' : 'member' }))}
                        /> 
                        Add as Leader
                      </label>
                      <button 
                        className="btn btn-primary btn-sm" 
                        onClick={() => handleInvite(user)}
                        disabled={invitingId === user._id}
                      >
                        {invitingId === user._id ? 'Sending...' : 'Invite'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : search.trim().length >= 2 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0' }}>No users found matching "{search}"</div>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0' }}>Type at least 2 characters to search</div>
          )}
        </div>
        
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────
// PROJECTS TAB
// ────────────────────────────────────────────────────────
function ProjectsTab({ team }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProjects();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      if (search) query.append('search', search);
      if (statusFilter !== 'all') query.append('status', statusFilter);

      const res = await api.get(`/orgTeams/${team._id}/projects?${query.toString()}`);
      if (res.data.success) {
        setProjects(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="search-filters-row" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <input
          type="text"
          className="form-input"
          placeholder="Search projects..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flexGrow: 1 }}
        />
        <select
          className="form-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ width: 'auto' }}
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={() => setShowAddModal(true)}>
            + Add Existing
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            + Create New
          </button>
        </div>
      </div>

      {loading ? (
        <div className="spinner" style={{ margin: '0 auto' }}></div>
      ) : projects.length > 0 ? (
        <div className="projects-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {projects.map((p) => (
            <Link to={`/projects/${p._id}`} key={p._id} className="card project-card" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="project-card-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: p.color }}></div>
                  <span className="badge badge-secondary">{p.status}</span>
                </div>
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>{p.title}</h3>
              <div style={{ marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  <span>Progress</span>
                  <span>{p.progress}%</span>
                </div>
                <div style={{ height: '6px', background: 'var(--bg-hover)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: p.color, width: `${p.progress}%` }}></div>
                </div>
                <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {p.taskCount} tasks
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-state card">
          <div className="empty-icon">📁</div>
          <h3>No projects found</h3>
          <p>This team has no projects matching your filters.</p>
        </div>
      )}

      {showAddModal && (
        <AddProjectModal team={team} onClose={() => setShowAddModal(false)} onSuccess={fetchProjects} />
      )}
      {showCreateModal && (
        <CreateProjectModal team={team} onClose={() => setShowCreateModal(false)} onSuccess={fetchProjects} />
      )}
    </div>
  );
}

function CreateProjectModal({ team, onClose, onSuccess }) {
  const [form, setForm] = useState({ title: '', description: '', color: '#3b82f6' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Project title is required');
    try {
      setSaving(true);
      const res = await api.post('/projects', { ...form, orgTeamId: team._id });
      if (res.data.success) {
        toast.success('Project created and added to team!');
        onSuccess();
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create project');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Create New Project</h2>
          <button className="close-btn" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label>Project Title *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Website Redesign"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              autoFocus
            />
          </div>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label>Description</label>
            <textarea
              className="form-textarea"
              placeholder="What is this project about?"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
            />
          </div>
          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label>Project Color</label>
            <input
              type="color"
              className="form-input"
              style={{ padding: '0.25rem', height: '40px', width: '100px' }}
              value={form.color}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
            />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddProjectModal({ team, onClose, onSuccess }) {
  const [projects, setProjects] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // fetch all projects I own
    api.get('/projects').then(res => {
      // Filter only those not belonging to any team
      const unassigned = res.data.data.filter(p => !p.orgTeamId);
      setProjects(unassigned);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedId) return toast.error('Please select a project');
    try {
      setSaving(true);
      const res = await api.post(`/orgTeams/${team._id}/projects`, { projectId: selectedId });
      if (res.data.success) {
        toast.success('Project added to team!');
        onSuccess();
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add project');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Add Existing Project</h2>
          <button className="close-btn" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          {loading ? (
            <div className="spinner"></div>
          ) : (
            <div className="form-group">
              <label>Select Project</label>
              <select className="form-select" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                <option value="">-- Choose a project --</option>
                {projects.map(p => (
                  <option key={p._id} value={p._id}>{p.title}</option>
                ))}
              </select>
              {projects.length === 0 && (
                <p style={{ marginTop: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                  You don't have any unassigned projects. Create one in the Projects tab first.
                </p>
              )}
            </div>
          )}
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving || projects.length === 0}>
              {saving ? 'Adding...' : 'Add Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────
// ASSIGN TASK TAB
// ────────────────────────────────────────────────────────
function AssignTaskTab({ team }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
    status: 'todo',
    assignees: [], // array of user IDs
    project: '', // project ID
  });

  const [members, setMembers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loadingForm, setLoadingForm] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Load members and team projects
    Promise.all([
      api.get(`/orgTeams/${team._id}/members`),
      api.get(`/orgTeams/${team._id}/projects`),
    ]).then(([memRes, projRes]) => {
      setMembers(memRes.data.data);
      setProjects(projRes.data.data);
      setLoadingForm(false);
    }).catch(() => {
      toast.error('Failed to load form data');
      setLoadingForm(false);
    });
  }, [team._id]);

  const handleToggleAssignee = (userId) => {
    setForm(prev => {
      const current = prev.assignees;
      if (current.includes(userId)) {
        return { ...prev, assignees: current.filter(id => id !== userId) };
      } else {
        return { ...prev, assignees: [...current, userId] };
      }
    });
  };

  const handleAIAnalyze = async (e) => {
    const file = e.target.files?.[0];
    if (!file && !form.title.trim()) {
      return toast.error('Please provide a title or upload a file for AI parsing.');
    }
    
    setAiLoading(true);
    try {
      if (file) {
        const reader = new FileReader();
        reader.onload = async (evt) => {
          try {
            let base64 = evt.target.result;
            if (base64.includes(',')) base64 = base64.split(',')[1];
            
            const res = await api.post('/ai/extract-task', {
              fileName: file.name,
              mimeType: file.type,
              fileData: base64
            });
            if (res.data.success && res.data.task) {
              setForm(prev => ({
                ...prev,
                title: res.data.task.title || prev.title,
                description: res.data.task.description || prev.description,
                priority: res.data.task.priority || prev.priority
              }));
              toast.success('✨ AI extracted task from file!');
            }
          } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to analyze file with AI.');
          } finally {
            setAiLoading(false);
          }
        };
        reader.onerror = () => {
          toast.error('Failed to read file.');
          setAiLoading(false);
        };
        reader.readAsDataURL(file);
      } else {
        const res = await api.post('/ai/extract-task', { text: form.title });
        if (res.data.success && res.data.task) {
          setForm(prev => ({
            ...prev,
            title: res.data.task.title || prev.title,
            description: res.data.task.description || prev.description,
            priority: res.data.task.priority || prev.priority
          }));
          toast.success(form.title.trim() ? '✨ AI smart-parsed your task!' : '✨ AI generated a task suggestion!');
        }
        setAiLoading(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'AI service error.');
      setAiLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Task title is required');
    if (!form.project) return toast.error('Please select a project');
    if (form.assignees.length === 0) return toast.error('Please select at least one assignee');

    try {
      setSaving(true);
      const res = await api.post('/tasks', form);
      if (res.data.success) {
        toast.success('Shared task assigned successfully!');
        setForm({ title: '', description: '', priority: 'medium', dueDate: '', status: 'todo', assignees: [], project: '' });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign task');
    } finally {
      setSaving(false);
    }
  };

  if (loadingForm) return <div className="spinner"></div>;

  return (
    <div className="card" style={{ padding: '2rem', maxWidth: '800px' }}>
      <h2 style={{ marginBottom: '1.5rem', fontWeight: 600 }}>Create Shared Task</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <label>Task Title *</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              className="form-input"
              placeholder="What needs to be done?"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="image/*,application/pdf,text/plain"
              onChange={handleAIAnalyze}
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                if (!form.title.trim()) {
                  fileInputRef.current?.click();
                } else {
                  handleAIAnalyze({ target: {} }); // no file, just text
                }
              }}
              disabled={aiLoading}
              title={form.title.trim() ? "Smart Parse with AI" : "Upload File for AI Parsing"}
            >
              {aiLoading ? '⏳' : '✨ AI'}
            </button>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <label>Description</label>
          <textarea
            className="form-textarea"
            placeholder="Details..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={4}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
          <div className="form-group">
            <label>Project *</label>
            <select
              className="form-select"
              value={form.project}
              onChange={(e) => setForm({ ...form, project: e.target.value })}
            >
              <option value="">-- Select Team Project --</option>
              {projects.map(p => (
                <option key={p._id} value={p._id}>{p.title}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Due Date</label>
            <input
              type="date"
              className="form-input"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
          <div className="form-group">
            <label>Priority</label>
            <select
              className="form-select"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="form-group">
            <label>Assignees * (Multi-select)</label>
            <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem', maxHeight: '120px', overflowY: 'auto' }}>
              {members.map(m => (
                <label key={m.userId._id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem' }}>
                  <input
                    type="checkbox"
                    checked={form.assignees.includes(m.userId._id)}
                    onChange={() => handleToggleAssignee(m.userId._id)}
                  />
                  <span>{m.userId.name}</span>
                </label>
              ))}
              {members.length === 0 && <span style={{ color: 'var(--text-muted)' }}>No members found.</span>}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Assigning...' : 'Assign Shared Task'}
          </button>
        </div>
      </form>
    </div>
  );
}
