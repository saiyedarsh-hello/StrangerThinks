"use client";
import React, { useEffect, useRef, useState } from "react";

interface Point {
  x: number;
  y: number;
}

interface BoltBranch {
  segments: { p1: Point; p2: Point }[];
  branches: BoltBranch[];
}

interface ActiveStrike {
  root: BoltBranch;
  life: number; // 1.0 down to 0
  maxLife: number;
  flicker: boolean;
}

interface RedLightningCanvasProps {
  onFlash?: (intensity: number) => void;
  density?: "normal" | "high" | "vecna_heavy";
  className?: string;
  style?: React.CSSProperties;
}

export default function RedLightningCanvas({
  onFlash,
  density = "vecna_heavy",
  className = "",
  style = {},
}: RedLightningCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const flashOverlayRef = useRef<HTMLDivElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;

    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d", { alpha: true });
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let raf = 0;
    let dpr = 1;

    // Resize handler with devicePixelRatio capped at 2
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = cv.clientWidth;
      h = cv.clientHeight;
      cv.width = w * dpr;
      cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    // ─────────────────────────────────────────────────────────────────────────
    // Procedural Smooth Lightning Generator (Midpoint Quadratic Splines)
    // ─────────────────────────────────────────────────────────────────────────
    function generatePoints(start: Point, targetY: number, angleBias = 0): Point[] {
      const points: Point[] = [{ ...start }];
      let curr = { ...start };
      let currentAngle = Math.PI / 2 + angleBias; // Downward
      const segLength = (density === "vecna_heavy" ? 18 : 16) + Math.random() * 8;

      let safety = 0;
      while (curr.y < targetY && safety < 60) {
        safety++;
        // Smooth angular steering with momentum dampening for natural lightning curvature
        const angleDelta = (Math.random() - 0.5) * (density === "vecna_heavy" ? 0.72 : 0.65);
        currentAngle = currentAngle * 0.4 + (Math.PI / 2 + angleBias + angleDelta) * 0.6;

        const nextX = curr.x + Math.cos(currentAngle) * segLength;
        const nextY = curr.y + Math.sin(currentAngle) * segLength;

        const nextPoint = { x: nextX, y: nextY };
        points.push(nextPoint);
        curr = nextPoint;
      }

      return points;
    }

    function createBranch(
      start: Point,
      targetY: number,
      depth = 0,
      angleBias = 0
    ): BoltBranch {
      const points = generatePoints(start, targetY, angleBias);
      const branches: BoltBranch[] = [];

      // Add smooth sub-branches at natural fork positions
      if (depth < 2 && points.length > 5) {
        const numForks = depth === 0 ? (Math.random() < 0.8 ? 2 : 1) : Math.random() < 0.45 ? 1 : 0;
        const totalLen = targetY - start.y;

        for (let f = 0; f < numForks; f++) {
          const forkIndex = Math.floor(points.length * (0.25 + (f * 0.35) + Math.random() * 0.2));
          if (forkIndex < points.length - 1) {
            const forkStart = points[forkIndex];
            const forkAngle = (f % 2 === 0 ? 1 : -1) * (0.38 + Math.random() * 0.35);
            const forkTargetY = Math.min(
              h,
              forkStart.y + (totalLen - (forkStart.y - start.y)) * (0.45 + Math.random() * 0.25)
            );
            branches.push(createBranch(forkStart, forkTargetY, depth + 1, forkAngle));
          }
        }
      }

      // Convert point pairs to segments for backward-compatibility / rendering
      const segments: { p1: Point; p2: Point }[] = [];
      for (let i = 0; i < points.length - 1; i++) {
        segments.push({ p1: points[i], p2: points[i + 1] });
      }

      return { segments, branches };
    }

    function createBolt(customStartX?: number): ActiveStrike {
      const startX =
        customStartX !== undefined
          ? customStartX
          : w * 0.1 + Math.random() * (w * 0.8);
      const startY = Math.random() * 15;
      const targetY = h * 0.65 + Math.random() * (h * 0.35);

      const root = createBranch(
        { x: startX, y: startY },
        targetY,
        0,
        (Math.random() - 0.5) * 0.28
      );
      // Extended duration: 75 to 115 frames (~1.25s - 1.9s)
      const boltLife =
        density === "vecna_heavy"
          ? 85 + Math.floor(Math.random() * 30)
          : 75 + Math.floor(Math.random() * 25);

      return {
        root,
        life: 1.0,
        maxLife: boltLife,
        flicker: true,
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Ambient Permanent Faint Cracks
    // ─────────────────────────────────────────────────────────────────────────
    const ambientCracks: BoltBranch[] = [
      createBranch({ x: w * 0.22, y: 0 }, h * 0.45, 1, 0.18),
      createBranch({ x: w * 0.78, y: 0 }, h * 0.55, 1, -0.22),
      createBranch({ x: w * 0.48, y: 0 }, h * 0.42, 1, 0.1),
      createBranch({ x: w * 0.35, y: 0 }, h * 0.38, 1, -0.12),
      createBranch({ x: w * 0.88, y: 0 }, h * 0.48, 1, -0.16),
    ];

    // ─────────────────────────────────────────────────────────────────────────
    // Drifting Red Embers / Spores
    // ─────────────────────────────────────────────────────────────────────────
    const emberCount = 42;
    const embers = Array.from({ length: emberCount }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 2.2 + 0.6,
      vx: (Math.random() - 0.5) * 0.35,
      vy: -(Math.random() * 0.75 + 0.25),
      a: Math.random() * 0.6 + 0.2,
      ph: Math.random() * Math.PI * 2,
    }));

    // Active Strikes pool & Flash State
    let strikes: ActiveStrike[] = [];
    let flashIntensity = 0;
    // Initial strike quickly after page load, then ongoing smooth cadence
    let nextStrikeTime = Date.now() + 400 + Math.random() * 800;

    // Trigger spontaneous strikes
    const triggerStrike = () => {
      strikes.push(createBolt());

      // 65% chance of simultaneous branching bolt across opposite side
      if (Math.random() < 0.65) {
        const sideX =
          Math.random() > 0.5
            ? w * 0.12 + Math.random() * (w * 0.28)
            : w * 0.6 + Math.random() * (w * 0.28);
        strikes.push(createBolt(sideX));
      }

      flashIntensity = density === "vecna_heavy" ? 0.95 : 0.88;
      if (onFlash) onFlash(1.0);

      // Follow-up smooth secondary crackle
      if (Math.random() < 0.6) {
        setTimeout(() => {
          strikes.push(createBolt());
          flashIntensity = Math.max(flashIntensity, 0.75);
          if (onFlash) onFlash(0.75);
        }, 180 + Math.random() * 100);
      }
    };

    // Render a single branch smoothly using quadratic splines and multi-layer glow
    function drawBranch(branch: BoltBranch, opacity: number, depth = 0) {
      if (branch.segments.length === 0 || opacity <= 0.008) return;

      const segs = branch.segments;
      const scale = depth === 0 ? 1 : depth === 1 ? 0.68 : 0.42;
      const isHeavy = density === "vecna_heavy";

      // Helper to trace smooth curve through all segment points
      const traceSmoothCurve = () => {
        ctx!.beginPath();
        ctx!.moveTo(segs[0].p1.x, segs[0].p1.y);
        for (let i = 0; i < segs.length - 1; i++) {
          const midX = (segs[i].p2.x + segs[i + 1].p2.x) / 2;
          const midY = (segs[i].p2.y + segs[i + 1].p2.y) / 2;
          ctx!.quadraticCurveTo(segs[i].p2.x, segs[i].p2.y, midX, midY);
        }
        ctx!.lineTo(segs[segs.length - 1].p2.x, segs[segs.length - 1].p2.y);
      };

      // PASS 1: Broad Red Atmospheric Plasma Aura
      ctx!.save();
      traceSmoothCurve();
      ctx!.strokeStyle = `rgba(255, 36, 56, ${0.16 * opacity})`;
      ctx!.lineWidth = (depth === 0 ? (isHeavy ? 22 : 16) : (isHeavy ? 11 : 8)) * scale;
      ctx!.lineCap = "round";
      ctx!.lineJoin = "round";
      ctx!.shadowColor = "#ff2438";
      ctx!.shadowBlur = (isHeavy ? 26 : 20) * scale;
      ctx!.stroke();
      ctx!.restore();

      // PASS 2: Medium Smooth Crimson Core
      ctx!.save();
      traceSmoothCurve();
      ctx!.strokeStyle = `rgba(255, 42, 62, ${0.62 * opacity})`;
      ctx!.lineWidth = (depth === 0 ? (isHeavy ? 7 : 5) : (isHeavy ? 3.8 : 2.6)) * scale;
      ctx!.lineCap = "round";
      ctx!.lineJoin = "round";
      ctx!.shadowColor = "#ff2840";
      ctx!.shadowBlur = (isHeavy ? 14 : 10) * scale;
      ctx!.stroke();
      ctx!.restore();

      // PASS 3: Bright Pale White-Pink Center
      ctx!.save();
      traceSmoothCurve();
      ctx!.strokeStyle = `rgba(255, 235, 240, ${0.96 * opacity})`;
      ctx!.lineWidth = (depth === 0 ? (isHeavy ? 2.4 : 1.8) : (isHeavy ? 1.4 : 1.0)) * scale;
      ctx!.lineCap = "round";
      ctx!.lineJoin = "round";
      ctx!.shadowColor = "#ffffff";
      ctx!.shadowBlur = (isHeavy ? 5 : 4) * scale;
      ctx!.stroke();
      ctx!.restore();

      // Draw child branches with smooth inherited opacity
      for (const b of branch.branches) {
        drawBranch(b, opacity * 0.88, depth + 1);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 60FPS Main Animation Loop
    // ─────────────────────────────────────────────────────────────────────────
    const tick = (t: number) => {
      ctx.clearRect(0, 0, w, h);

      // Trigger strikes with smooth recurring tempo
      const now = Date.now();
      if (now >= nextStrikeTime) {
        triggerStrike();
        const minGap = 1600;
        const randGap = 1500;
        nextStrikeTime = now + minGap + Math.random() * randGap;
      }

      // 1. Ambient Cracks: soft continuous breath
      const ambientPulse = 0.12 + Math.sin(t / 800) * 0.04;
      for (const crack of ambientCracks) {
        drawBranch(crack, ambientPulse, 1);
      }

      // 2. Active Strikes: Smooth organic decay & soft electrical shimmer
      strikes = strikes.filter((strike) => {
        strike.life -= 1 / strike.maxLife;
        if (strike.life <= 0) return false;

        // Smooth cubic-bezier-like decay curve for linger + smooth shimmer
        const progress = 1 - strike.life; // 0 (start) -> 1 (end)
        let renderOpacity = 1;

        if (progress < 0.08) {
          // Rapid smooth emergence (0 to 1)
          renderOpacity = progress / 0.08;
        } else if (progress < 0.45) {
          // High sustain with gentle electric micro-shimmer
          const shimmer = 0.92 + Math.sin(progress * 40 + t * 0.05) * 0.08;
          renderOpacity = shimmer;
        } else {
          // Smooth lingering tail dissipation
          const tailProgress = (progress - 0.45) / 0.55;
          renderOpacity = Math.pow(1 - tailProgress, 1.4) * (0.9 + Math.sin(tailProgress * 20) * 0.1);
        }

        drawBranch(strike.root, Math.max(0, renderOpacity), 0);
        return true;
      });

      // 3. Drifting Embers / Spores
      for (const p of embers) {
        p.x += p.vx + Math.sin(t / 1200 + p.ph) * 0.35;
        p.y += p.vy;

        if (p.y < -10) {
          p.y = h + 10;
          p.x = Math.random() * w;
        }
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;

        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3.5);
        g.addColorStop(0, `rgba(255, 60, 75, ${p.a * 0.85})`);
        g.addColorStop(0.5, `rgba(255, 36, 56, ${p.a * 0.4})`);
        g.addColorStop(1, "rgba(255, 36, 56, 0)");

        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 3.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // 4. Smooth Ambient Flash Overlay Decay
      if (flashIntensity > 0.008) {
        if (flashOverlayRef.current) {
          flashOverlayRef.current.style.opacity = `${flashIntensity}`;
        }
        flashIntensity *= 0.945; // Gentle cinematic dissipation
        if (flashIntensity < 0.015) {
          flashIntensity = 0;
          if (flashOverlayRef.current) {
            flashOverlayRef.current.style.opacity = "0";
          }
          if (onFlash) onFlash(0);
        }
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [reducedMotion, onFlash, density]);

  return (
    <>
      {/* Full-Screen Procedural Lightning & Embers Canvas */}
      <canvas
        ref={canvasRef}
        className={`layer ${className}`}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: 2,
          pointerEvents: "none",
          ...style,
        }}
      />

      {/* Full-Screen Red Flash Overlay */}
      <div
        ref={flashOverlayRef}
        className="layer"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 3,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse at 50% 35%, rgba(255, 60, 70, 0.38) 0%, rgba(180, 14, 30, 0.15) 50%, transparent 85%), linear-gradient(180deg, rgba(255, 36, 56, 0.2) 0%, transparent 60%)",
          opacity: 0,
          transition: "opacity 0.06s ease-out",
        }}
      />
    </>
  );
}
