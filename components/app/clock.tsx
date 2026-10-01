"use client";

import { useEffect, useState } from "react";

export function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function Clock({ timeFormat = "12h" }: { timeFormat?: "12h" | "24h" }) {
  const now = useClock();
  const time =
    timeFormat === "24h"
      ? now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      : now
          .toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })
          .toUpperCase();
  return <span className="tabular-nums">{time}</span>;
}

export function Greeting() {
  const now = useClock();
  const h = now.getHours();
  const greet = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  return <span>{greet}</span>;
}
