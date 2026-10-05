import { useEffect, useRef } from 'react';

/**
 * useVisibilityPolling Hook:
 * Executes a callback periodically, automatically PAUSING execution when the tab is hidden
 * (document.visibilityState !== 'visible') to prevent wasting bandwidth on background tabs.
 * Resumes immediately once the user refocuses the tab.
 */
export function useVisibilityPolling(
  callback: () => void | Promise<void>,
  intervalMs: number,
  enabled: boolean = true
): void {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled || intervalMs <= 0) return;

    let timerId: ReturnType<typeof setInterval> | null = null;

    const executeIfVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void savedCallback.current();
      }
    };

    const startTimer = () => {
      if (!timerId) {
        timerId = setInterval(executeIfVisible, intervalMs);
      }
    };

    const stopTimer = () => {
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Tab is now active — trigger immediate refresh and restart timer
        executeIfVisible();
        startTimer();
      } else {
        // Tab hidden — suspend polling loop
        stopTimer();
      }
    };

    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      startTimer();
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      stopTimer();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [intervalMs, enabled]);
}
