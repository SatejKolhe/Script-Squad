import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import './Upcoming.css';

const PRIORITY_COLORS = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' };
const PRIORITY_ICONS = { high: '🔴', medium: '🟡', low: '🟢' };

function groupTasks(tasks) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  const endOfTomorrow = new Date(startOfTomorrow);
  endOfTomorrow.setDate(endOfTomorrow.getDate() + 1);
  const endOfWeek = new Date(startOfToday);
  endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));

  const groups = { overdue: [], today: [], tomorrow: [], thisWeek: [], later: [] };

  tasks.forEach((task) => {
    const due = new Date(task.dueDate);
    if (due < startOfToday) groups.overdue.push(task);
    else if (due < startOfTomorrow) groups.today.push(task);
    else if (due < endOfTomorrow) groups.tomorrow.push(task);
    else if (due <= endOfWeek) groups.thisWeek.push(task);
    else groups.later.push(task);
  });

  return groups;
}

function TaskRow({ task, onStatusChange, navigate }) {
  const isOverdue = new Date(task.dueDate) < new Date() && task.status !== 'done';
  return (
    <div className={`upcoming-task ${isOverdue ? 'overdue' : ''}`}>
      <button
        className={`upcoming-check ${task.status}`}
        onClick={() => onStatusChange(task._id, task.status === 'todo' ? 'inprogress' : 'done')}
      >
        {task.status === 'inprogress' ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
        ) : (
          '○'
        )}
      </button>
      <div className="upcoming-task-body" onClick={() => navigate(`/projects/${task.project?._id}`)}>
        <div className="upcoming-task-title">{task.title}</div>
        <div className="upcoming-task-meta">
          {task.project && (
            <span className="upcoming-task-project" style={{ background: task.project.color + '18', color: task.project.color, borderColor: task.project.color + '40' }}>
              {task.project.title}
            </span>
          )}
          <span className={`badge badge-${task.priority}`}>
            {task.priority}
          </span>
          <span className="upcoming-task-date" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            {new Date(task.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </span>
        </div>
      </div>
      <select
        className="upcoming-status-select"
        value={task.status}
        onChange={(e) => onStatusChange(task._id, e.target.value)}
        style={{ color: task.status === 'inprogress' ? '#2563eb' : 'var(--text-secondary)' }}
      >
        <option value="todo">To Do</option>
        <option value="inprogress">In Progress</option>
        <option value="done">Done</option>
      </select>
    </div>
  );
}

export default function Upcoming() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Quick Add State
  const [quickTitle, setQuickTitle] = useState('');
  const [quickDate, setQuickDate] = useState('');
  const [isQuickPrivate, setIsQuickPrivate] = useState(false);
  const [adding, setAdding] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = React.useRef(null);

  const navigate = useNavigate();

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const [tasksRes, projectsRes] = await Promise.all([
        api.get('/tasks/upcoming'),
        api.get('/projects'),
      ]);
      setTasks(tasksRes.data.data);
      setProjects(projectsRes.data.data);
    } catch {
      toast.error('Failed to load upcoming tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const res = await api.put(`/tasks/${taskId}`, { status: newStatus });
      if (newStatus === 'done') {
        setTasks((prev) => prev.filter((t) => t._id !== taskId));
        toast.success('Task completed! +10 XP 🎉');
      } else {
        setTasks((prev) => prev.map((t) => (t._id === taskId ? res.data.data : t)));
      }
    } catch {
      toast.error('Failed to update task');
    }
  };

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (!quickTitle.trim() || !quickDate) return;
    setAdding(true);
    
    let urgentProject = projects.find(p => p.title.toLowerCase() === 'urgent work');
    if (!urgentProject) {
      try {
        const res = await api.post('/projects', { title: 'Urgent Work', color: '#ef4444' });
        urgentProject = res.data.data;
        setProjects(prev => [...prev, urgentProject]);
      } catch (err) {
        toast.error('Failed to create Urgent Work project');
        setAdding(false);
        return;
      }
    }

    try {
      await api.post('/tasks', {
        title: quickTitle.trim(),
        dueDate: quickDate,
        project: urgentProject._id,
        isPrivate: isQuickPrivate
      });
      toast.success('Task scheduled!');
      setQuickTitle('');
      setQuickDate('');
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadTasks();
    } catch (err) {
      toast.error('Failed to add task');
    } finally {
      setAdding(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const handleAIAnalyze = async () => {
    setAiLoading(true);
    try {
      if (selectedFile) {
        const reader = new FileReader();
        reader.onload = async (ev) => {
          try {
            const res = await api.post('/ai/extract-task', {
              fileData: ev.target.result,
              mimeType: selectedFile.type,
              text: quickTitle,
            });
            if (res.data?.data) {
              if (res.data.data.title) setQuickTitle(res.data.data.title);
              if (res.data.data.dueDate) setQuickDate(res.data.data.dueDate);
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
        reader.readAsDataURL(selectedFile);
      } else {
        const res = await api.post('/ai/extract-task', { text: quickTitle });
        if (res.data?.data) {
          if (res.data.data.title) setQuickTitle(res.data.data.title);
          if (res.data.data.dueDate) setQuickDate(res.data.data.dueDate);
          toast.success(quickTitle.trim() ? '✨ AI smart-parsed your task!' : '✨ AI generated a task suggestion!');
        }
        setAiLoading(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'AI service error.');
      setAiLoading(false);
    }
  };

  const groups = groupTasks(tasks);
  const sections = [
    { key: 'overdue', label: 'Overdue', color: '#ef4444', data: groups.overdue },
    { key: 'today', label: 'Today', color: '#f59e0b', data: groups.today },
    { key: 'tomorrow', label: 'Tomorrow', color: '#2563eb', data: groups.tomorrow },
    { key: 'thisWeek', label: 'This Week', color: '#64748b', data: groups.thisWeek },
    { key: 'later', label: 'Later', color: '#64748b', data: groups.later },
  ];

  return (
    <div className="page-container animate-fadeIn">
      <div className="upcoming-header">
        <h1 className="upcoming-title">Upcoming</h1>
        <p className="upcoming-subtitle">Tasks with deadlines, organized by time</p>
      </div>

      <form className="upcoming-quick-add" onSubmit={handleQuickAdd}>
        <input
          type="text"
          className="upcoming-input flex-1"
          placeholder="New task title..."
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          maxLength={100}
        />
        <input
          type="date"
          className="upcoming-input"
          value={quickDate}
          onChange={(e) => setQuickDate(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
          required
        />
        
        <input 
          type="file" 
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept="image/*,application/pdf,text/plain"
          onChange={handleFileChange}
        />
        
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            type="button"
            className="btn btn-outline"
            style={{ padding: '0.4rem 0.65rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => fileInputRef.current?.click()}
            title="Attach file"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>

          {selectedFile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--bg-secondary)', padding: '0.3rem 0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.78rem' }}>
              <span style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedFile.name}
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1' }}
                title="Remove attachment"
              >
                &times;
              </button>
            </div>
          )}

          <button
            type="button"
            className="btn btn-outline"
            style={{ padding: '0.45rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderColor: '#2563eb', color: '#2563eb' }}
            onClick={handleAIAnalyze}
            disabled={aiLoading}
            title="Extract task from attached file"
          >
            {aiLoading ? (
              <div className="spinner spinner-sm" />
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4L12 2z"/>
                </svg>
                AI
              </>
            )}
          </button>
        </div>

        <button
          type="button"
          className={`btn ${isQuickPrivate ? 'btn-ghost' : 'btn-outline'}`}
          style={{ 
            padding: '0.45rem 0.75rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.4rem',
            background: isQuickPrivate ? 'var(--bg-secondary)' : '#eff6ff',
            borderColor: isQuickPrivate ? 'var(--border-color)' : '#bfdbfe',
            color: isQuickPrivate ? 'var(--text-muted)' : '#2563eb',
          }}
          onClick={() => setIsQuickPrivate(!isQuickPrivate)}
          title={isQuickPrivate ? "Private task" : "Public task"}
        >
          {isQuickPrivate ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
            </svg>
          )}
          <span>{isQuickPrivate ? 'Private' : 'Public'}</span>
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!quickTitle.trim() || !quickDate || adding}
        >
          {adding ? 'Adding...' : 'Schedule Task'}
        </button>
      </form>

      {loading ? (
        <div>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton" style={{ height: 60, borderRadius: 12, marginBottom: 8 }} />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="upcoming-empty">
          <div className="upcoming-empty-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <p>No upcoming deadlines</p>
          <span className="upcoming-empty-sub">Add due dates to your tasks to see them here.</span>
        </div>
      ) : (
        <div className="upcoming-sections">
          {sections.map((section) =>
            section.data.length > 0 ? (
              <div key={section.key} className="upcoming-section">
                <div className="upcoming-section-header">
                  <span className="upcoming-section-label">{section.label}</span>
                  <span className="upcoming-section-count" style={{ background: section.color + '18', color: section.color }}>
                    {section.data.length}
                  </span>
                </div>
                <div className="upcoming-section-list">
                  {section.data.map((task) => (
                    <TaskRow key={task._id} task={task} onStatusChange={handleStatusChange} navigate={navigate} />
                  ))}
                </div>
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}
