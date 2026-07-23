import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
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
  const [wellbeingData, setWellbeingData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get(`/team/member/${id}`);
        setProfile(res.data.data);

        try {
          const wbRes = await api.get(`/wellbeing/user/${id}`);
          setWellbeingData(wbRes.data.data.usages);
        } catch (wbErr) {
          // Wellbeing might be private or not exist, ignore
        }
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

  const formatTime = (minutes) => {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

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
            <h3>🌐 Digital Wellbeing {wellbeingData === null ? '(Private)' : ''}</h3>
            {wellbeingData === null ? (
              <div className="empty-state">🔒 This teammate's digital wellbeing data is private.</div>
            ) : wellbeingData.length === 0 ? (
              <div className="empty-state">No site data logged for today.</div>
            ) : (
              <div className="chart-container">
                <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Total Time: <strong>{formatTime(wellbeingData.reduce((acc, curr) => acc + curr.timeSpent, 0))}</strong>
                </div>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={wellbeingData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border-color)" />
                    <XAxis type="number" stroke="var(--text-secondary)" tickFormatter={(val) => `${val}m`} />
                    <YAxis dataKey="domain" type="category" width={100} stroke="var(--text-primary)" fontSize={12} />
                    <Tooltip 
                      formatter={(value) => [`${value} min`, 'Time Spent']}
                      contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                    />
                    <Bar dataKey="timeSpent" fill="var(--primary-color)" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="section-block">
            <h3>🚀 Currently Working On ({inProgressTasks.length})</h3>
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
            <h3>📁 Projects ({projects.length})</h3>
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
            <h3>📝 Recent Tasks ({tasks.length})</h3>
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
