// components/IntroLightning.tsx
"use client";
import React, { useEffect, useRef } from "react";

/* ------------------------------------------------------------------ */
/*  AUDIO: synthesized thunder (no mp3 needed)                         */
/* ------------------------------------------------------------------ */
let actx: AudioContext | null = null;
let master: GainNode | null = null;
let whiteBuf: AudioBuffer | null = null;
let brownBuf: AudioBuffer | null = null;

/** Call this from a click / keypress handler (browsers block audio before a user gesture). */
export function unlockAudio() {
  try {
    const AC: typeof AudioContext =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!actx) {
      actx = new AC();
      const comp = actx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.ratio.value = 10;
      master = actx.createGain();
      master.gain.value = 0.95;
      master.connect(comp);
      comp.connect(actx.destination);

      const sr = actx.sampleRate;
      whiteBuf = actx.createBuffer(1, sr, sr);
      const w = whiteBuf.getChannelData(0);
      for (let i = 0; i < w.length; i++) w[i] = Math.random() * 2 - 1;

      brownBuf = actx.createBuffer(1, sr * 6, sr);
      const b = brownBuf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < b.length; i++) {
        last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
        b[i] = last * 3.5;
      }
    }
    if (actx.state === "suspended") actx.resume();
  } catch {
    /* audio is optional */
  }
}

/** power: ~0.5 distant crack ... 1.4 massive close strike */
function playThunder(power: number) {
  if (!actx || !master || !whiteBuf || !brownBuf || actx.state !== "running") return;
  const t0 = actx.currentTime;

  // 1) Sharp electrical crack
  const crack = actx.createBufferSource();
  crack.buffer = whiteBuf;
  const hp = actx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 900 + Math.random() * 1600;
  const cg = actx.createGain();
  cg.gain.setValueAtTime(0, t0);
  cg.gain.linearRampToValueAtTime(0.75 * power, t0 + 0.004);
  cg.gain.exponentialRampToValueAtTime(0.001, t0 + 0.12 + 0.12 * power);
  crack.connect(hp);
  hp.connect(cg);
  cg.connect(master);
  crack.start(t0);
  crack.stop(t0 + 0.5);

  // 2) Rolling rumble
  const rumble = actx.createBufferSource();
  rumble.buffer = brownBuf;
  const lp = actx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 140 + Math.random() * 220;
  const rg = actx.createGain();
  const delay = 0.04 + Math.random() * 0.16;
  const dur = 1.1 + power * 2.4;
  rg.gain.setValueAtTime(0, t0 + delay);
  rg.gain.linearRampToValueAtTime(1.0 * power, t0 + delay + 0.06);
  rg.gain.exponentialRampToValueAtTime(0.001, t0 + delay + dur);
  rumble.connect(lp);
  lp.connect(rg);
  rg.connect(master);
  rumble.start(t0 + delay, Math.random() * 1.5);
  rumble.stop(t0 + delay + dur + 0.1);

  // 3) Chest-thump sub boom for big strikes
  if (power >= 0.95) {
    const osc = actx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(70, t0 + 0.03);
    osc.frequency.exponentialRampToValueAtTime(26, t0 + 1.4);
    const og = actx.createGain();
    og.gain.setValueAtTime(0, t0 + 0.03);
    og.gain.linearRampToValueAtTime(0.9, t0 + 0.08);
    og.gain.exponentialRampToValueAtTime(0.001, t0 + 1.6);
    osc.connect(og);
    og.connect(master);
    osc.start(t0 + 0.03);
    osc.stop(t0 + 1.7);
  }
}

/* ------------------------------------------------------------------ */
/*  BOLT GEOMETRY: midpoint displacement + recursive forks             */
/* ------------------------------------------------------------------ */
type Pt = [number, number];
interface Seg {
  pts: Pt[];
  w: number;
}

function jag(a: Pt, b: Pt, detail: number, rough: number): Pt[] {
  let pts: Pt[] = [a, b];
  let off = Math.hypot(b[0] - a[0], b[1] - a[1]) * rough;
  for (let i = 0; i < detail; i++) {
    const next: Pt[] = [];
    for (let j = 0; j < pts.length - 1; j++) {
      const p = pts[j];
      const q = pts[j + 1];
      const dx = q[0] - p[0];
      const dy = q[1] - p[1];
      const L = Math.hypot(dx, dy) || 1;
      const o = (Math.random() - 0.5) * off * 2;
      next.push(p, [(p[0] + q[0]) / 2 + (-dy / L) * o, (p[1] + q[1]) / 2 + (dx / L) * o]);
    }
    next.push(pts[pts.length - 1]);
    pts = next;
    off *= 0.55;
  }
  return pts;
}

function buildBolt(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  w: number,
  depth: number,
  out: Seg[]
) {
  const pts = jag([x0, y0], [x1, y1], depth === 0 ? 6 : 4, depth === 0 ? 0.18 : 0.24);
  out.push({ pts, w });
  if (depth >= 2) return;

  const n = depth === 0 ? 3 : 1;
  const dir = Math.atan2(y1 - y0, x1 - x0);
  for (let k = 0; k < n; k++) {
    const idx = Math.floor(pts.length * (0.2 + k * 0.28 + Math.random() * 0.15));
    if (idx >= pts.length) continue;
    const [px, py] = pts[idx];
    const side = k % 2 === 0 ? -1 : 1;
    const ang = dir + side * (0.32 + Math.random() * 0.45);
    const remaining = Math.hypot(x1 - px, y1 - py);
    const L = Math.max(32, remaining * (0.28 + Math.random() * 0.3));
    buildBolt(px, py, px + Math.cos(ang) * L, py + Math.sin(ang) * L, w * 0.52, depth + 1, out);
  }
}

