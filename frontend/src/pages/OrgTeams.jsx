import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import './OrgTeams.css';

export default function OrgTeams() {
  const [teams, setTeams] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  const navigate = useNavigate();

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/orgTeams${search ? `?search=${encodeURIComponent(search)}` : ''}`);
      if (res.data.success) {
        setTeams(res.data.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch teams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTeams();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="page-container animate-fadeIn org-teams-page">
      <div className="org-teams-header">
        <div>
          <h1>Teams</h1>
          <p>Collaborate with your organization and manage team projects.</p>
        </div>
        <div className="org-teams-actions">
          <button className="btn btn-secondary" onClick={() => setShowJoinModal(true)}>
            Join Team
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
            + Create Team
          </button>
        </div>
      </div>

      <div className="org-teams-search">
        <input
          type="text"
          className="form-input"
          placeholder="Search teams..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <div className="spinner"></div>
        </div>
      ) : teams.length > 0 ? (
        <div className="org-teams-grid">
          {teams.map((team) => (
            <div key={team._id} className="card org-team-card" onClick={() => navigate(`/org-teams/${team._id}`)}>
              <div className="org-team-card-header">
                <div className="org-team-card-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </div>
                {team.myRole === 'leader' && <span className="badge badge-success">Leader</span>}
                {team.myRole === 'member' && <span className="badge badge-secondary">Member</span>}
              </div>
              <h3 className="org-team-card-title">{team.name}</h3>
              <p className="org-team-card-desc">{team.description || 'No description provided.'}</p>
              <div className="org-team-card-meta">
                <div className="org-team-card-stat">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                  {team.memberCount} Members
                </div>
                <div className="org-team-card-stat">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 7a2 2 0 012-2h4l2 3h10a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V7z"></path></svg>
                  {team.projectCount} Projects
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state card">
          <div className="empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <h3>No teams found</h3>
          <p>{search ? 'Try adjusting your search query.' : 'You are not a member of any teams yet.'}</p>
          {!search && (
            <div className="org-teams-actions" style={{ marginTop: '1.5rem', justifyContent: 'center' }}>
              <button className="btn btn-secondary" onClick={() => setShowJoinModal(true)}>Join Team</button>
              <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>+ Create Team</button>
            </div>
          )}
        </div>
      )}

      {showCreateModal && (
        <CreateTeamModal onClose={() => setShowCreateModal(false)} onSuccess={fetchTeams} />
      )}
      {showJoinModal && (
        <JoinTeamModal onClose={() => setShowJoinModal(false)} />
      )}
    </div>
  );
}

function CreateTeamModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Team name is required');
    try {
      setLoading(true);
      const res = await api.post('/orgTeams', form);
      if (res.data.success) {
        toast.success('Team created successfully!');
        onClose();
        navigate(`/org-teams/${res.data.data._id}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create team');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Create New Team</h2>
          <button className="close-btn" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Team Name *</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. Engineering Team"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoFocus
            />
          </div>
          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label>Description (Optional)</label>
            <textarea
              className="form-textarea"
              placeholder="What is this team working on?"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
            />
          </div>
          <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            After creation, you will receive a unique join code to invite members.
          </p>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Team'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function JoinTeamModal({ onClose }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim()) return toast.error('Join code is required');
    try {
      setLoading(true);
      const res = await api.post('/orgTeams/join', { code });
      if (res.data.success) {
        toast.success(res.data.message || 'Join request sent!');
        onClose();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Join Team via Code</h2>
          <button className="close-btn" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Enter join code</label>
            <input
              type="text"
              className="form-input"
              placeholder="e.g. A1B2C3"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoFocus
              style={{ textTransform: 'uppercase', letterSpacing: '2px' }}
            />
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Sending...' : 'Send Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
