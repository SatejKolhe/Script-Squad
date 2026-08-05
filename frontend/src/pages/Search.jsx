import React, { useState, useRef } from 'react';
import { api } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Search.css';

const PRIORITY_COLORS = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' };
const STATUS_LABELS = { todo: 'To Do', inprogress: 'In Progress', done: 'Done' };
const STATUS_COLORS = { todo: '#8b95ae', inprogress: '#6366f1', done: '#10b981' };

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ tasks: [], projects: [] });
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const navigate = useNavigate();
  const timerRef = useRef(null);

  const handleSearch = (value) => {
    setQuery(value);
    clearTimeout(timerRef.current);
    if (value.trim().length < 1) {
      setResults({ tasks: [], projects: [] });
      setSearched(false);
      return;
    }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      setSearched(true);
      try {
        const res = await api.get(`/tasks/search?q=${encodeURIComponent(value.trim())}`);
        setResults(res.data.data);
      } catch {
        setResults({ tasks: [], projects: [] });
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const totalResults = results.tasks.length + results.projects.length;

  return (
    <div className="page-container animate-fadeIn">
      <div className="search-page-header">
        <h1>🔍 Search</h1>
        <p>Find tasks and projects across your workspace</p>
      </div>

      <div className="search-input-wrap">
        <svg className="search-input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          id="global-search-input"
          type="text"
          className="search-input"
          placeholder="Search tasks, projects..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          autoFocus
          autoComplete="off"
        />
        {query && (
          <button className="search-clear-btn" onClick={() => { setQuery(''); setResults({ tasks: [], projects: [] }); setSearched(false); }}>
            ✕
          </button>
        )}
      </div>

      {loading && (
        <div className="search-loading">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton" style={{ height: 60, borderRadius: 12, marginBottom: 8 }} />
          ))}
        </div>
      )}

      {!loading && searched && (
        <div className="search-results">
          <div className="search-results-count">
            {totalResults} result{totalResults !== 1 ? 's' : ''} for "<strong>{query}</strong>"
          </div>

          {/* Projects */}
          {results.projects.length > 0 && (
            <div className="search-section">
              <div className="search-section-title">📁 Projects ({results.projects.length})</div>
              {results.projects.map((project) => (
                <div
                  key={project._id}
                  className="search-result-card"
                  onClick={() => navigate(`/projects/${project._id}`)}
                >
                  <div className="search-result-dot" style={{ background: project.color }} />
                  <div className="search-result-info">
                    <div className="search-result-name">{project.title}</div>
                    {project.description && (
                      <div className="search-result-desc">{project.description}</div>
                    )}
                  </div>
                  <span className="search-result-arrow">→</span>
                </div>
              ))}
            </div>
          )}

          {/* Tasks */}
          {results.tasks.length > 0 && (
            <div className="search-section">
              <div className="search-section-title">✅ Tasks ({results.tasks.length})</div>
              {results.tasks.map((task) => (
                <div
                  key={task._id}
                  className="search-result-card"
                  onClick={() => navigate(`/projects/${task.project?._id}`)}
                >
                  <span
                    className="search-task-status-dot"
                    style={{ background: STATUS_COLORS[task.status] }}
                    title={STATUS_LABELS[task.status]}
                  />
                  <div className="search-result-info">
                    <div className="search-result-name">{task.title}</div>
                    <div className="search-result-desc">
                      {task.project && (
                        <span style={{ color: task.project.color }}>{task.project.title}</span>
                      )}
                      {' · '}
                      <span style={{ color: PRIORITY_COLORS[task.priority] }}>{task.priority}</span>
                      {' · '}
                      <span style={{ color: STATUS_COLORS[task.status] }}>{STATUS_LABELS[task.status]}</span>
                    </div>
                  </div>
                  <span className="search-result-arrow">→</span>
                </div>
              ))}
            </div>
          )}

          {totalResults === 0 && (
            <div className="search-empty">
              <span className="search-empty-icon">🔎</span>
              <p>No results found</p>
              <span className="search-empty-sub">Try different keywords or check your spelling.</span>
            </div>
          )}
        </div>
      )}

      {!searched && !loading && (
        <div className="search-empty">
          <span className="search-empty-icon">🔍</span>
          <p>Start typing to search</p>
          <span className="search-empty-sub">Search across all your tasks and projects.</span>
        </div>
      )}
    </div>
  );
}
