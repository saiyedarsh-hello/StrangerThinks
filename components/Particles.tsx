"use client";
import { useEffect, useRef } from "react";

type Mode = "dust" | "spores" | "embers" | "fireflies" | "rain";

export default function Particles({ mode = "dust", count = 90, color = "255,255,255" }: { mode?: Mode; count?: number; color?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current!;
    const ctx = cv.getContext("2d")!;
    let w = 0, h = 0, raf = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);
    const mk = () => ({
      x: Math.random() * w, y: Math.random() * h,
      r: Math.random() * (mode === "spores" ? 3.2 : 2) + 0.4,
      vx: (Math.random() - 0.5) * 0.3,
      vy: mode === "spores" ? -(Math.random() * 0.5 + 0.1) : mode === "embers" ? -(Math.random() * 0.9 + 0.2) : mode === "rain" ? Math.random() * 9 + 7 : (Math.random() - 0.5) * 0.2,
      a: Math.random() * 0.7 + 0.15, ph: Math.random() * 6.28,
    });
    const ps = Array.from({ length: count }, mk);
    const tick = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      for (const p of ps) {
        p.x += p.vx + Math.sin(t / 1200 + p.ph) * 0.25;
        p.y += p.vy;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        let a = p.a;
        if (mode === "fireflies") a = (Math.sin(t / 700 + p.ph) + 1) / 2 * p.a * 1.4;
        if (mode === "rain") {
          ctx.strokeStyle = `rgba(${color},${a * 0.35})`;
          ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - 1, p.y + 12); ctx.stroke();
          continue;
        }
        const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        g.addColorStop(0, `rgba(${color},${a})`);
        g.addColorStop(1, `rgba(${color},0)`);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, 6.2832); ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [mode, count, color]);
  return (
    <canvas
      ref={ref}
      className="layer"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
      }}
    />
  );
}
