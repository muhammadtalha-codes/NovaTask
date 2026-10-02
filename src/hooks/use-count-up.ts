"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animate a number from 0 (or `from`) to `value` over `duration` ms.
 * Uses requestAnimationFrame with an ease-out cubic curve.
 * Respects prefers-reduced-motion (returns the final value instantly).
 */
export function useCountUp(value: number, duration = 900, from = 0) {
  const [display, setDisplay] = useState(from);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(from);
  const targetRef = useRef(value);

  useEffect(() => {
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      // Defer to next frame to satisfy the set-state-in-effect rule.
      const raf = requestAnimationFrame(() => setDisplay(value));
      return () => cancelAnimationFrame(raf);
    }
    // restart from current display value
    fromRef.current = display;
    targetRef.current = value;
    startRef.current = null;
    const tick = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const t = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      const next = fromRef.current + (targetRef.current - fromRef.current) * eased;
      setDisplay(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(targetRef.current);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  return display;
}
