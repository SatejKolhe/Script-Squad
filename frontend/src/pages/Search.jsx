import React, { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Search.css';

const PRIORITY_COLORS = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' };
const STATUS_LABELS = { todo: 'To Do', inprogress: 'In Progress', done: 'Done' };
const STATUS_COLORS = { todo: '#8b95ae', inprogress: '#6366f1', done: '#10b981' };

export default function Search() {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [dueDateFilter, setDueDateFilter] = useState('all');
  const [sortBy, setSortBy] = useState('none');

  const [results, setResults] = useState({ tasks: [], projects: [] });
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const navigate = useNavigate();
  const timerRef = useRef(null);

  const hasActiveFilters = statusFilter !== 'all' || priorityFilter !== 'all' || dueDateFilter !== 'all' || sortBy !== 'none';

  const resetFilters = () => {
    setStatusFilter('all');
    setPriorityFilter('all');
    setDueDateFilter('all');
    setSortBy('none');
  };

  const handleClearAll = () => {
    setQuery('');
    resetFilters();
    setResults({ tasks: [], projects: [] });
    setSearched(false);
  };

  const fetchSearchResults = useCallback(async (qStr, statusVal, priorityVal, dueVal, sortVal) => {
    const hasQuery = qStr.trim().length > 0;
    const hasStatus = statusVal !== 'all';
    const hasPriority = priorityVal !== 'all';
    const hasDueDate = dueVal !== 'all';
    const hasSort = sortVal !== 'none';

    if (!hasQuery && !hasStatus && !hasPriority && !hasDueDate && !hasSort) {
      setResults({ tasks: [], projects: [] });
      setSearched(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      const params = new URLSearchParams();
      if (hasQuery) params.append('q', qStr.trim());
      if (hasStatus) params.append('status', statusVal);
      if (hasPriority) params.append('priority', priorityVal);
      if (hasDueDate) params.append('dueDate', dueVal);
      if (hasSort) params.append('sortBy', sortVal);

      const res = await api.get(`/tasks/search?${params.toString()}`);
      setResults(res.data.data);
    } catch {
      setResults({ tasks: [], projects: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      fetchSearchResults(query, statusFilter, priorityFilter, dueDateFilter, sortBy);
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [query, statusFilter, priorityFilter, dueDateFilter, sortBy, fetchSearchResults]);


  const displayedTasks = React.useMemo(() => {
    if (!results.tasks || results.tasks.length === 0) return [];
    if (sortBy === 'none') return results.tasks;

    const getDueDateMs = (t) => {
      if (!t.dueDate) return null;
      const ms = new Date(t.dueDate).getTime();
      return isNaN(ms) ? null : ms;
    };

    const isAsc = sortBy === 'dueDateAsc';
    return [...results.tasks].sort((a, b) => {
      const timeA = getDueDateMs(a);
      const timeB = getDueDateMs(b);

      if (timeA !== null && timeB !== null) {
        if (timeA !== timeB) {
          return isAsc ? timeA - timeB : timeB - timeA;
        }
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      if (timeA !== null) return -1;
      if (timeB !== null) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [results.tasks, sortBy]);

  const totalResults = results.tasks.length + results.projects.length;

  const formatDueDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };


  return (
    <div className="page-container animate-fadeIn">
      <div className="search-page-header">
        <h1>🔍 Search & Filter</h1>
        <p>Find tasks by name, status, priority, or due date across your workspace</p>
      </div>

      <div className="search-input-wrap">
        <svg className="search-input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          id="global-search-input"
          type="text"
          className="search-input"
          placeholder="Search tasks by name or projects..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          autoComplete="off"
        />
        {(query || hasActiveFilters) && (
          <button className="search-clear-btn" onClick={handleClearAll} title="Clear search and filters">
            ✕
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="search-filter-bar">
        <div className="filter-group">
          <label htmlFor="status-filter">Status</label>
          <select
            id="status-filter"
            className={`filter-select ${statusFilter !== 'all' ? 'active-filter' : ''}`}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="todo">To Do</option>
            <option value="inprogress">In Progress</option>
            <option value="done">Done</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="priority-filter">Priority</label>
          <select
            id="priority-filter"
            className={`filter-select ${priorityFilter !== 'all' ? 'active-filter' : ''}`}
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="all">All Priorities</option>
            <option value="low">Low Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="high">High Priority</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="duedate-filter">Due Date</label>
          <select
            id="duedate-filter"
            className={`filter-select ${dueDateFilter !== 'all' ? 'active-filter' : ''}`}
            value={dueDateFilter}
            onChange={(e) => setDueDateFilter(e.target.value)}
          >
            <option value="all">Any Date</option>
            <option value="today">Due Today</option>
            <option value="overdue">Overdue</option>
            <option value="this_week">This Week</option>
          </select>
        </div>

        <div className="filter-group">
          <label htmlFor="sort-filter">Sort Due Date</label>
          <select
            id="sort-filter"
            className={`filter-select ${sortBy !== 'none' ? 'active-filter' : ''}`}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="none">None</option>
            <option value="dueDateAsc">Ascending</option>
            <option value="dueDateDesc">Descending</option>

          </select>
        </div>



        {hasActiveFilters && (
          <button className="filter-reset-btn" onClick={resetFilters}>
            Reset Filters
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
            {totalResults} result{totalResults !== 1 ? 's' : ''} found
            {query && <span> for "<strong>{query}</strong>"</span>}
            {hasActiveFilters && <span className="active-filters-badge"> (Filtered)</span>}
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
          {displayedTasks.length > 0 && (
            <div className="search-section">
              <div className="search-section-title">✅ Tasks ({displayedTasks.length})</div>
              {displayedTasks.map((task) => (

                <div
                  key={task._id}
                  className="search-result-card"
                  onClick={() => navigate(`/projects/${task.project?._id}`)}
                >
                  <span
                    className="search-task-status-dot"
                    style={{ background: STATUS_COLORS[task.status] || '#8b95ae' }}
                    title={STATUS_LABELS[task.status] || task.status}
                  />
                  <div className="search-result-info">
                    <div className="search-result-name">{task.title}</div>
                    <div className="search-result-desc">
                      {task.project && (
                        <span style={{ color: task.project.color, fontWeight: 600 }}>
                          {task.project.title}
                        </span>
                      )}
                      {' · '}
                      <span className="task-badge-pill" style={{ borderColor: STATUS_COLORS[task.status], color: STATUS_COLORS[task.status] }}>
                        {STATUS_LABELS[task.status] || task.status}
                      </span>
                      {' · '}
                      <span className="task-badge-pill" style={{ borderColor: PRIORITY_COLORS[task.priority], color: PRIORITY_COLORS[task.priority] }}>
                        {task.priority} priority
                      </span>
                      {task.dueDate && (
                        <>
                          {' · '}
                          <span className="task-due-badge">
                            📅 {formatDueDate(task.dueDate)}
                          </span>
                        </>
                      )}
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
              <p>No results match your criteria</p>
              <span className="search-empty-sub">Try broadening your search query or resetting filters.</span>
            </div>
          )}
        </div>
      )}

      {!searched && !loading && (
        <div className="search-empty">
          <span className="search-empty-icon">🔍</span>
          <p>Search tasks or select a filter</p>
          <span className="search-empty-sub">Type a task name or choose status, priority, or due date filters.</span>
        </div>
      )}
    </div>
  );
}

