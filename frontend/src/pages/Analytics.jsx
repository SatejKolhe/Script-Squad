import React, { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { api } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { format, subDays, parseISO } from 'date-fns';
import './Analytics.css';

const STATUS_COLORS = { todo: '#94a3b8', inprogress: '#6366f1', done: '#10b981' };
const PRIORITY_COLORS = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' };
const STATUS_LABELS = { todo: 'Todo', inprogress: 'In Progress', done: 'Done' };
const PRIORITY_LABELS = { high: 'High', medium: 'Medium', low: 'Low' };

// Build last 7 days array (fill gaps with 0)
function buildWeeklyData(completedByDay) {
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const date = subDays(new Date(), i);
    const key = format(date, 'yyyy-MM-dd');
    const found = completedByDay.find((d) => d._id === key);
    result.push({
      day: format(date, 'EEE'),
      date: key,
      completed: found ? found.count : 0,
    });
  }
  return result;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="chart-tooltip">
        <p className="chart-tooltip-label">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} style={{ color: entry.color }}>
            {entry.name}: <strong>{entry.value}</strong>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/tasks/analytics/summary')
      .then((res) => setData(res.data.data))
      .catch(() => toast.error('Failed to load analytics'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-overlay"><div className="spinner spinner-lg" /></div>
      </div>
    );
  }

  if (!data) return null;

  const weeklyData = buildWeeklyData(data.completedByDay || []);

  const statusData = (data.statusCounts || []).map((s) => ({
    name: STATUS_LABELS[s._id] || s._id,
    value: s.count,
    color: STATUS_COLORS[s._id] || '#6366f1',
  }));

  const priorityData = (data.priorityCounts || []).map((p) => ({
    name: PRIORITY_LABELS[p._id] || p._id,
    value: p.count,
    color: PRIORITY_COLORS[p._id] || '#6366f1',
  }));

  const totalCompleted = weeklyData.reduce((s, d) => s + d.completed, 0);
  const avgPerDay = totalCompleted > 0 ? (totalCompleted / 7).toFixed(1) : 0;
  const completionRate = data.totalTasks > 0
    ? Math.round(((data.statusCounts?.find((s) => s._id === 'done')?.count || 0) / data.totalTasks) * 100)
    : 0;

  return (
    <div className="page-container animate-fadeIn">
      {/* KPI Cards */}
      <div className="grid-4">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.12)' }}>📋</div>
          <div>
            <div className="stat-number">{data.totalTasks}</div>
            <div className="stat-label">Total Tasks</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.12)' }}>✅</div>
          <div>
            <div className="stat-number">{completionRate}%</div>
            <div className="stat-label">Completion Rate</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(6,182,212,0.12)' }}>📁</div>
          <div>
            <div className="stat-number">{data.totalProjects}</div>
            <div className="stat-label">Total Projects</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.12)' }}>⚠️</div>
          <div>
            <div className="stat-number" style={{ color: data.overdue > 0 ? '#ef4444' : undefined }}>
              {data.overdue}
            </div>
            <div className="stat-label">Overdue</div>
          </div>
        </div>
      </div>

      {/* Weekly activity */}
      <div className="analytics-section">
        <div className="analytics-section-header">
          <h2 className="analytics-section-title">📈 Weekly Activity</h2>
          <div className="analytics-meta">
            <span className="text-sm text-muted">{totalCompleted} tasks completed</span>
            <span className="text-sm text-muted">•</span>
            <span className="text-sm text-muted">{avgPerDay}/day avg</span>
          </div>
        </div>
        <div className="chart-card card">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={weeklyData} margin={{ top: 16, right: 20, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="completedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="completed"
                name="Tasks Completed"
                stroke="#6366f1"
                fill="url(#completedGrad)"
                strokeWidth={2.5}
                dot={{ fill: '#6366f1', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Status + Priority charts */}
      <div className="analytics-grid">
        {/* Status Distribution */}
        <div className="analytics-section">
          <div className="analytics-section-header">
            <h2 className="analytics-section-title">🎯 Task Status</h2>
          </div>
          <div className="chart-card card" style={{ padding: '1.5rem' }}>
            {statusData.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <div className="empty-state-icon">📊</div>
                <p className="empty-state-desc">No tasks yet</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, n]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="chart-legend">
                  {statusData.map((item, i) => (
                    <div key={i} className="legend-item">
                      <div className="legend-dot" style={{ background: item.color }} />
                      <span className="legend-label">{item.name}</span>
                      <span className="legend-value">{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Priority Breakdown */}
        <div className="analytics-section">
          <div className="analytics-section-header">
            <h2 className="analytics-section-title">⚡ Priority Breakdown</h2>
          </div>
          <div className="chart-card card" style={{ padding: '1.5rem' }}>
            {priorityData.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <div className="empty-state-icon">📊</div>
                <p className="empty-state-desc">No tasks yet</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={priorityData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
                    <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="Tasks" radius={[6, 6, 0, 0]}>
                      {priorityData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="chart-legend">
                  {priorityData.map((item, i) => (
                    <div key={i} className="legend-item">
                      <div className="legend-dot" style={{ background: item.color }} />
                      <span className="legend-label">{item.name}</span>
                      <span className="legend-value">{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
