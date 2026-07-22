import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

/* ── Constellation canvas animation ── */
function ConstellationCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let W, H;

    const STAR_COUNT = 120;
    const MAX_DIST = 140;
    const stars = [];

    function resize() {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }

    function initStars() {
      stars.length = 0;
      for (let i = 0; i < STAR_COUNT; i++) {
        stars.push({
          x:  Math.random() * W,
          y:  Math.random() * H,
          vx: (Math.random() - 0.5) * 0.18,
          vy: (Math.random() - 0.5) * 0.18,
          r:  Math.random() * 1.4 + 0.4,
        });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      // Move stars
      for (const s of stars) {
        s.x += s.vx;
        s.y += s.vy;
        if (s.x < 0) s.x = W;
        if (s.x > W) s.x = 0;
        if (s.y < 0) s.y = H;
        if (s.y > H) s.y = 0;
      }
      // Draw connections
      for (let i = 0; i < stars.length; i++) {
        for (let j = i + 1; j < stars.length; j++) {
          const dx = stars[i].x - stars[j].x;
          const dy = stars[i].y - stars[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MAX_DIST) {
            ctx.beginPath();
            ctx.moveTo(stars[i].x, stars[i].y);
            ctx.lineTo(stars[j].x, stars[j].y);
            const alpha = (1 - dist / MAX_DIST) * 0.18;
            ctx.strokeStyle = `rgba(99,102,241,${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }
      // Draw stars
      for (const s of stars) {
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(176,176,255,0.7)';
        ctx.fill();
      }
      animId = requestAnimationFrame(draw);
    }

    resize();
    initStars();
    draw();
    window.addEventListener('resize', () => { resize(); initStars(); });

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="constellation-canvas" />;
}

export default function LandingPage() {
  return (
    <div className="landing-page">
      <ConstellationCanvas />

      {/* ── Nav ── */}
      <nav className="landing-nav">
        <Link to="/" className="landing-logo">
          <div className="landing-logo-icon">⚡</div>
          <span className="landing-logo-name">Script Squad</span>
        </Link>
        <div className="landing-nav-links">
          <a href="#features" className="nav-link-ghost">Features</a>
          <Link to="/login"    className="nav-link-ghost">Log in</Link>
          <Link to="/register" className="nav-link-btn">Get started →</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="landing-hero">
        <div className="hero-badge">
          <span className="hero-badge-dot" />
          Now with real-time collaboration
        </div>

        <h1 className="landing-title">
          Ship work that{' '}
          <span className="title-highlight">actually matters.</span>
        </h1>

        <p className="landing-subtitle">
          Script Squad is the command center for high-performance teams.
          Track projects, manage tasks, and watch your team's productivity
          take off — all in one beautifully focused workspace.
        </p>

        <div className="hero-cta-group">
          <Link to="/register" className="hero-btn-primary">
            Launch your workspace →
          </Link>
          <Link to="/login" className="hero-btn-ghost">
            Sign in
          </Link>
        </div>

        <div className="hero-social-proof">
          <div className="proof-stat">
            <span className="proof-number">2.4k+</span>
            <span className="proof-label">Active teams</span>
          </div>
          <div className="proof-divider" />
          <div className="proof-stat">
            <span className="proof-number">98%</span>
            <span className="proof-label">Satisfaction</span>
          </div>
          <div className="proof-divider" />
          <div className="proof-stat">
            <span className="proof-number">12ms</span>
            <span className="proof-label">Avg. response</span>
          </div>
        </div>
      </section>

      {/* ── Dashboard Mockup ── */}
      <section className="mockup-section">
        <div className="mockup-wrapper">
          <div className="mockup-topbar">
            <div className="mockup-dot mockup-dot-red" />
            <div className="mockup-dot mockup-dot-yellow" />
            <div className="mockup-dot mockup-dot-green" />
            <div className="mockup-url-bar">app.scriptsquad.io/dashboard</div>
          </div>
          <div className="mockup-body">
            <div className="mockup-sidebar">
              <div className="mockup-nav-logo">⚡ Script Squad</div>
              {['Dashboard','Projects','Team','Analytics'].map((item, i) => (
                <div key={item} className={`mockup-nav-item ${i === 0 ? 'active' : ''}`}>
                  <span>{['⊞','📁','👥','📊'][i]}</span> {item}
                </div>
              ))}
            </div>
            <div className="mockup-main">
              <div className="mockup-stats-row">
                {[
                  { val: '24', lbl: 'Active Tasks', color: '#6366f1' },
                  { val: '8',  lbl: 'In Progress',  color: '#f59e0b' },
                  { val: '12', lbl: 'Completed',    color: '#10b981' },
                  { val: '3',  lbl: 'Overdue',      color: '#ef4444' },
                ].map(({ val, lbl, color }) => (
                  <div className="mockup-stat-card" key={lbl}>
                    <div className="mockup-accent-bar" style={{ background: color }} />
                    <div className="mockup-stat-val">{val}</div>
                    <div className="mockup-stat-lbl">{lbl}</div>
                  </div>
                ))}
              </div>
              <div className="mockup-tasks-area">
                <div className="mockup-tasks-title">Recent Tasks</div>
                {[
                  { color: '#ef4444' },
                  { color: '#f59e0b' },
                  { color: '#10b981' },
                  { color: '#6366f1' },
                ].map(({ color }, i) => (
                  <div className="mockup-task-row" key={i}>
                    <div className="mockup-task-dot" style={{ background: color }} />
                    <div className="mockup-task-text" />
                    <div className="mockup-task-badge" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mockup-glow-halo" />
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="features-section">
        <span className="section-eyebrow">Why teams choose Script Squad</span>
        <h2 className="section-title">Everything your team needs to move fast.</h2>
        <p className="section-sub">
          Built for speed, designed for clarity. Stop juggling tools and start shipping.
        </p>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon-wrap indigo">🎯</div>
            <h3 className="feature-title">Task Command Center</h3>
            <p className="feature-desc">
              Assign, prioritize, and track tasks in real-time. Built-in timers keep
              everyone accountable without the overhead of status meetings.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon-wrap pink">📡</div>
            <h3 className="feature-title">Live Team Pulse</h3>
            <p className="feature-desc">
              See what every teammate is working on, right now. Merge requests, 
              blockers, and updates surfaced automatically — no pings required.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon-wrap cyan">📊</div>
            <h3 className="feature-title">Deep Analytics</h3>
            <p className="feature-desc">
              Velocity charts, burn-down graphs, and workload distribution give 
              managers the signal — not noise — they need to unblock the team.
            </p>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="landing-cta-section">
        <h2 className="cta-title">Ready for mission control?</h2>
        <p className="cta-sub">
          Join thousands of teams that have replaced chaos with clarity.
          Free to start, no credit card required.
        </p>
        <div className="cta-btn-wrap">
          <Link to="/register" className="hero-btn-primary">
            Create free workspace →
          </Link>
          <Link to="/login" className="hero-btn-ghost">
            I already have an account
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <span className="footer-logo">Script Squad</span>
        <span className="footer-text">© {new Date().getFullYear()} · Built for teams who ship</span>
      </footer>
    </div>
  );
}
