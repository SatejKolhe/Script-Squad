import React from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

export default function LandingPage() {
  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <Link to="/" className="landing-logo">Script Squad</Link>
        <div className="landing-nav-links">
          <Link to="/login" className="landing-nav-btn">LOGIN</Link>
        </div>
      </nav>

      <main>
        <section className="landing-section landing-hero">
          <div className="metadata-tag">&gt; INIT_SEQUENCE : DIRECTOR'S CUT</div>
          <h1 className="landing-title">
            Execute Your Vision.<br />
            <span className="highlight">Without the Noise.</span>
          </h1>
          <p className="landing-subtitle">
            A premium, high-contrast command center for teams who ship. 
            Script Squad strips away the clutter so you can focus entirely on the action. 
            No distractions, just raw execution.
          </p>
          <Link to="/register" className="landing-cta-btn">Initialize Workspace</Link>
        </section>

        <section className="landing-action-blocks">
          <div className="action-block">
            <div className="metadata-tag">[ SCENE_01 : FOCUS ]</div>
            <h3 className="action-title">Absolute Clarity</h3>
            <p className="action-desc">
              We eliminated the visual static. A strict, editorial interface that respects your screen time and highlights the exact tasks you need to clear.
            </p>
          </div>
          <div className="action-block">
            <div className="metadata-tag">[ SCENE_02 : VELOCITY ]</div>
            <h3 className="action-title">Command & Conquer</h3>
            <p className="action-desc">
              Navigate seamlessly from task tracking to deep analytics. Engineered for keyboard-first speed and built like a high-end studio tool.
            </p>
          </div>
          <div className="action-block">
            <div className="metadata-tag">[ SCENE_03 : SYNC ]</div>
            <h3 className="action-title">Team Orchestration</h3>
            <p className="action-desc">
              Collaborate in a space that feels like a mission control. Professional, highly structured, and entirely focused on getting it done.
            </p>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div>&copy; {new Date().getFullYear()} SCRIPT SQUAD_</div>
        <div>SYS.STATUS: ONLINE</div>
      </footer>
    </div>
  );
}
