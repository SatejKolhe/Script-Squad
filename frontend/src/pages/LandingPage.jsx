import React from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

export default function LandingPage() {
  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <Link to="/" className="landing-logo">Script Squad</Link>
        <div className="landing-nav-links">
          <Link to="/login" className="landing-nav-btn">Log in</Link>
          <Link to="/register" className="landing-cta-btn" style={{ marginTop: 0, padding: '0.5rem 1.5rem' }}>Sign up</Link>
        </div>
      </nav>

      <main className="landing-section">
        <section className="landing-hero">
          <h1 className="landing-title">Clarity in Every Project.</h1>
          <p className="landing-subtitle">
            A premium productivity platform designed for minimalists. No clutter, no distractions—just pure focus and execution for your team's most important work.
          </p>
          <Link to="/register" className="landing-cta-btn">Start for free</Link>
        </section>

        <section className="landing-benefits">
          <div className="benefit-item">
            <h3 className="benefit-title">Absolute Focus</h3>
            <p className="benefit-desc">
              We stripped away the noise. A high-contrast, editorial interface that respects your attention and highlights what truly matters.
            </p>
          </div>
          <div className="benefit-item">
            <h3 className="benefit-title">Seamless Workflow</h3>
            <p className="benefit-desc">
              From tasks to analytics, move effortlessly. Engineered for speed and designed with a pocket-manifesto aesthetic.
            </p>
          </div>
          <div className="benefit-item">
            <h3 className="benefit-title">Built for Teams</h3>
            <p className="benefit-desc">
              Collaborate in a space that feels like a premium digital exhibition. Professional, austere, and deeply functional.
            </p>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <p>&copy; {new Date().getFullYear()} Script Squad. All rights reserved.</p>
      </footer>
    </div>
  );
}
