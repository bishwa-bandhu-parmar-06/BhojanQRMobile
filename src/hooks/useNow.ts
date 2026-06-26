import { useEffect, useRef, useState } from 'react';

// Returns the current Date, re-rendering the component every `intervalMs`.
// Used to drive live offer-schedule evaluation and countdown displays purely
// off the device clock - no network calls, no server load.
export default function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setNow(new Date()), intervalMs);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [intervalMs]);

  return now;
}