function drawSeg(ctx: CanvasRenderingContext2D, s: Seg, a: number, revealY: number) {
  ctx.beginPath();
  let started = false;
  for (const [x, y] of s.pts) {
    if (y > revealY) break;
    if (!started) {
      ctx.moveTo(x, y);
      started = true;
    } else ctx.lineTo(x, y);
  }
  if (!started) return;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // Pure 100% Red Lightning - ONLY red (R=255, G=0, B=0), NO white, NO whitish, NO pink
  // Outer red glow:
  ctx.strokeStyle = `rgba(255, 0, 0, ${a * 0.45})`;
  ctx.lineWidth = Math.max(3.5, s.w * 2.6);
  ctx.stroke();

  // Solid intense pure red core:
  ctx.strokeStyle = `rgba(255, 0, 0, ${a})`;
  ctx.lineWidth = Math.max(1.8, s.w * 1.1);
  ctx.stroke();
}

/** Real strikes flicker: hit, dip, re-hit, dip, fade. */
function strikeAlpha(age: number, dur: number) {
  if (age < 80) return 1;
  if (age < 140) return 0.35;
  if (age < 220) return 1;
  if (age < 300) return 0.45;
  if (age < 420) return 0.95;
  return Math.max(0, 1 - (age - 420) / Math.max(1, dur - 420));
}

/* ------------------------------------------------------------------ */
/*  COMPONENT                                                          */
/* ------------------------------------------------------------------ */
interface IntroLightningProps {
  active: boolean;
  /** ms after `active` until the final mega-strike */
  climaxAt?: number;
  /** play synthesized thunder (needs unlockAudio() called from a click first) */
  sound?: boolean;
  onClimax?: () => void;
  /** 0..1 flash intensity (0.1 steps) for syncing other UI */
  onFlash?: (intensity: number) => void;
}

interface Strike {
  segs: Seg[];
  origins: number[];
  born: number;
  dur: number;
  power: number;
}

export default function IntroLightning({
  active,
  climaxAt = 200,
  sound = true,
  onClimax,
  onFlash,
}: IntroLightningProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const climaxRef = useRef(onClimax);
  const flashRef = useRef(onFlash);
  climaxRef.current = onClimax;
  flashRef.current = onFlash;

  useEffect(() => {
    if (!active) return;
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const t = window.setTimeout(() => climaxRef.current?.(), 300);
      return () => window.clearTimeout(t);
    }

    let W = cv.clientWidth || window.innerWidth || 1200;
    let H = cv.clientHeight || window.innerHeight || 800;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = cv.clientWidth || window.innerWidth || 1200;
      H = cv.clientHeight || window.innerHeight || 800;
      cv.width = W * dpr;
      cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const strikes: Strike[] = [];
    const timeouts: number[] = [];
    const start = performance.now();
    let last = start;
    let climaxed = false;
    let flash = 0;
    let reported = -1;
    let raf = 0;

    // EXACTLY 4 LIGHTNING BOLTS: Spaced cleanly across the screen
    const spawnFourBolts = () => {
      if (climaxed) return;
      climaxed = true;
      const now = performance.now();
      const scale = H / 900;
      const segs: Seg[] = [];
      const xs = [
        W * 0.18,
        W * 0.38,
        W * 0.62,
        W * 0.82,
      ];
      xs.forEach((x) => {
        const x1 = x + (Math.random() - 0.5) * W * 0.16;
        const y1 = H * (0.7 + Math.random() * 0.35);
        buildBolt(x, -20, x1, y1, 3.4 * scale * (0.9 + Math.random() * 0.25), 0, segs);
      });
      const dur = 750;
      strikes.push({ segs, origins: xs, born: now, dur, power: 1.3 });
      flash = 1;
      if (sound) playThunder(1.3);

      timeouts.push(
        window.setTimeout(() => {
          climaxRef.current?.();
        }, dur)
      );
    };

    // Quick initial beat: 4 bolts strike at 120ms
    timeouts.push(
      window.setTimeout(() => {
        spawnFourBolts();
      }, 120)
    );

    const frame = () => {
      const now = performance.now();
      const dt = Math.min(50, now - last);
      last = now;

      ctx.clearRect(0, 0, W, H);

      // Bolts only on pure black background - NO radial gradients, NO white flash, NO glowing sky light
      ctx.globalCompositeOperation = "source-over";
      for (let i = strikes.length - 1; i >= 0; i--) {
        const s = strikes[i];
        const age = now - s.born;
        if (age >= s.dur) {
          strikes.splice(i, 1);
          continue;
        }
        const a = strikeAlpha(age, s.dur);
        if (age < 300) flash = Math.max(flash, Math.min(1, a * s.power * 0.85));

        // The bolt races down the screen in ~110ms
        const revealY = -20 + (H + 60) * Math.min(1, age / 110);
        s.segs.forEach((seg) => drawSeg(ctx, seg, a, revealY));
      }

      // Decay flash level for synced logo shadow without painting any glowing screen overlay
      flash *= Math.pow(0.9, dt / 16.7);

      const rounded = Math.round(Math.min(1, flash) * 10) / 10;
      if (rounded !== reported) {
        reported = rounded;
        flashRef.current?.(rounded);
      }

      if (climaxed && strikes.length === 0 && flash < 0.01) {
        ctx.clearRect(0, 0, W, H);
        flashRef.current?.(0);
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      timeouts.forEach(clearTimeout);
      window.removeEventListener("resize", resize);
      if (ctx && cv) {
        ctx.clearRect(0, 0, cv.width, cv.height);
      }
      flashRef.current?.(0);
    };
  }, [active, climaxAt, sound]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        zIndex: 4,
        pointerEvents: "none",
        background: "#000000",
      }}
    />
  );
}
