import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './LandingPage.css';

/* ── Option A: Live Dashboard Product Preview Component (Sidebar + Stats + Recent Tasks) ── */
function LiveDashboardPreview() {
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
          <div className="preview-brand">⚡ TaskLoom</div>
          <div className="preview-nav-list">
            <div className="preview-nav-item active">
              <span className="nav-icon">⊞</span> Dashboard
            </div>
            <div className="preview-nav-item">
              <span className="nav-icon">📁</span> Projects
            </div>
            <div className="preview-nav-item">
              <span className="nav-icon">👥</span> Team
            </div>
            <div className="preview-nav-item">
              <span className="nav-icon">📊</span> Analytics
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
              <div className="stat-num">8</div>
              <div className="stat-lbl">In Progress</div>
            </div>
            <div className="preview-stat-card">
              <div className="stat-line green" />
              <div className="stat-num">12</div>
              <div className="stat-lbl">Completed</div>
            </div>
            <div className="preview-stat-card">
              <div className="stat-line red" />
              <div className="stat-num">3</div>
              <div className="stat-lbl">Overdue</div>
            </div>
          </div>

          {/* Recent Tasks List */}
          <div className="preview-tasks-section">
            <div className="preview-tasks-header">Recent Tasks</div>
            <div className="preview-tasks-list">
              <div className="preview-task-row">
                <span className="task-status-dot red" />
                <span className="task-name">Deploy v2.4 Release Build</span>
                <span className="task-badge red">High Priority</span>
              </div>
              <div className="preview-task-row">
                <span className="task-status-dot amber" />
                <span className="task-name">Review Security & Auth Spec</span>
                <span className="task-badge amber">In Progress</span>
              </div>
              <div className="preview-task-row">
                <span className="task-status-dot green" />
                <span className="task-name">Redesign Onboarding Flow</span>
                <span className="task-badge green">Completed</span>
              </div>
              <div className="preview-task-row">
                <span className="task-status-dot cobalt" />
                <span className="task-name">Database Query Indexing</span>
                <span className="task-badge cobalt">Scheduled</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


export default function LandingPage() {
  const [emailInput, setEmailInput] = useState('');
  const navigate = useNavigate();

  const handleInlineSignup = (e) => {
    e.preventDefault();
    if (emailInput.trim()) {
      navigate(`/register?email=${encodeURIComponent(emailInput.trim())}`);
    } else {
      navigate('/register');
    }
  };

  return (
    <div className="landing-page">
      {/* ── Navigation ── */}
      <nav className="landing-nav">
        <Link to="/" className="landing-logo">
          <div className="landing-logo-icon">⚡</div>
          <span className="landing-logo-name">TaskLoom</span>
        </Link>
        <div className="landing-nav-links">
          <a href="#features" className="nav-link-ghost">Features</a>
          <a href="#how-it-works" className="nav-link-ghost">How It Works</a>
          <Link to="/login" className="nav-link-ghost">Sign In</Link>
          <Link to="/register" className="nav-link-btn">Start for free →</Link>
        </div>
      </nav>

      {/* ── Hero Section (Option A: Asymmetric 2-Column Layout) ── */}
      <section className="landing-hero">
        <div className="hero-grid">
          {/* Left Column (45%): Headline & Quick Action */}
          <div className="hero-left">
            <h1 className="landing-title">
              Work with focus.<br />
              Ship with confidence.
            </h1>
            <p className="landing-subtitle">
              TaskLoom is the intuitive task & project workspace designed for clarity.
              Organize daily priorities, align your team, and build lasting momentum.
            </p>

            <form onSubmit={handleInlineSignup} className="hero-inline-form">
              <input
                type="email"
                className="hero-inline-input"
                placeholder="Enter your work email..."
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
              />
              <button type="submit" className="hero-inline-btn">
                Start for free →
              </button>
            </form>

            <p className="hero-micro-text">
              No credit card required · 14-day free trial · Instant setup
            </p>
          </div>

          {/* Right Column (55%): Live Product Workspace Board */}
          <div className="hero-right">
            <LiveDashboardPreview />
          </div>

        </div>
      </section>

      {/* ── Features Section ── */}
      <section id="features" className="features-section">
        <div className="section-header">
          <span className="section-eyebrow">DESIGNED FOR CLARITY</span>
          <h2 className="section-title">Everything you need to ship quality work</h2>
          <p className="section-sub">
            Built for speed and simplicity. No bloat, no complex setup — just smooth productivity.
          </p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon-badge">🎯</div>
            <h3 className="feature-title">Intuitive Task Tracking</h3>
            <p className="feature-desc">
              Organize tasks by status, priority, or due date. Use structured views that keep your team focused on what matters most.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon-badge">📡</div>
            <h3 className="feature-title">Real-Time Team Sync</h3>
            <p className="feature-desc">
              Stay in lockstep with team chat, activity feeds, and instant task updates across all devices.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon-badge">📊</div>
            <h3 className="feature-title">Productivity Insights</h3>
            <p className="feature-desc">
              Earn XP, track streak metrics, and review project completion velocity with clean analytical breakdowns.
            </p>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="steps-section">
        <div className="section-header">
          <span className="section-eyebrow">SIMPLE WORKFLOW</span>
          <h2 className="section-title">How TaskLoom keeps you moving forward</h2>
        </div>

        <div className="steps-grid">
          <div className="step-card">
            <div className="step-num">01</div>
            <h4>Create Projects & Tasks</h4>
            <p>Group work into distinct projects, set priorities, and attach due dates with a single click.</p>
          </div>
          <div className="step-card">
            <div className="step-num">02</div>
            <h4>Track Real-Time Progress</h4>
            <p>Move tasks from Todo to Done. Gain XP points and maintain daily streaks as tasks complete.</p>
          </div>
          <div className="step-card">
            <div className="step-num">03</div>
            <h4>Collaborate & Deliver</h4>
            <p>Share progress with your team, assign items, and ship projects ahead of schedule.</p>
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="landing-cta-section">
        <div className="cta-container">
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
              <div className="landing-logo-icon">⚡</div>
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

