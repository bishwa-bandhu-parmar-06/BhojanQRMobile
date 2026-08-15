import { useEffect, useState } from "react";

// How often the live boards re-check whether a Completed order has served out
// its grace period. The order therefore leaves the board somewhere between 60
// and 70 seconds after completion, which is what "after a minute" means in
// practice - polling to the exact second would cost a re-render every second
// for no visible difference.
const TICK_MS = 10 * 1000;

/**
 * A clock for time-based filtering.
 *
 * Filtering on `Date.now()` inside render is not enough on its own: nothing
 * re-renders when a minute passes, so a completed order would sit on the
 * board until the next socket event or manual refresh happened to arrive.
 * This supplies a value that changes on a timer, so the board updates itself.
 *
 * @param enabled Pass false when nothing on screen is waiting to be archived.
 * A board with no completed orders has nothing to recompute, and an interval
 * that keeps firing would re-render an idle Orders screen every ten seconds
 * for the whole service.
 */
export const useArchiveTick = (enabled: boolean): number => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) return;

    // Read the clock immediately as well: switching from nothing-pending to
    // something-pending should start from the current time, not from whatever
    // it was when the screen first mounted.
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [enabled]);

  return now;
};
