import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import './DigitalWellbeing.css';

export default function DigitalWellbeing() {
  const [data, setData] = useState([]);
  const [isPublic, setIsPublic] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [domain, setDomain] = useState('');
  const [timeSpent, setTimeSpent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const res = await api.get('/wellbeing/me');
      setData(res.data.data.usages);
      setIsPublic(res.data.data.isWellbeingPublic);
    } catch (err) {
      toast.error('Failed to load wellbeing data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggle = async () => {
    try {
      const res = await api.put('/wellbeing/settings', { isPublic: !isPublic });
      setIsPublic(res.data.data.isWellbeingPublic);
      toast.success(`Wellbeing data is now ${res.data.data.isWellbeingPublic ? 'Public' : 'Private'}`);
    } catch (err) {
      toast.error('Failed to update settings');
    }
  };

  const handleLog = async (e) => {
    e.preventDefault();
    if (!domain || !timeSpent) return;
    
    setSubmitting(true);
    try {
      await api.post('/wellbeing/log', {
        domain: domain.toLowerCase(),
        timeSpent: parseInt(timeSpent, 10)
      });
      toast.success('Site data logged successfully');
      setDomain('');
      setTimeSpent('');
      fetchData(); // refresh data
    } catch (err) {
      toast.error('Failed to log site data');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (minutes) => {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  if (loading) {
    return <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}><div className="spinner spinner-lg"></div></div>;
  }

  // Calculate total time
  const totalMinutes = data.reduce((acc, curr) => acc + curr.timeSpent, 0);

  return (
    <div className="page-container animate-fadeIn wellbeing-page">
      <div className="wellbeing-header">
        <div>
          <h1>Digital Wellbeing</h1>
          <p>Track your online time and maintain a healthy balance</p>
        </div>
        
        <div className="privacy-toggle-wrapper">
          <span className="privacy-label">{isPublic ? '🌐 Public' : '🔒 Private'}</span>
          <label className="switch">
            <input type="checkbox" checked={isPublic} onChange={handleToggle} />
            <span className="slider round"></span>
          </label>
        </div>
      </div>

      <div className="wellbeing-content">
        {/* Chart Section */}
        <div className="wellbeing-card chart-card">
          <h2>Time Spent Today</h2>
          <div className="total-time-badge">
            Total: <strong>{formatTime(totalMinutes)}</strong>
          </div>
          
          {data.length > 0 ? (
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
          ) : (
            <div className="empty-chart">
              <span className="empty-icon">📭</span>
              <p>No site data logged for today.</p>
            </div>
          )}
        </div>

        {/* Form Section */}
        <div className="wellbeing-card form-card">
          <h2>Log Site Visit (Mock Data)</h2>
          <p className="form-help">Use this to simulate tracking data from a browser extension.</p>
          
          <form onSubmit={handleLog} className="log-form">
            <div className="form-group">
              <label>Domain</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g., github.com" 
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Time Spent (minutes)</label>
              <input 
                type="number" 
                className="form-input" 
                placeholder="e.g., 30" 
                value={timeSpent}
                onChange={(e) => setTimeSpent(e.target.value)}
                min="1"
                required
              />
            </div>
            
            <button type="submit" className="btn btn-primary w-full" disabled={submitting}>
              {submitting ? 'Logging...' : 'Log Time'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
