import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './LandingPage.css';

/* ── Option A: Live Dashboard Product Preview Component (Interactive + Smooth Transitions) ── */
function LiveDashboardPreview() {
  const [tasks, setTasks] = useState([
    { id: 1, name: 'Deploy v2.4 Release Build', status: 'high', label: 'High Priority', dot: 'red' },
    { id: 2, name: 'Review Security & Auth Spec', status: 'inprogress', label: 'In Progress', dot: 'amber' },
    { id: 3, name: 'Redesign Onboarding Flow', status: 'completed', label: 'Completed', dot: 'green' },
    { id: 4, name: 'Database Query Indexing', status: 'scheduled', label: 'Scheduled', dot: 'cobalt' },
  ]);
  const [animatingId, setAnimatingId] = useState(null);

  const handleTaskClick = (id) => {
    setAnimatingId(id);
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== id) return task;
        if (task.status === 'scheduled') return { ...task, status: 'inprogress', label: 'In Progress', dot: 'amber' };
        if (task.status === 'inprogress') return { ...task, status: 'completed', label: 'Completed', dot: 'green' };
        if (task.status === 'completed') return { ...task, status: 'high', label: 'High Priority', dot: 'red' };
        return { ...task, status: 'scheduled', label: 'Scheduled', dot: 'cobalt' };
      })
    );
    setTimeout(() => setAnimatingId(null), 300);
  };

  const inProgressCount = 7 + tasks.filter((t) => t.status === 'inprogress').length;
  const completedCount = 11 + tasks.filter((t) => t.status === 'completed').length;
  const overdueCount = 2 + tasks.filter((t) => t.status === 'high').length;

  return (
    <div className="preview-frame">
      <div className="preview-topbar">
        <div className="preview-dots">
          <span className="dot dot-red" />
          <span className="dot dot-yellow" />
          <span className="dot dot-green" />
        </div>
        <span className="preview-url-pill">app.taskloom.com/dashboard</span>
      </div>

      <div className="preview-body">
        {/* Left Sidebar */}
        <div className="preview-sidebar">
          <div className="preview-brand" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
            TaskLoom
          </div>
          <div className="preview-nav-list">
            <div className="preview-nav-item active">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
              Dashboard
            </div>
            <div className="preview-nav-item">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>
              </svg>
              Projects
            </div>
            <div className="preview-nav-item">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
              </svg>
              Team
            </div>
            <div className="preview-nav-item">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
              Analytics
            </div>
          </div>
        </div>

        {/* Main Workspace Area */}
        <div className="preview-main">
          {/* Top 4 Stat Counter Cards */}
          <div className="preview-stats-grid">
            <div className="preview-stat-card">
              <div className="stat-line cobalt" />
              <div className="stat-num">24</div>
              <div className="stat-lbl">Active Tasks</div>
            </div>
            <div className="preview-stat-card">
              <div className="stat-line amber" />
              <div className="stat-num">{inProgressCount}</div>
              <div className="stat-lbl">In Progress</div>
            </div>
            <div className="preview-stat-card">
              <div className="stat-line green" />
              <div className="stat-num">{completedCount}</div>
              <div className="stat-lbl">Completed</div>
            </div>
            <div className="preview-stat-card">
              <div className="stat-line red" />
              <div className="stat-num">{overdueCount}</div>
              <div className="stat-lbl">Overdue</div>
            </div>
          </div>

          {/* Recent Tasks List */}
          <div className="preview-tasks-section">
            <div className="preview-tasks-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Recent Tasks</span>
              <span style={{ fontSize: '0.68rem', fontWeight: '500', color: '#64748b', textTransform: 'none' }}>Click row to toggle status</span>
            </div>
            <div className="preview-tasks-list">
              {tasks.map((t) => (
                <div
                  key={t.id}
                  className={`preview-task-row ${animatingId === t.id ? 'status-changing' : ''}`}
                  onClick={() => handleTaskClick(t.id)}
                  title="Click to toggle status"
                >
                  <span className={`task-status-dot ${t.dot}`} />
                  <span className="task-name">{t.name}</span>
                  <span className={`task-badge ${t.dot}`}>{t.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState('');
  const navigate = useNavigate();

  // Scroll-triggered reveals via IntersectionObserver (Test Mode: 0.1 threshold + 50px bottom rootMargin for early trigger)
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px 50px 0px' }
    );

    const elements = document.querySelectorAll('.reveal-on-scroll');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  const handleInlineSignup = (e) => {
    e.preventDefault();
    const trimmed = emailInput.trim();
    if (!trimmed) {
      setEmailError('');
      navigate('/register');
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(trimmed)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setEmailError('');
    navigate(`/register?email=${encodeURIComponent(trimmed)}`, { state: { email: trimmed } });
  };

  return (
    <div className="landing-page">
      {/* ── Navigation ── */}
      <nav className="landing-nav">
        <Link to="/" className="landing-logo">
          <div className="landing-logo-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
          </div>
          <span className="landing-logo-name">TaskLoom</span>
        </Link>
        <div className="landing-nav-links">
          <a href="#features" className="nav-link-ghost">Features</a>
          <a href="#how-it-works" className="nav-link-ghost">How It Works</a>
          <Link to="/login" className="nav-link-ghost">Sign In</Link>
          <Link to="/register" className="nav-link-btn">Start for free →</Link>
        </div>
      </nav>

      {/* ── Hero Section (Option A: Asymmetric 2-Column Layout with Staggered Load-In) ── */}
      <section className="landing-hero">
        <div className="hero-grid">
          {/* Left Column (45%): Headline & Quick Action */}
          <div className="hero-left">
            <h1 className="landing-title hero-anim-1">
              Work with focus.<br />
              Ship with confidence.
            </h1>
            <p className="landing-subtitle hero-anim-2">
              TaskLoom is the intuitive task & project workspace designed for clarity.
              Organize daily priorities, align your team, and build lasting momentum.
            </p>

            <form onSubmit={handleInlineSignup} className="hero-inline-form-wrapper hero-anim-3">
              <div className="hero-inline-form">
                <input
                  type="email"
                  className={`hero-inline-input ${emailError ? 'error' : ''}`}
                  placeholder="Enter your work email..."
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    if (emailError) setEmailError('');
                  }}
                />
                <button type="submit" className="hero-inline-btn">
                  Start for free →
                </button>
              </div>
              {emailError && <span className="hero-inline-error">{emailError}</span>}
            </form>
          </div>

          {/* Right Column (55%): Live Product Workspace Board */}
          <div className="hero-right hero-anim-4">
            <LiveDashboardPreview />
          </div>
        </div>
      </section>

      {/* ── Features Section ── */}
      <section id="features" className="features-section">
        <div className="section-header reveal-on-scroll">
          <span className="section-eyebrow">DESIGNED FOR CLARITY</span>
          <h2 className="section-title">Everything you need to ship quality work</h2>
          <p className="section-sub">
            Built for speed and simplicity. No bloat, no complex setup — just smooth productivity.
          </p>
        </div>

        <div className="features-grid reveal-on-scroll">
          <div className="feature-card reveal-card-1">
            <div className="feature-icon-badge">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
              </svg>
            </div>
            <h3 className="feature-title">Intuitive Task Tracking</h3>
            <p className="feature-desc">
              Organize tasks by status, priority, or due date. Use structured views that keep your team focused on what matters most.
            </p>
          </div>

          <div className="feature-card reveal-card-2">
            <div className="feature-icon-badge">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5"/><path d="M19.1 4.9c3.9 3.9 3.9 10.3 0 14.2"/>
              </svg>
            </div>
            <h3 className="feature-title">Real-Time Team Sync</h3>
            <p className="feature-desc">
              Stay in lockstep with team chat, activity feeds, and instant task updates across all devices.
            </p>
          </div>

          <div className="feature-card reveal-card-3">
            <div className="feature-icon-badge">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
            </div>
            <h3 className="feature-title">Productivity Insights</h3>
            <p className="feature-desc">
              Earn XP, track streak metrics, and review project completion velocity with clean analytical breakdowns.
            </p>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="steps-section">
        <div className="section-header reveal-on-scroll">
          <span className="section-eyebrow">SIMPLE WORKFLOW</span>
          <h2 className="section-title">How TaskLoom keeps you moving forward</h2>
        </div>

        <div className="steps-grid reveal-on-scroll">
          <div className="step-card reveal-card-1">
            <div className="step-num">01</div>
            <h4>Create Projects & Tasks</h4>
            <p>Group work into distinct projects, set priorities, and attach due dates with a single click.</p>
          </div>
          <div className="step-card reveal-card-2">
            <div className="step-num">02</div>
            <h4>Track Real-Time Progress</h4>
            <p>Move tasks from Todo to Done. Gain XP points and maintain daily streaks as tasks complete.</p>
          </div>
          <div className="step-card reveal-card-3">
            <div className="step-num">03</div>
            <h4>Collaborate & Deliver</h4>
            <p>Share progress with your team, assign items, and ship projects ahead of schedule.</p>
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="landing-cta-section">
        <div className="cta-container reveal-on-scroll">
          <h2 className="cta-title">Start achieving more today</h2>
          <p className="cta-sub">
            Join teams who rely on TaskLoom for daily focus.
          </p>
          <div className="cta-btn-wrap">
            <Link to="/register" className="nav-link-btn">
              Create Your Free Account →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-left">
            <div className="landing-logo">
              <div className="landing-logo-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
              </div>
              <span className="landing-logo-name">TaskLoom</span>
            </div>
            <p className="footer-tagline">Work Smarter Together.</p>
          </div>
          <div className="footer-right">
            <span>© {new Date().getFullYear()} TaskLoom. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

