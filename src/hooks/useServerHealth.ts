import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '../config/env';

const HEALTH_URL = `${API_BASE_URL}/health`;

const HEALTHY_POLL_INTERVAL_MS = 30000;
const DOWN_RETRY_INTERVAL_MS = 15000;
const HEALTH_CHECK_TIMEOUT_MS = 6000;

type ServerStatus = 'checking' | 'online' | 'down';

const pingHealth = async () => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);

  try {
    const response = await fetch(HEALTH_URL, { method: 'GET', signal: controller.signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
};

// Mirrors the website's useServerHealth.js - polls /api/health independently
// of device connectivity (catches "WiFi is fine but the API is down").
function useServerHealth({ enabled = true }: { enabled?: boolean } = {}) {
  const [status, setStatus] = useState<ServerStatus>('checking');
  const [retryCount, setRetryCount] = useState(0);
  const [countdown, setCountdown] = useState(DOWN_RETRY_INTERVAL_MS / 1000);

  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = useCallback(() => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    pollTimerRef.current = null;
    countdownTimerRef.current = null;
  }, []);

  const runCheck = useCallback(async () => {
    const healthy = await pingHealth();

    if (healthy) {
      setStatus('online');
      setRetryCount(0);
      setCountdown(DOWN_RETRY_INTERVAL_MS / 1000);
      pollTimerRef.current = setTimeout(runCheck, HEALTHY_POLL_INTERVAL_MS);
      return;
    }

    setStatus('down');
    setRetryCount(count => count + 1);
    setCountdown(DOWN_RETRY_INTERVAL_MS / 1000);

    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    countdownTimerRef.current = setInterval(() => {
      setCountdown(seconds => (seconds > 0 ? seconds - 1 : 0));
    }, 1000);

    pollTimerRef.current = setTimeout(runCheck, DOWN_RETRY_INTERVAL_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const retryNow = useCallback(() => {
    clearTimers();
    setStatus(current => (current === 'online' ? current : 'checking'));
    runCheck();
  }, [clearTimers, runCheck]);

  useEffect(() => {
    if (!enabled) {
      clearTimers();
      return;
    }

    setStatus(current => (current === 'online' ? current : 'checking'));
    runCheck();

    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { status, retryCount, countdown, retryNow };
}

export default useServerHealth;
