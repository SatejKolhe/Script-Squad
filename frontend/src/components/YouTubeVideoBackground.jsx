import React, { useEffect, useRef, useState } from 'react';
import './YouTubeVideoBackground.css';

export default function YouTubeVideoBackground({ videoId = '4JxBKrr1H4w' }) {
  const playerRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let checkInterval = null;

    const initPlayer = () => {
      if (playerRef.current) return;

      const targetElem = document.getElementById('yt-bg-player-iframe');
      if (!targetElem) return;

      try {
        playerRef.current = new window.YT.Player('yt-bg-player-iframe', {
          videoId: videoId,
          playerVars: {
            autoplay: 1,
            mute: 1,
            controls: 0,
            showinfo: 0,
            rel: 0,
            modestbranding: 1,
            loop: 1,
            playlist: videoId,
            playsinline: 1,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            enablejsapi: 1,
            origin: window.location.origin
          },
          events: {
            onReady: (event) => {
              try {
                event.target.mute();
                event.target.playVideo();
              } catch (e) {
                console.warn('Autoplay error:', e);
              }
              setIsReady(true);
              setIsPlaying(true);
              setIsMuted(true);
            },
            onStateChange: (event) => {
              if (window.YT && event.data === window.YT.PlayerState.ENDED) {
                event.target.playVideo();
              } else if (window.YT && event.data === window.YT.PlayerState.PLAYING) {
                setIsPlaying(true);
              } else if (window.YT && event.data === window.YT.PlayerState.PAUSED) {
                setIsPlaying(false);
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

      // Check if script tag is already in DOM
      let scriptTag = document.getElementById('yt-iframe-api-script');
      if (!scriptTag) {
        scriptTag = document.createElement('script');
        scriptTag.id = 'yt-iframe-api-script';
        scriptTag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(scriptTag);
      }

      // Poll until window.YT is ready
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
  }, [videoId]);

  // Toggle Video Play / Pause
  const togglePlay = () => {
    if (!playerRef.current || typeof playerRef.current.playVideo !== 'function') return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
      setIsPlaying(false);
    } else {
      playerRef.current.playVideo();
      setIsPlaying(true);
    }
  };

  // Toggle Audio Sound Play / Mute
  const toggleMute = () => {
    if (!playerRef.current || typeof playerRef.current.unMute !== 'function') return;
    if (isMuted) {
      playerRef.current.unMute();
      playerRef.current.setVolume(100);
      setIsMuted(false);
      // Ensure video is also playing if muted before
      if (!isPlaying) {
        playerRef.current.playVideo();
        setIsPlaying(true);
      }
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };

  return (
    <>
      <div className="yt-video-bg-container" ref={containerRef}>
        {/* ── YouTube Player Frame Wrapper ── */}
        <div className="yt-video-bg-wrapper">
          <div id="yt-bg-player-iframe" className="yt-video-bg-iframe" />
        </div>

        {/* ── Dark Semi-Transparent Overlay ── */}
        <div className="yt-video-bg-overlay" />
      </div>

      {/* ── Fixed Floating Controls Widget (Always Visible in Bottom-Right Corner) ── */}
      <div className="yt-video-controls-widget">
        {/* Audio / Song Sound Toggle Button */}
        <button
          type="button"
          className={`yt-control-btn audio-btn ${!isMuted ? 'active-audio' : ''}`}
          onClick={toggleMute}
          aria-label={isMuted ? 'Play song audio' : 'Mute song audio'}
          title={isMuted ? 'Click to play song with audio' : 'Mute song audio'}
        >
          {!isMuted ? (
            <>
              <svg className="yt-btn-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
              </svg>
              <span>Song Playing 🎵</span>
            </>
          ) : (
            <>
              <svg className="yt-btn-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73 4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
              </svg>
              <span>Play Song Audio</span>
            </>
          )}
        </button>

        {/* Video Play / Pause Toggle Button */}
        <button
          type="button"
          className="yt-control-btn play-btn"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause video' : 'Play video'}
          title={isPlaying ? 'Pause video background' : 'Play video background'}
        >
          {isPlaying ? (
            <svg className="yt-btn-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          ) : (
            <svg className="yt-btn-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
      </div>
    </>
  );
}
