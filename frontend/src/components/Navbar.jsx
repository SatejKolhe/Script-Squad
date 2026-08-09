import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import './Navbar.css';

export default function Navbar({ onMenuToggle, setMobileOpen }) {
  const { theme, toggleTheme, isDark } = useTheme();
  const { user } = useAuth();

  // YouTube Audio Player State
  const [isMusicPlaying, setIsMusicPlaying] = React.useState(false);
  const playerRef = React.useRef(null);

  React.useEffect(() => {
    let checkInterval = null;
    const videoId = '4JxBKrr1H4w';

    const initPlayer = () => {
      if (playerRef.current) return;
      const targetElem = document.getElementById('navbar-yt-audio');
      if (!targetElem) return;

      try {
        playerRef.current = new window.YT.Player('navbar-yt-audio', {
          videoId: videoId,
          playerVars: {
            autoplay: 0,
            mute: 0,
            controls: 0,
            showinfo: 0,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            disablekb: 1,
            origin: window.location.origin
          },
          events: {
            onReady: (event) => {},
            onStateChange: (event) => {
              if (window.YT && event.data === window.YT.PlayerState.PLAYING) {
                setIsMusicPlaying(true);
              } else if (window.YT && event.data === window.YT.PlayerState.PAUSED) {
                setIsMusicPlaying(false);
              }
            }
          }
        });
      } catch (err) {
        console.error('YouTube player creation failed:', err);
      }
    };

    const loadAPI = () => {
      if (window.YT && window.YT.Player) {
        initPlayer();
        return;
      }
      let scriptTag = document.getElementById('yt-iframe-api-script');
      if (!scriptTag) {
        scriptTag = document.createElement('script');
        scriptTag.id = 'yt-iframe-api-script';
        scriptTag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(scriptTag);
      }
      checkInterval = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(checkInterval);
          initPlayer();
        }
      }, 100);
      window.onYouTubeIframeAPIReady = () => {
        if (checkInterval) clearInterval(checkInterval);
        initPlayer();
      };
    };

    loadAPI();
    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, []);

  const toggleMusic = () => {
    if (!playerRef.current || typeof playerRef.current.playVideo !== 'function') return;
    if (isMusicPlaying) {
      playerRef.current.pauseVideo();
      setIsMusicPlaying(false);
    } else {
      playerRef.current.unMute();
      playerRef.current.setVolume(100);
      playerRef.current.playVideo();
      setIsMusicPlaying(true);
    }
  };

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  return (
    <header className="navbar">
      <div id="navbar-yt-audio" style={{ display: 'none' }}></div>

      <div className="navbar-left">
        <button
          className="mobile-menu-btn btn-icon"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          ☰
        </button>
        <div className="navbar-date">
          {formattedDate}
        </div>
      </div>

      <div className="navbar-right">
        {/* Music toggle */}
        <button
          className="music-toggle btn-icon"
          onClick={toggleMusic}
          title={isMusicPlaying ? 'Pause Music' : 'Play Music'}
          aria-label="Toggle music"
          style={{ position: 'relative', overflow: 'hidden' }}
        >
          <span className="theme-icon">{isMusicPlaying ? '🔊' : '🔈'}</span>
          {isMusicPlaying && <span className="music-playing-indicator" />}
        </button>

        {/* Theme toggle */}
        <button
          id="theme-toggle"
          className="theme-toggle btn-icon"
          onClick={toggleTheme}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label="Toggle theme"
        >
          <span className="theme-icon">{isDark ? '☀️' : '🌙'}</span>
        </button>

        {/* User avatar — links to profile */}
        {user && (
          <Link to="/profile" className="navbar-avatar avatar" title="View profile">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} />
            ) : (
              user.name?.[0]?.toUpperCase()
            )}
          </Link>
        )}
      </div>
    </header>
  );
}
