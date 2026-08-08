import React, { useState, useEffect } from 'react';
import './IntroAnimation.css';

export default function IntroAnimation({ children }) {
  const [show, setShow] = useState(() => {
    try {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return false;
      }
      return true;
    } catch (e) {
      return true;
    }
  });
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    if (!show) return;

    const finishIntro = () => {
      setFadingOut(true);
      setTimeout(() => {
        setShow(false);
      }, 500); // 500ms fade out duration
    };

    const timer = setTimeout(finishIntro, 2500); // Intro visual length

    const handleSkip = (e) => {
      // Allow keydown, click, touchstart to skip
      if (e.type === 'keydown' || e.type === 'click' || e.type === 'touchstart') {
        clearTimeout(timer);
        finishIntro();
      }
    };

    window.addEventListener('keydown', handleSkip);
    window.addEventListener('click', handleSkip);
    window.addEventListener('touchstart', handleSkip);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleSkip);
      window.removeEventListener('click', handleSkip);
      window.removeEventListener('touchstart', handleSkip);
    };
  }, [show]);

  if (!show && !fadingOut) {
    return <>{children}</>;
  }

  return (
    <>
      {show && (
        <div className={`intro-container ${fadingOut ? 'fade-out' : ''}`}>
          <div className="intro-animation-wrapper">
            <div className="intro-elements">
              <div className="intro-card">
                <div className="intro-progress">
                  <div className="intro-progress-fill" />
                </div>
                <div className="intro-checklist">
                  <div className="intro-check-box">
                    <svg className="intro-check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
            <div className="intro-logo-text">Script Squad</div>
          </div>
        </div>
      )}
      {children}
    </>
  );
}
