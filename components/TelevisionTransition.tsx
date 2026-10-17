"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { sfx } from "@/lib/audio";

interface TelevisionTransitionProps {
  isTransitioning: boolean;
  onMidpoint?: () => void;
  onComplete?: () => void;
  durationMs?: number;
}

export default function TelevisionTransition({
  isTransitioning,
  onMidpoint,
  onComplete,
  durationMs = 460,
}: TelevisionTransitionProps) {
  const [phase, setPhase] = useState<"idle" | "collapsing" | "expanding">("idle");
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!isTransitioning) {
      setPhase("idle");
      return;
    }

    // Play retro CRT TV channel / power switch sound
    sfx("tvSwitch");
    setPhase("collapsing");

    const midpointTimer = setTimeout(() => {
      if (onMidpoint) onMidpoint();
      setPhase("expanding");
    }, durationMs * 0.42);

    const completeTimer = setTimeout(() => {
      setPhase("idle");
      if (onComplete) onComplete();
    }, durationMs);

    return () => {
      clearTimeout(midpointTimer);
      clearTimeout(completeTimer);
    };
  }, [isTransitioning, durationMs, onMidpoint, onComplete]);

  // Noise generator on canvas
  useEffect(() => {
    if (phase === "idle") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const W = (canvas.width = 160);
    const H = (canvas.height = 90);
    const imgData = ctx.createImageData(W, H);
    const buffer32 = new Uint32Array(imgData.data.buffer);

    const renderNoise = () => {
      const len = buffer32.length;
      for (let i = 0; i < len; i++) {
        const val = (Math.random() * 255) | 0;
        buffer32[i] = (255 << 24) | (val << 16) | (val << 8) | val;
      }
      ctx.putImageData(imgData, 0, 0);
      animId = requestAnimationFrame(renderNoise);
    };

    animId = requestAnimationFrame(renderNoise);
    return () => cancelAnimationFrame(animId);
  }, [phase]);

  if (phase === "idle" && !isTransitioning) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        pointerEvents: "auto",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: phase === "collapsing" ? "transparent" : "#000000",
      }}
      aria-hidden="true"
    >
      {/* ── Outer TV Curvature Bezel Vignette ── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          boxShadow: "inset 0 0 120px rgba(0, 0, 0, 0.95), inset 0 0 40px rgba(0, 0, 0, 0.8)",
          pointerEvents: "none",
          zIndex: 10,
        }}
      />

      {/* ── Scanlines Layer ── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(0,0,0,0.5) 0px, rgba(0,0,0,0.5) 1.5px, transparent 1.5px, transparent 3px)",
          pointerEvents: "none",
          zIndex: 8,
          opacity: 0.75,
        }}
      />

      {/* ── Dynamic CRT Static Noise Canvas ── */}
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: phase === "collapsing" ? 0.32 : 0.2,
          mixBlendMode: "screen",
          imageRendering: "pixelated",
          zIndex: 6,
        }}
      />

      {/* ── CRT Electron Beam Collapse & Power-On Flash Animation ── */}
      <motion.div
        initial={
          phase === "collapsing"
            ? { scaleX: 1, scaleY: 1, opacity: 1, filter: "brightness(1.3)" }
            : { scaleX: 0.003, scaleY: 0.002, opacity: 0 }
        }
        animate={
          phase === "collapsing"
            ? {
                scaleX: [1, 1.02, 0.003],
                scaleY: [1, 0.005, 0.002],
                opacity: [1, 1, 0.85, 0],
                filter: [
                  "brightness(1) contrast(1)",
                  "brightness(2.6) contrast(1.8)",
                  "brightness(3.5) contrast(2.2)",
                ],
              }
            : {
                scaleX: [0.003, 1, 1],
                scaleY: [0.002, 0.005, 1],
                opacity: [0, 0.95, 1],
                filter: [
                  "brightness(3.5) contrast(2.2)",
                  "brightness(2) contrast(1.5)",
                  "brightness(1) contrast(1)",
                ],
              }
        }
        transition={{
          duration: durationMs / 1000 / 2,
          ease: phase === "collapsing" ? [0.65, 0, 0.35, 1] : [0.15, 0.85, 0.35, 1],
        }}
        style={{
          position: "absolute",
          inset: 0,
          background:
            phase === "collapsing"
              ? "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(180,240,255,0.98) 50%, rgba(255,255,255,0.92) 100%)"
              : "radial-gradient(ellipse at center, rgba(255,255,255,1) 0%, rgba(140,230,255,0.85) 45%, rgba(0,0,0,0.9) 100%)",
          zIndex: 7,
          boxShadow: "0 0 45px rgba(180, 240, 255, 0.9), 0 0 90px rgba(255, 255, 255, 0.85)",
          transformOrigin: "center center",
          pointerEvents: "none",
        }}
      />

      {/* ── Phosphor Flash Horizontal Slit Line (The Laser Flash Beam) ── */}
      <motion.div
        initial={{ opacity: 0, scaleY: 0 }}
        animate={{
          opacity: [0, 1, 0.85, 0],
          scaleY: [0, 1, 0.5, 0],
          scaleX: phase === "collapsing" ? [1, 1, 0.02, 0] : [0, 0.02, 1, 1],
        }}
        transition={{ duration: durationMs / 1000, times: [0, 0.2, 0.6, 1] }}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          height: "2.5px",
          background: "#ffffff",
          boxShadow:
            "0 0 16px 4px #ffffff, 0 0 35px 12px rgba(140, 230, 255, 0.95), 0 0 75px 22px rgba(255, 75, 90, 0.75)",
          zIndex: 12,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

/**
 * Custom Hook to trigger TV Transitions smoothly across any section or view change.
 */
export function useTelevisionTransition(durationMs = 460) {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const callbackRef = useRef<(() => void) | null>(null);

  const triggerTransition = useCallback((onMidpointCallback?: () => void) => {
    if (onMidpointCallback) {
      callbackRef.current = onMidpointCallback;
    }
    setIsTransitioning(true);
  }, []);

  const handleMidpoint = useCallback(() => {
    if (callbackRef.current) {
      callbackRef.current();
      callbackRef.current = null;
    }
  }, []);

  const handleComplete = useCallback(() => {
    setIsTransitioning(false);
  }, []);

  const TelevisionOverlay = useCallback(
    () => (
      <TelevisionTransition
        isTransitioning={isTransitioning}
        onMidpoint={handleMidpoint}
        onComplete={handleComplete}
        durationMs={durationMs}
      />
    ),
    [isTransitioning, handleMidpoint, handleComplete, durationMs]
  );

  return {
    isTransitioning,
    triggerTransition,
    TelevisionOverlay,
  };
}
