"use client";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { sfx } from "@/lib/audio";

interface SecurityBreachOverlayProps {
  isOpen: boolean;
  onAcknowledge: () => void;
  strikeNumber: number;
  maxStrikes: number;
  reason?: string;
  teamName?: string;
}

export default function SecurityBreachOverlay({
  isOpen,
  onAcknowledge,
  strikeNumber = 1,
  maxStrikes = 2,
  reason = "ALT-TAB / WINDOW FOCUS LOSS DETECTED",
  teamName,
}: SecurityBreachOverlayProps) {
  const [secondsLeft, setSecondsLeft] = useState(10);

  // Play alarm sound and start countdown on open
  useEffect(() => {
    if (!isOpen) {
      setSecondsLeft(10);
      return;
    }

    sfx("alarm");
    setSecondsLeft(10);

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          return 0;
        }
        sfx("blip");
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen]);

  // Prevent background scrolling while overlay is open
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    const originalTouch = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    const blockScroll = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    window.addEventListener("wheel", blockScroll, { passive: false });
    window.addEventListener("touchmove", blockScroll, { passive: false });

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouch;
      window.removeEventListener("wheel", blockScroll);
      window.removeEventListener("touchmove", blockScroll);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 999999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at center, rgba(30, 4, 4, 0.96) 0%, rgba(10, 1, 1, 0.99) 100%)",
          backdropFilter: "blur(10px)",
          color: "#fff",
          fontFamily: "'Courier New', Courier, monospace",
          padding: "20px",
          boxSizing: "border-box",
        }}
      >
        {/* Pulsating red strobe border */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            border: "6px solid #b81d24",
            boxShadow: "inset 0 0 80px rgba(184, 29, 36, 0.6), 0 0 40px rgba(184, 29, 36, 0.8)",
            pointerEvents: "none",
            animation: "pulseRed 1.2s infinite alternate",
          }}
        />

        {/* CRT Scanline overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "repeating-linear-gradient(0deg, rgba(0,0,0,0.35) 0px, rgba(0,0,0,0.35) 1px, transparent 1px, transparent 3px)",
            pointerEvents: "none",
            opacity: 0.85,
          }}
        />

        <style jsx global>{`
          @keyframes pulseRed {
            0% {
              box-shadow: inset 0 0 40px rgba(184, 29, 36, 0.3), 0 0 20px rgba(184, 29, 36, 0.4);
            }
            100% {
              box-shadow: inset 0 0 100px rgba(220, 38, 38, 0.8), 0 0 60px rgba(220, 38, 38, 0.9);
            }
          }
          @keyframes scanlineGlitch {
            0% { transform: translateY(-100%); }
            100% { transform: translateY(1000%); }
          }
        `}</style>

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.9, y: 15 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 15 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          style={{
            position: "relative",
            width: "100%",
            maxWidth: "680px",
            background: "#0d0405",
            border: "2px solid #e53e3e",
            borderRadius: "6px",
            boxShadow: "0 0 50px rgba(184, 29, 36, 0.7), inset 0 0 25px rgba(0,0,0,0.9)",
            padding: "32px 28px",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "18px",
            boxSizing: "border-box",
            overflow: "hidden",
          }}
        >
          {/* Top Hazard Bar */}
          <div
            style={{
              width: "100%",
              height: "10px",
              background: "repeating-linear-gradient(45deg, #b81d24, #b81d24 15px, #1a0506 15px, #1a0506 30px)",
              borderBottom: "1px solid #e53e3e",
              marginBottom: "4px",
            }}
          />

          {/* Department Header */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <span
              style={{
                fontSize: "11px",
                letterSpacing: ".25em",
                color: "#ff6b6b",
                fontWeight: 900,
                textTransform: "uppercase",
              }}
            >
              HAWKINS NATIONAL LABORATORY · DEPARTMENT OF ENERGY
            </span>
            <span
              style={{
                fontSize: "10px",
                letterSpacing: ".18em",
                color: "#a0aec0",
              }}
            >
              AUTOMATED INCIDENT SURVEILLANCE & ANTI-CHEAT DIRECTIVE
            </span>
          </div>

          {/* Flashing Warning Icon & Title */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" }}>
            <span style={{ fontSize: "32px", animation: "pulseRed 0.8s infinite" }}>⚠️</span>
            <h1
              style={{
                margin: 0,
                fontSize: "clamp(20px, 4vw, 26px)",
                fontFamily: "'Benguiat Bold', 'Times New Roman', serif",
                letterSpacing: ".12em",
                color: "#ff3333",
                textShadow: "0 0 16px rgba(255,51,51,0.8)",
                textTransform: "uppercase",
              }}
            >
              SECURITY BREACH DETECTED
            </h1>
          </div>

          {/* Subtitle / Reason */}
          <div
            style={{
              padding: "6px 14px",
              background: "rgba(184, 29, 36, 0.25)",
              border: "1px dashed #e53e3e",
              borderRadius: "3px",
              color: "#fecaca",
              fontSize: "12px",
              fontWeight: 800,
              letterSpacing: ".1em",
            }}
          >
            VIOLATION: {reason.toUpperCase()}
          </div>

          {/* 10-Second Countdown Display */}
          <div
            style={{
              width: "100%",
              background: "rgba(0, 0, 0, 0.65)",
              border: "1.5px solid #7f1d1d",
              borderRadius: "4px",
              padding: "16px 20px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "10px",
              boxSizing: "border-box",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                letterSpacing: ".15em",
                color: "#fca5a5",
                fontWeight: 800,
                textTransform: "uppercase",
              }}
            >
              COMPLIANCE GRACE PERIOD ACTIVE
            </span>

            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: "8px",
              }}
            >
              <span
                style={{
                  fontSize: "clamp(36px, 8vw, 54px)",
                  fontWeight: 900,
                  fontFamily: "'Courier New', monospace",
                  color: secondsLeft <= 3 ? "#ef4444" : "#f59e0b",
                  textShadow: secondsLeft <= 3 ? "0 0 20px rgba(239, 68, 68, 0.9)" : "0 0 15px rgba(245, 158, 11, 0.7)",
                }}
              >
                00:{secondsLeft < 10 ? `0${secondsLeft}` : secondsLeft}
              </span>
              <span style={{ fontSize: "12px", color: "#9ca3af", letterSpacing: ".1em" }}>SEC</span>
            </div>

            {/* Countdown progress bar */}
            <div
              style={{
                width: "100%",
                height: "6px",
                background: "#262626",
                borderRadius: "3px",
                overflow: "hidden",
                border: "1px solid #404040",
              }}
            >
              <div
                style={{
                  width: `${(secondsLeft / 10) * 100}%`,
                  height: "100%",
                  background: secondsLeft <= 3 ? "#ef4444" : "#f59e0b",
                  transition: "width 1s linear, background-color 0.3s ease",
                  boxShadow: secondsLeft <= 3 ? "0 0 10px #ef4444" : "0 0 8px #f59e0b",
                }}
              />
            </div>
          </div>

          {/* Strikes Counter Meter */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "16px",
              width: "100%",
              padding: "10px 14px",
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "4px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span
                style={{
                  width: "12px",
                  height: "12px",
                  borderRadius: "50%",
                  background: "#ef4444",
                  boxShadow: "0 0 10px #ef4444",
                  display: "inline-block",
                }}
              />
              <span style={{ fontSize: "12px", fontWeight: 900, color: "#fca5a5", letterSpacing: ".08em" }}>
                STRIKE {strikeNumber} OF {maxStrikes} RECORDED
              </span>
            </div>

            <span style={{ color: "#4b5563" }}>|</span>

            <span style={{ fontSize: "11px", color: "#f87171", fontWeight: 700, letterSpacing: ".05em" }}>
              2ND VIOLATION = IMMEDIATE LOGOUT & EXPULSION
            </span>
          </div>

          {/* Explanation Text */}
          <p
            style={{
              fontSize: "12.5px",
              lineHeight: 1.6,
              color: "#d1d5db",
              margin: "0",
              maxWidth: "580px",
            }}
          >
            {teamName ? <strong style={{ color: "#fff" }}>SQUAD [{teamName}]: </strong> : null}
            Navigating away from the terminal, switching tabs, or pressing Alt-Tab is strictly prohibited under tournament rules.
            <br />
            <strong style={{ color: "#f87171" }}>
              CRITICAL WARNING: If you Alt-Tab or switch windows a second time, your session will be instantly logged out and your team disqualified.
            </strong>
          </p>

          {/* Acknowledge Button */}
          <button
            type="button"
            onClick={() => {
              sfx("click");
              onAcknowledge();
            }}
            style={{
              marginTop: "8px",
              width: "100%",
              maxWidth: "480px",
              padding: "14px 24px",
              background: "linear-gradient(180deg, #991b1b 0%, #7f1d1d 100%)",
              color: "#ffffff",
              border: "2px solid #ef4444",
              borderRadius: "4px",
              fontFamily: "'Benguiat Bold', serif",
              fontSize: "14px",
              fontWeight: 900,
              letterSpacing: ".15em",
              textTransform: "uppercase",
              cursor: "pointer",
              boxShadow: "0 0 25px rgba(239, 68, 68, 0.5), inset 0 1px 0 rgba(255,255,255,0.2)",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "linear-gradient(180deg, #b91c1c 0%, #991b1b 100%)";
              e.currentTarget.style.boxShadow = "0 0 35px rgba(239, 68, 68, 0.8)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "linear-gradient(180deg, #991b1b 0%, #7f1d1d 100%)";
              e.currentTarget.style.boxShadow = "0 0 25px rgba(239, 68, 68, 0.5)";
            }}
          >
            ACKNOWLEDGE WARNING & RETURN TO TERMINAL
          </button>

          {/* Footer note */}
          <span style={{ fontSize: "9.5px", color: "#6b7280", letterSpacing: ".1em" }}>
            INCIDENT TELEMETRY TRANSMITTED TO CENTRAL AUDIT LOG // ID: {Math.random().toString(36).substring(2, 9).toUpperCase()}
          </span>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
