import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import './Today.css';

const PRIORITY_COLORS = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' };
const PRIORITY_ICONS = { high: '🔴', medium: '🟡', low: '🟢' };

export default function Today() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Quick Add State
  const [quickTitle, setQuickTitle] = useState('');
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
        api.get('/tasks/today'),
        api.get('/projects'),
      ]);
      setTasks(tasksRes.data.data);
      setProjects(projectsRes.data.data);
    } catch {
      toast.error('Failed to load today\'s tasks');
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

  const todayStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;
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

    // YYYY-MM-DD format for today
    const tzOffset = new Date().getTimezoneOffset() * 60000;
    const localISOTime = new Date(Date.now() - tzOffset).toISOString().split('T')[0];

    try {
      await api.post('/tasks', {
        title: quickTitle.trim(),
        dueDate: localISOTime,
        project: urgentProject._id,
        isPrivate: isQuickPrivate
      });
      toast.success('Task scheduled for today!');
      setQuickTitle('');
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
    if (!selectedFile) return;

    setAiLoading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const res = await api.post('/ai/extract-task', {
          fileData: ev.target.result,
          mimeType: selectedFile.type
        });
        if (res.data?.data?.title) {
          setQuickTitle(res.data.data.title);
          toast.success('Task extracted! Press Add to save.');
        }
      } catch (err) {
        toast.error('Failed to analyze file.');
      } finally {
        setAiLoading(false);
      }
    };
    reader.onerror = () => {
      toast.error('Failed to read file.');
      setAiLoading(false);
    };
    reader.readAsDataURL(selectedFile);
  };

  return (
    <div className="page-container animate-fadeIn">
      <div className="today-header">
        <div>
          <h1>☀️ Today</h1>
          <p>{todayStr}</p>
        </div>
        <div className="today-count">
          <span className="today-count-num">{tasks.length}</span>
          <span className="today-count-label">task{tasks.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <form className="today-quick-add" onSubmit={handleQuickAdd} style={{
        marginBottom: '2rem', padding: '1rem', background: 'var(--bg-card)', 
        border: '1px solid var(--border-color)', borderRadius: '12px'
      }}>
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <input
            type="text"
            className="today-input flex-1"
            style={{ width: '100%', padding: '0.6rem 0.85rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', outline: 'none' }}
            placeholder="Add a new task for today..."
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            maxLength={100}
          />
          <button
            type="button"
            className={`btn ${isQuickPrivate ? 'btn-ghost' : 'btn-outline'}`}
            style={{ 
              padding: '0.5rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem',
              background: isQuickPrivate ? 'var(--bg-secondary)' : 'rgba(16, 185, 129, 0.1)',
              borderColor: isQuickPrivate ? 'var(--border-color)' : '#10b981',
              color: isQuickPrivate ? 'var(--text-muted)' : '#10b981',
              whiteSpace: 'nowrap'
            }}
            onClick={() => setIsQuickPrivate(!isQuickPrivate)}
            title={isQuickPrivate ? "Private task" : "Public task"}
          >
            {isQuickPrivate ? '🔒 Private' : '🌍 Public'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input 
              type="file" 
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="image/*,application/pdf,text/plain"
              onChange={handleFileChange}
            />
            <button
              type="button"
              className="btn btn-outline"
              style={{ padding: '0.4rem 0.75rem', fontSize: '1.2rem', lineHeight: '1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => fileInputRef.current?.click()}
              title="Add file"
            >
              +
            </button>
            
            {selectedFile && (
              <>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedFile.name}
                </span>
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderColor: '#8b5cf6', color: '#8b5cf6' }}
                  onClick={handleAIAnalyze}
                  disabled={aiLoading}
                  title="Analyze file with AI"
                >
                  {aiLoading ? '⏳' : '✨ AI'}
                </button>
              </>
            )}
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={!quickTitle.trim() || adding}
          >
            {adding ? 'Adding...' : 'Add Task'}
          </button>
        </div>
      </form>

      {loading ? (
        <div className="today-loading">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 72, borderRadius: 12, marginBottom: 8 }} />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="today-empty">
          <span className="today-empty-icon">🌟</span>
          <p>No tasks due today!</p>
          <span className="today-empty-sub">Enjoy your free day or set some due dates on your tasks.</span>
        </div>
      ) : (
        <div className="today-list">
          {tasks.map((task) => (
            <div key={task._id} className={`today-task-card ${task.status}`}>
              <button
                className={`today-task-check ${task.status}`}
                onClick={() => handleStatusChange(task._id, task.status === 'todo' ? 'inprogress' : 'done')}
                title={task.status === 'todo' ? 'Start task' : 'Complete task'}
              >
                {task.status === 'inprogress' ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>
                )}
              </button>
              <div className="today-task-body" onClick={() => navigate(`/projects/${task.project?._id}`)}>
                <div className="today-task-title">{task.title}</div>
                <div className="today-task-meta">
                  {task.project && (
                    <span className="today-task-project" style={{ background: task.project.color + '18', color: task.project.color }}>
                      {task.project.title}
                    </span>
                  )}
                  <span className="today-task-priority" style={{ color: PRIORITY_COLORS[task.priority] }}>
                    {PRIORITY_ICONS[task.priority]} {task.priority}
                  </span>
                </div>
              </div>
              <select
                className="today-task-status"
                value={task.status}
                onChange={(e) => handleStatusChange(task._id, e.target.value)}
                style={{ color: task.status === 'inprogress' ? '#6366f1' : '#8b95ae' }}
              >
                <option value="todo">To Do</option>
                <option value="inprogress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
