// client/src/hooks/usePolling.js
//
// Custom polling hook.
// - First call fires immediately (no 2-sec blank screen)
// - Subsequent calls every `interval` ms
// - Stops when shouldPoll becomes false
// - Cleans up on unmount

import { useEffect, useRef, useCallback } from 'react';

export function usePolling(callback, interval, shouldPoll) {
  const savedCallback = useRef();
  const intervalRef = useRef();

  // Always keep latest callback in ref (avoids stale closures)
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!shouldPoll) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Immediate first call — user sees data right away
    savedCallback.current?.();

    // Then repeat every interval
    intervalRef.current = setInterval(() => {
      savedCallback.current?.();
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [interval, shouldPoll]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  return stopPolling;
}
