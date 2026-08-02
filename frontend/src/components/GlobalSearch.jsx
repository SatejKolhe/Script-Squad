import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../contexts/AuthContext';
import './GlobalSearch.css';

const PRIORITY_COLOR = { urgent: '#ef4444', high: '#f97316', medium: '#eab308', low: '#6366f1' };

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef(null);
  const timerRef = useRef(null);
  const navigate = useNavigate();

  // Open with Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Focus input when opening
  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  // Debounced search
  const doSearch = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await api.get(`/tasks/search?q=${encodeURIComponent(q)}`);
      setResults(res.data.data || []);
      setActiveIdx(0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(query), 300);
    return () => clearTimeout(timerRef.current);
  }, [query, doSearch]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && results[activeIdx]) {
      openTask(results[activeIdx]);
    }
  };

  const openTask = (task) => {
    setOpen(false);
    if (task.project) {
      navigate(`/projects/${task.project._id}`);
    } else {
      navigate('/inbox');
    }
  };

  const formatDate = (d) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (!open) {
    return (
      <button className="search-trigger-btn" onClick={() => setOpen(true)} title="Search (Ctrl+K)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <span className="search-trigger-label">Search</span>
        <kbd className="search-kbd">Ctrl K</kbd>
      </button>
    );
  }

  return (
    <div className="search-overlay" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <div className="search-modal">
        {/* Search input */}
        <div className="search-input-wrap">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="search-icon">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            ref={inputRef}
            className="search-input"
            placeholder="Search tasks…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {loading && <div className="search-spinner" />}
          <kbd className="search-esc-key">Esc</kbd>
        </div>

        {/* Results */}
        <div className="search-results">
          {query.trim() === '' ? (
            <div className="search-empty">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3 }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <p>Type to search your tasks</p>
              <small>Search by title, description, or tags</small>
            </div>
          ) : results.length === 0 && !loading ? (
            <div className="search-empty">
              <p>No tasks found for "<strong>{query}</strong>"</p>
            </div>
          ) : (
            results.map((task, idx) => (
              <button
                key={task._id}
                className={`search-result-item ${idx === activeIdx ? 'active' : ''} ${task.status === 'done' ? 'done' : ''}`}
                onClick={() => openTask(task)}
                onMouseEnter={() => setActiveIdx(idx)}
              >
                {/* Checkbox indicator */}
                <div
                  className="sr-checkbox"
                  style={{ borderColor: PRIORITY_COLOR[task.priority] || '#6366f1' }}
                >
                  {task.status === 'done' && (
                    <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                      <path d="M1.5 5L3.8 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  )}
                </div>

                <div className="sr-content">
                  <div className={`sr-title ${task.status === 'done' ? 'done' : ''}`}>{task.title}</div>
                  <div className="sr-meta">
                    {task.project ? (
                      <span className="sr-project" style={{ color: task.project.color }}>
                        {task.project.title}
                      </span>
                    ) : (
                      <span className="sr-project" style={{ color: '#6366f1' }}>Inbox</span>
                    )}
                    {task.dueDate && (
                      <span className="sr-date">{formatDate(task.dueDate)}</span>
                    )}
                    {task.labels?.map((l, i) => (
                      <span key={i} className="sr-label" style={{ color: l.color }}>@{l.name}</span>
                    ))}
                  </div>
                </div>

                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sr-arrow">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </button>
            ))
          )}
        </div>

        {/* Footer hint */}
        {results.length > 0 && (
          <div className="search-footer">
            <span><kbd>↑↓</kbd> navigate</span>
            <span><kbd>↵</kbd> open</span>
            <span><kbd>Esc</kbd> close</span>
          </div>
        )}
      </div>
    </div>
  );
}
