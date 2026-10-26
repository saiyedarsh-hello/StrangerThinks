"use client";
import React, { useEffect } from "react";

interface PauseOverlayProps {
  teamName?: string;
  isVecna?: boolean;
}

export default function PauseOverlay({ teamName, isVecna = false }: PauseOverlayProps) {
  useEffect(() => {
    if (typeof document === "undefined") return;

    // Capture original body/documentElement scroll styles
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyOverscroll = document.body.style.overscrollBehavior;
    const originalTouchAction = document.body.style.touchAction;

    // Hard-lock background scrolling
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    document.body.style.touchAction = "none";

    const preventScroll = (e: Event) => {
      e.preventDefault();
    };

    const blockScrollKeys = (e: KeyboardEvent) => {
      if (
        [
          "ArrowUp",
          "ArrowDown",
          "PageUp",
          "PageDown",
          "Space",
          "Home",
          "End",
        ].includes(e.code)
      ) {
        e.preventDefault();
      }
    };

    // Attach non-passive listeners to guarantee wheel & touchmove cancelation
    window.addEventListener("wheel", preventScroll, { passive: false });
    window.addEventListener("touchmove", preventScroll, { passive: false });
    window.addEventListener("keydown", blockScrollKeys, { passive: false });

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.overscrollBehavior = originalBodyOverscroll;
      document.body.style.touchAction = originalTouchAction;

      window.removeEventListener("wheel", preventScroll);
      window.removeEventListener("touchmove", preventScroll);
      window.removeEventListener("keydown", blockScrollKeys);
    };
  }, []);

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label="Tournament Paused"
      onWheel={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onTouchMove={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/90 backdrop-blur-md text-amber-100 select-none p-4 overflow-hidden overscroll-none touch-none pointer-events-auto"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-950/40 via-black/80 to-black pointer-events-none" />

      {/* CRT scanlines effect */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255, 0, 0, 0.15) 0px, rgba(255, 0, 0, 0.15) 1px, transparent 1px, transparent 3px)",
        }}
      />

      <div className="relative max-w-lg w-full max-h-[92vh] overflow-hidden border-2 border-red-700/80 bg-stone-950/95 p-6 md:p-8 shadow-[0_0_50px_rgba(220,38,38,0.4)] text-center rounded-none font-mono">
        {/* Pulsing Beacon Header */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <span className="relative flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-600" />
          </span>
          <span className="text-xs uppercase tracking-widest text-red-500 font-bold">
            HAWKINS LAB TELEMETRY // SYSTEM HALT
          </span>
          <span className="relative flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-600" />
          </span>
        </div>

        <h2 className="text-2xl md:text-3xl font-black tracking-wider text-red-500 uppercase mb-3 drop-shadow-[0_0_12px_rgba(239,68,68,0.6)]">
          {isVecna ? "SHADOW REALM SUPPRESSED" : "EVENT TEMPORARILY PAUSED"}
        </h2>

        <div className="h-0.5 bg-gradient-to-r from-transparent via-red-600/70 to-transparent my-4" />

        <p className="text-sm md:text-base text-stone-300 leading-relaxed mb-4">
          Hawkins National Laboratory command has initiated a temporary security hold. All protocol clocks, challenges, and submissions are currently frozen.
        </p>

        {teamName && (
          <div className="inline-block px-3 py-1 bg-red-950/60 border border-red-800/60 text-red-300 text-xs tracking-wider uppercase mb-5">
            SQUAD STATUS: <span className="font-bold text-amber-300">{teamName}</span> // SUSPENDED
          </div>
        )}

        <div className="text-xs text-stone-400 border border-stone-800 bg-stone-900/60 p-3 mb-2 flex items-center justify-center gap-2">
          <svg className="w-4 h-4 text-red-400 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span>STAND BY FOR COMMAND CLEARANCE BROADCAST...</span>
        </div>

        <p className="text-[10px] text-stone-500 tracking-wider">
          PLEASE DO NOT REFRESH OR CLOSE THIS WINDOW. YOUR MISSION PROGRESS IS SAVED.
        </p>
      </div>
    </div>
  );
}
