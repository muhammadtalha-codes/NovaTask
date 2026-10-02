"use client";

import { motion } from "framer-motion";

/**
 * Subtle 3D ambient background:
 *  - Animated gradient orbs (blurred)
 *  - Soft perspective grid
 *  - Floating particle dots
 * Designed to be lightweight on normal laptops.
 */
export function Background3D() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Base gradient wash */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(1200px 700px at 12% -8%, color-mix(in oklch, var(--brand) 18%, transparent), transparent 60%), radial-gradient(1000px 600px at 92% 8%, color-mix(in oklch, var(--brand-2) 16%, transparent), transparent 55%), radial-gradient(900px 600px at 50% 120%, color-mix(in oklch, var(--brand-3) 14%, transparent), transparent 60%)",
        }}
      />

      {/* Animated orbs */}
      <div
        className="orb animate-float-slow"
        style={{
          width: 420,
          height: 420,
          top: "-6%",
          left: "-4%",
          background:
            "radial-gradient(circle at 30% 30%, var(--brand), transparent 70%)",
        }}
      />
      <div
        className="orb animate-float-delayed"
        style={{
          width: 360,
          height: 360,
          top: "8%",
          right: "-6%",
          background:
            "radial-gradient(circle at 60% 40%, var(--brand-2), transparent 70%)",
        }}
      />
      <div
        className="orb animate-float"
        style={{
          width: 460,
          height: 460,
          bottom: "-12%",
          left: "30%",
          background:
            "radial-gradient(circle at 50% 50%, var(--brand-3), transparent 70%)",
        }}
      />

      {/* Perspective grid */}
      <div
        className="absolute inset-x-0 bottom-0 h-[40vh] opacity-[0.18] dark:opacity-[0.22]"
        style={{
          backgroundImage:
            "linear-gradient(to right, color-mix(in oklch, var(--foreground) 35%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklch, var(--foreground) 35%, transparent) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          transform: "perspective(420px) rotateX(62deg)",
          transformOrigin: "bottom",
          maskImage:
            "linear-gradient(to top, black 0%, transparent 80%)",
          WebkitMaskImage:
            "linear-gradient(to top, black 0%, transparent 80%)",
        }}
      />

      {/* Floating particles */}
      {PARTICLES.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            background:
              "color-mix(in oklch, var(--brand) 60%, transparent)",
            boxShadow:
              "0 0 12px color-mix(in oklch, var(--brand) 70%, transparent)",
          }}
          animate={{ y: [0, -22, 0], opacity: [0.25, 0.8, 0.25] }}
          transition={{
            duration: p.dur,
            repeat: Infinity,
            ease: "easeInOut",
            delay: p.delay,
          }}
        />
      ))}

      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(1000px 700px at 50% 40%, transparent 50%, color-mix(in oklch, var(--background)60%, black 18%) 100%)",
        }}
      />
    </div>
  );
}

const PARTICLES = Array.from({ length: 14 }).map((_, i) => ({
  x: (i * 67) % 100,
  y: (i * 37) % 100,
  size: 4 + (i % 3) * 2,
  dur: 6 + (i % 5) * 1.6,
  delay: (i % 6) * 0.6,
}));
