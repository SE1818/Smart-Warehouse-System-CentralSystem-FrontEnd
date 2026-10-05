import { useState, useEffect } from 'react';

/**
 * useDebounce Hook: Delays updating state until after a specified delay has elapsed
 * since the last time the debounced value changed.
 * Useful for search inputs, map pan/zoom, and filter inputs to prevent flooding Ngrok bandwidth.
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
