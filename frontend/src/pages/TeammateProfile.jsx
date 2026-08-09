import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import './TeammateProfile.css';

function MemberAvatar({ user, size = 100 }) {
  const initials = user?.name
    ?.split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="teammate-avatar-wrap" style={{ width: size, height: size }}>
      <div className="teammate-avatar" style={{ width: size, height: size, fontSize: size * 0.35 }}>
        {user?.avatar ? (
          <img src={user.avatar} alt={user.name} />
        ) : (
          initials
        )}
      </div>
    </div>
  );
}

export default function TeammateProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get(`/team/member/${id}`);
        setProfile(res.data.data);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to load profile');
        navigate('/team');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="page-container animate-fadeIn" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <div className="spinner spinner-lg"></div>
      </div>
    );
  }

  if (!profile) return null;

  const { user, stats, tasks, projects } = profile;
  const inProgressTasks = tasks.filter(t => t.status === 'inprogress');

  return (
    <div className="page-container animate-fadeIn teammate-profile-container">
      <div className="teammate-profile-header">
        <button className="back-btn" onClick={() => navigate('/team')}>
          ← Back to Team
        </button>
      </div>

      <div className="teammate-profile-content">
        <div className="teammate-sidebar">
          <div className="teammate-card">
            <div className="teammate-identity">
              <MemberAvatar user={user} />
              <h2>{user.name}</h2>
              <p>{user.email}</p>
              <div className="joined-date">Joined {new Date(user.createdAt).toLocaleDateString()}</div>
            </div>

            <div className="teammate-stats-grid">
              <div className="teammate-stat-box">
                <span className="stat-num todo">{stats.todo}</span>
                <span className="stat-label">To Do</span>
              </div>
              <div className="teammate-stat-box">
                <span className="stat-num inprog">{stats.inprogress}</span>
                <span className="stat-label">In Progress</span>
              </div>
              <div className="teammate-stat-box">
                <span className="stat-num done">{stats.done}</span>
                <span className="stat-label">Done</span>
              </div>
            </div>
          </div>
        </div>

        <div className="teammate-main">

          <div className="section-block">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              Currently Working On ({inProgressTasks.length})
            </h3>
            {inProgressTasks.length > 0 ? (
              <div className="task-list">
                {inProgressTasks.map(task => (
                  <div key={task._id} className="task-item">
                    <div className="task-title">{task.title}</div>
                    {task.project && (
                      <span className="task-project-chip" style={{ background: `${task.project.color}22`, color: task.project.color }}>
                        {task.project.title}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">Not currently working on any tasks.</div>
            )}
          </div>

          <div className="section-block">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
              </svg>
              Projects ({projects.length})
            </h3>
            {projects.length > 0 ? (
              <div className="project-grid">
                {projects.map(project => (
                  <div key={project._id} className="project-card">
                    <div className="project-color-bar" style={{ background: project.color }}></div>
                    <div className="project-details">
                      <h4>{project.title}</h4>
                      <span className="project-status">{project.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">No projects owned yet.</div>
            )}
          </div>

          <div className="section-block">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
              </svg>
              Recent Tasks ({tasks.length})
            </h3>
            {tasks.length > 0 ? (
              <div className="task-list">
                {tasks.map(task => (
                  <div key={task._id} className="task-item">
                    <div className="task-info">
                      <span className={`task-status-dot ${task.status}`}></span>
                      <div className="task-title">{task.title}</div>
                    </div>
                    {task.project && (
                      <span className="task-project-chip" style={{ background: `${task.project.color}22`, color: task.project.color }}>
                        {task.project.title}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">No recent tasks.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
