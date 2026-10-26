"use client";

import { useEffect, useState } from "react";

/**
 * Current wall-clock time, re-rendering every `intervalMs` while `active`.
 * Display only — durations are always computed from stored timestamps, so a
 * throttled background tab can't make recorded times drift.
 */
export function useNow(active: boolean, intervalMs = 250): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setNow(Date.now());
    if (!active) return;
    const tick = () => setNow(Date.now());
    const id = window.setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [active, intervalMs]);

  return now;
}
