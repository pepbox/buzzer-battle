import { useState, useEffect, useRef } from 'react';
import { SyncedTimer } from '../utils/timerSync';

/**
 * Custom hook for synchronized timer
 * Calculates elapsed time from server startTime
 * 
 * @param startTime - Unix timestamp (milliseconds) when timer started
 * @param duration - Duration in seconds
 * @param onTimeUp - Callback when timer reaches 0
 * @returns Object with timeElapsed (seconds), progress (0-100), and isExpired
 */
export const useTimerSync = (
  startTime: number | undefined,
  duration: number,
  onTimeUp?: () => void
) => {
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isExpired, setIsExpired] = useState(false);
  const timerRef = useRef<SyncedTimer | null>(null);
  const onTimeUpRef = useRef(onTimeUp);

  // Update callback ref
  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  }, [onTimeUp]);

  useEffect(() => {
    // If no startTime, reset everything
    if (!startTime) {
      setTimeElapsed(0);
      setIsExpired(false);
      if (timerRef.current) {
        timerRef.current.stop();
        timerRef.current = null;
      }
      return;
    }

    // Create synced timer
    const durationMs = duration * 1000;
    const timer = new SyncedTimer(startTime, durationMs);
    timerRef.current = timer;

    // Check if already expired
    if (timer.isExpired()) {
      setTimeElapsed(duration);
      setIsExpired(true);
      if (onTimeUpRef.current) {
        onTimeUpRef.current();
      }
      return;
    }

    // Start timer with update callback
    timer.start(
      (remainingMs) => {
        const elapsed = (durationMs - remainingMs) / 1000;
        setTimeElapsed(elapsed);
      },
      () => {
        setIsExpired(true);
        if (onTimeUpRef.current) {
          onTimeUpRef.current();
        }
      },
      100 // Update every 100ms for smooth animation
    );

    // Cleanup on unmount or when dependencies change
    return () => {
      timer.stop();
    };
  }, [startTime, duration]);

  // Calculate progress (0-100)
  const progress = (timeElapsed / duration) * 100;
  
  return {
    timeElapsed,
    progress: Math.min(progress, 100),
    isExpired,
  };
};

/**
 * Hook for timer that returns remaining time instead of elapsed
 */
export const useRemainingTimer = (
  startTime: number | undefined,
  duration: number,
  onTimeUp?: () => void
) => {
  const { timeElapsed, progress, isExpired } = useTimerSync(startTime, duration, onTimeUp);
  
  const timeRemaining = Math.max(0, duration - timeElapsed);

  return {
    timeRemaining,
    progress,
    isExpired,
  };
};
