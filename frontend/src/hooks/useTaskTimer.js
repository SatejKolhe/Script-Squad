import { useState, useEffect, useRef } from 'react';

/**
 * useTaskTimer
 *
 * Returns a formatted elapsed-time string (e.g. "01:23:45") for a task.
 *
 * @param {object} params
 * @param {string|null} params.timerStartedAt  - ISO date string when the timer started (null if not running)
 * @param {number}      params.totalTimeSpent  - Accumulated ms from previous inprogress sessions
 * @param {string}      params.status          - Current task status
 * @returns {{ elapsed: string, totalMs: number }}
 */
export function useTaskTimer({ timerStartedAt, totalTimeSpent = 0, status }) {
  const computeMs = () => {
    let ms = totalTimeSpent || 0;
    if (status === 'inprogress' && timerStartedAt) {
      ms += Date.now() - new Date(timerStartedAt).getTime();
    }
    return Math.max(0, ms);
  };

  const [totalMs, setTotalMs] = useState(computeMs);
  const intervalRef = useRef(null);

  useEffect(() => {
    // Reset whenever the timer inputs change
    setTotalMs(computeMs());

    if (status === 'inprogress' && timerStartedAt) {
      intervalRef.current = setInterval(() => {
        setTotalMs(computeMs());
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerStartedAt, totalTimeSpent, status]);

  return { elapsed: formatMs(totalMs), totalMs };
}

/**
 * Format milliseconds into HH:MM:SS
 */
function formatMs(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours   = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n) => String(n).padStart(2, '0');

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}
