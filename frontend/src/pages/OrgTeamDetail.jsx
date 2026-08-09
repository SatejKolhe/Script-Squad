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
            <div className="join-code-display" style={{ marginTop: 0, padding: '0.45rem 0.85rem', fontSize: '0.9rem' }}>
              <span>Code: <strong>{team.joinCode}</strong></span>
              <button className="btn-icon btn-sm" onClick={copyJoinCode} title="Copy Code" style={{ marginLeft: '0.75rem' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
                </svg>
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
// 2) TEAMMATE TASKS VIEW (Sub-view of MembersTab)
// ────────────────────────────────────────────────────────
function TeammateTasks({ team, member, onBack }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, [team._id, member.userId._id]);

  const fetchTasks = async () => {
    try {
      const res = await api.get(`/orgTeams/${team._id}/members/${member.userId._id}/tasks`);
      if (res.data.success) {
        setTasks(res.data.data);
      }
    } catch (err) {
      toast.error('Failed to load teammate tasks');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="teammate-tasks-view">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button className="btn btn-secondary btn-sm" onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
          </svg>
          Back to Members
        </button>
        <h2 style={{ margin: 0, fontFamily: "'Outfit', sans-serif", fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          {member.userId.name}'s Tasks
        </h2>
      </div>

      {loading ? (
        <div className="spinner" style={{ margin: '2rem auto' }}></div>
      ) : tasks.length === 0 ? (
        <div className="empty-state card" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>No visible tasks found for this member in this team.</p>
        </div>
      ) : (
        <div className="task-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {tasks.map(task => (
            <div key={task._id} className="card task-card" style={{ padding: '1.125rem 1.25rem', background: 'var(--bg-card)', borderRadius: 'var(--border-radius-md)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', gap: '0.75rem' }}>
                <h4 style={{ margin: 0, fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  {task.title}
                </h4>
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexShrink: 0 }}>
                  {task.isPrivate && (
                    <span className="privacy-badge privacy-badge-private" title="Private Task">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                      </svg>
                      Private
                    </span>
                  )}
                  <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                  <span className="badge" style={{ background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', textTransform: 'capitalize' }}>
                    {task.status}
                  </span>
                </div>
              </div>
              <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.5rem' }}>
                {task.project && <span><strong>Project:</strong> {task.project.title}</span>}
                {task.dueDate && <span><strong>Due:</strong> {new Date(task.dueDate).toLocaleDateString()}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────
function MembersTab({ team }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [selectedMember, setSelectedMember] = useState(null);

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

  if (selectedMember) {
    return <TeammateTasks team={team} member={selectedMember} onBack={() => setSelectedMember(null)} />;
  }

  return (
    <div>
      {team.myRole === 'leader' && (
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary btn-sm" onClick={() => setShowInviteModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Team Member
          </button>
        </div>
      )}

      {loading ? (
        <div className="spinner" style={{ margin: '2rem auto' }}></div>
      ) : (
        <div className="member-list">
          {members.map((m) => {
            return (
              <div key={m._id} className="member-card" style={{ cursor: 'pointer' }} onClick={() => setSelectedMember(m)}>
                <div className="member-info">
                  <div className="member-avatar">
                    {m.userId.avatar ? (
                      <img 
                        src={m.userId.avatar} 
                        alt={m.userId.name} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      m.userId.name.charAt(0).toUpperCase()
                    )}
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
                      onClick={(e) => { e.stopPropagation(); handleMakeLeader(m.userId._id); }}
                      title="Promote to Leader"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      </svg>
                    </button>
                  )}
                  {team.myRole === 'leader' && m.role === 'leader' && (
                    <button
                      className="btn-icon text-muted"
                      onClick={(e) => { e.stopPropagation(); handleMakeMember(m.userId._id); }}
                      title="Demote to Member"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                      </svg>
                    </button>
                  )}
                  {team.myRole === 'leader' && (
                    <button
                      className="btn-icon text-muted hover-danger"
                      onClick={(e) => { e.stopPropagation(); setRemoveTarget(m); }}
                      title="Remove Member"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
                      </svg>
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
      <div className="search-filters-row" style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flexGrow: 1, minWidth: '220px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            className="form-input"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '2.25rem', width: '100%' }}
          />
        </div>
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
          <button className="btn btn-secondary btn-sm" onClick={() => setShowAddModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            + Add Existing
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            + Create New
          </button>
        </div>
      </div>

      {loading ? (
        <div className="spinner" style={{ margin: '2rem auto' }}></div>
      ) : projects.length > 0 ? (
        <div className="projects-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
          {projects.map((p) => (
            <Link to={`/projects/${p._id}`} key={p._id} className="card project-card" style={{ textDecoration: 'none', color: 'inherit', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
              <div className="project-card-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: p.color || '#2563eb' }}></div>
                  <span className="badge badge-secondary" style={{ textTransform: 'capitalize' }}>{p.status}</span>
                </div>
              </div>
              <h3 style={{ fontSize: '1.1rem', fontFamily: "'Outfit', sans-serif", fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>{p.title}</h3>
              <div style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontFamily: "'JetBrains Mono', monospace" }}>
                  <span>Progress</span>
                  <span>{p.progress}%</span>
                </div>
                <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#2563eb', width: `${p.progress}%`, transition: 'width 0.3s ease' }}></div>
                </div>
                <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {p.taskCount} task{p.taskCount !== 1 ? 's' : ''}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-state card" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
          <div className="empty-icon" style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: '#94a3b8' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
            </svg>
          </div>
          <h3 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, margin: '0 0 0.5rem 0' }}>No projects found</h3>
          <p style={{ margin: 0, color: 'var(--text-muted)' }}>This team has no projects matching your filters.</p>
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
              className="btn btn-secondary btn-sm"
              onClick={() => {
                if (!form.title.trim()) {
                  fileInputRef.current?.click();
                } else {
                  handleAIAnalyze({ target: {} }); // no file, just text
                }
              }}
              disabled={aiLoading}
              title={form.title.trim() ? "Smart Parse with AI" : "Upload File for AI Parsing"}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}
            >
              {aiLoading ? (
                <div className="spinner spinner-sm" />
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.446z"/>
                    <path d="M12 2v4"/><path d="M12 18v4"/><path d="M4.93 4.93l2.83 2.83"/><path d="M16.24 16.24l2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="M4.93 19.07l2.83-2.83"/><path d="M16.24 7.76l2.83-2.83"/>
                  </svg>
                  AI Parse
                </>
              )}
            </button>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
          <label className="form-label">Description</label>
          <textarea
            className="form-textarea"
            placeholder="Details..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">Project *</label>
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
            <label className="form-label">Due Date</label>
            <input
              type="date"
              className="form-input"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
          <div className="form-group">
            <label className="form-label">Priority</label>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label className="form-label" style={{ margin: 0 }}>Assignees *</label>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>Multi-select</span>
            </div>
            <div className="assignees-checkbox-list" style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-sm)', padding: '0.5rem', maxHeight: '140px', overflowY: 'auto', background: 'var(--bg-secondary)' }}>
              {members.map(m => (
                <label key={m.userId._id} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', padding: '0.35rem 0.5rem', borderRadius: '6px', cursor: 'pointer', transition: 'background 0.15s ease' }}>
                  <input
                    type="checkbox"
                    checked={form.assignees.includes(m.userId._id)}
                    onChange={() => handleToggleAssignee(m.userId._id)}
                    style={{ width: '15px', height: '15px', flexShrink: 0, cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1, minWidth: 0 }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, flexShrink: 0 }}>
                      {m.userId.avatar ? (
                        <img 
                          src={m.userId.avatar} 
                          alt={m.userId.name} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : m.userId.name?.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize: '0.825rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {m.userId.name}
                    </span>
                  </div>
                </label>
              ))}
              {members.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', padding: '0.5rem', display: 'block' }}>No team members found.</span>}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary" disabled={saving} style={{ padding: '0.55rem 1.25rem' }}>
            {saving ? (
              <><div className="spinner spinner-sm" style={{ marginRight: '0.4rem' }} /> Assigning...</>
            ) : (
              'Assign Shared Task'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
