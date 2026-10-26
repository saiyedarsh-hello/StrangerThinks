"use client";
import React, { useState } from "react";
import { motion } from "framer-motion";
import { sfx } from "@/lib/audio";

interface SecurityDisqualifiedScreenProps {
  reason?: string;
  onAdminReset?: () => void;
}

export default function SecurityDisqualifiedScreen({
  reason = "MULTIPLE WINDOW FOCUS LOSS / ALT-TAB VIOLATIONS DETECTED (2 OF 2 STRIKES EXCEEDED)",
  onAdminReset,
}: SecurityDisqualifiedScreenProps) {
  const [showOverride, setShowOverride] = useState(false);
  const [overridePass, setOverridePass] = useState("");
  const [overrideError, setOverrideError] = useState(false);

  const handleAdminOverride = (e: React.FormEvent) => {
    e.preventDefault();
    // Validate override code (accepts "HAWKINS86", "ADMIN", "OVERRIDE", or "VECNA")
    const cleaned = overridePass.trim().toUpperCase();
    if (cleaned === "HAWKINS86" || cleaned === "ADMIN" || cleaned === "OVERRIDE" || cleaned === "VECNA86") {
      sfx("ok");
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("hawkins_security_kicked");
        sessionStorage.removeItem("hawkins_kicked_reason");
        // Clear all security strikes in storage
        Object.keys(sessionStorage).forEach((key) => {
          if (key.startsWith("hawkins_security_strikes")) {
            sessionStorage.removeItem(key);
          }
        });
        localStorage.removeItem("hawkins_security_kicked");
      }
      if (onAdminReset) {
        onAdminReset();
      } else {
        window.location.href = "/?landing=1";
      }
    } else {
      sfx("err");
      setOverrideError(true);
      setTimeout(() => setOverrideError(false), 2000);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999999,
        background: "radial-gradient(circle at center, #1a0203 0%, #050001 100%)",
        color: "#f87171",
        fontFamily: "'Courier New', Courier, monospace",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* Heavy Red CRT Vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          border: "8px solid #991b1b",
          boxShadow: "inset 0 0 100px rgba(153, 27, 27, 0.7), 0 0 50px rgba(153, 27, 27, 0.9)",
          pointerEvents: "none",
        }}
      />

      {/* CRT Scanline bars */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "repeating-linear-gradient(0deg, rgba(0,0,0,0.4) 0px, rgba(0,0,0,0.4) 1px, transparent 1px, transparent 3px)",
          pointerEvents: "none",
          opacity: 0.9,
        }}
      />

      {/* Main Terminal Box */}
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "760px",
          background: "#0c0203",
          border: "2px solid #ef4444",
          borderRadius: "6px",
          padding: "36px 32px",
          boxShadow: "0 0 60px rgba(220, 38, 38, 0.5), inset 0 0 30px rgba(0,0,0,0.9)",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "20px",
          boxSizing: "border-box",
        }}
      >
        {/* Top Hazard Caution Strip */}
        <div
          style={{
            width: "100%",
            height: "12px",
            background: "repeating-linear-gradient(45deg, #ef4444, #ef4444 15px, #180304 15px, #180304 30px)",
            borderBottom: "1.5px solid #ef4444",
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <span style={{ fontSize: "11px", letterSpacing: ".3em", color: "#fca5a5", fontWeight: 900 }}>
            HAWKINS NATIONAL LABORATORY · RESTRICTED ACCESS
          </span>
          <span style={{ fontSize: "10px", letterSpacing: ".15em", color: "#9ca3af" }}>
            SECURITY SECTOR 4 · CONTESTANT INTEGRITY PROTOCOL
          </span>
        </div>

        {/* Skull / Terminal Lock Badge */}
        <div
          style={{
            width: "72px",
            height: "72px",
            borderRadius: "50%",
            background: "rgba(239, 68, 68, 0.15)",
            border: "2px solid #ef4444",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "36px",
            boxShadow: "0 0 25px rgba(239, 68, 68, 0.5)",
          }}
        >
          🔒
        </div>

        {/* Title */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(24px, 5vw, 34px)",
              fontFamily: "'Benguiat Bold', 'Times New Roman', serif",
              letterSpacing: ".1em",
              color: "#ff2222",
              textShadow: "0 0 20px rgba(255, 34, 34, 0.8)",
              textTransform: "uppercase",
            }}
          >
            SESSION TERMINATED
          </h1>
          <span
            style={{
              fontSize: "13px",
              fontWeight: 900,
              letterSpacing: ".2em",
              color: "#fecaca",
            }}
          >
            STATUS: SQUAD DISQUALIFIED / EXPELLED
          </span>
        </div>

        {/* Violation Log Box */}
        <div
          style={{
            width: "100%",
            background: "rgba(0, 0, 0, 0.75)",
            border: "1.5px solid #7f1d1d",
            borderRadius: "4px",
            padding: "16px 20px",
            textAlign: "left",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            fontSize: "12px",
            color: "#e5e7eb",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed #7f1d1d", paddingBottom: "6px" }}>
            <span style={{ color: "#f87171", fontWeight: 800 }}>INCIDENT CODE:</span>
            <span style={{ fontFamily: "monospace", color: "#fca5a5" }}>SEC-ALT-TAB-02 // FINAL STRIKE</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px dashed #7f1d1d", paddingBottom: "6px" }}>
            <span style={{ color: "#f87171", fontWeight: 800 }}>REASON:</span>
            <span style={{ color: "#fef2f2", fontWeight: 700 }}>{reason}</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#f87171", fontWeight: 800 }}>ACTION EXECUTED:</span>
            <span style={{ color: "#ef4444", fontWeight: 900 }}>AUTHENTICATED SESSION PURGED & TERMINAL LOCKED</span>
          </div>
        </div>

        {/* Rule description */}
        <p
          style={{
            fontSize: "13px",
            lineHeight: 1.6,
            color: "#d1d5db",
            margin: "0",
            maxWidth: "620px",
          }}
        >
          Tournament anti-cheat regulations require participants to remain focused within the Hawkins Terminal at all times.
          Your squad exceeded the allowable limit of focus transitions (Alt-Tab / Tab Switching).
          <br />
          <strong style={{ color: "#fca5a5" }}>
            To contest this decision or request terminal reactivation, contact an event administrator in the venue.
          </strong>
        </p>

        {/* Buttons / Actions */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", width: "100%", justifyContent: "center", marginTop: "6px" }}>
          <button
            type="button"
            onClick={() => {
              sfx("click");
              setShowOverride(!showOverride);
            }}
            style={{
              padding: "10px 18px",
              background: "rgba(255,255,255,0.06)",
              color: "#9ca3af",
              border: "1px solid #4b5563",
              borderRadius: "4px",
              fontSize: "12px",
              fontFamily: "'Courier New', monospace",
              fontWeight: 700,
              letterSpacing: ".08em",
              cursor: "pointer",
            }}
          >
            {showOverride ? "CLOSE OVERRIDE PANEL" : "ADMINISTRATOR OVERRIDE"}
          </button>

          <button
            type="button"
            onClick={() => {
              sfx("click");
              window.location.href = "/?landing=1";
            }}
            style={{
              padding: "10px 22px",
              background: "#1f2937",
              color: "#e5e7eb",
              border: "1px solid #374151",
              borderRadius: "4px",
              fontSize: "12px",
              fontFamily: "'Courier New', monospace",
              fontWeight: 700,
              letterSpacing: ".08em",
              cursor: "pointer",
            }}
          >
            RETURN TO MAIN GATE
          </button>
        </div>

        {/* Admin Override Form */}
        {showOverride && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            onSubmit={handleAdminOverride}
            style={{
              marginTop: "10px",
              width: "100%",
              maxWidth: "480px",
              background: "rgba(0,0,0,0.85)",
              border: "1px solid #dc2626",
              borderRadius: "4px",
              padding: "16px 20px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              textAlign: "left",
            }}
          >
            <label style={{ fontSize: "11px", color: "#f87171", fontWeight: 800, letterSpacing: ".1em" }}>
              ENTER ADMINISTRATOR PASSCODE TO UNLOCK SQUAD:
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="password"
                placeholder="Admin Passcode..."
                value={overridePass}
                onChange={(e) => setOverridePass(e.target.value)}
                autoFocus
                style={{
                  flex: 1,
                  background: "#111827",
                  border: overrideError ? "1.5px solid #ef4444" : "1.5px solid #4b5563",
                  color: "#ffffff",
                  padding: "8px 12px",
                  fontSize: "13px",
                  fontFamily: "'Courier New', monospace",
                  borderRadius: "3px",
                  outline: "none",
                }}
              />
              <button
                type="submit"
                style={{
                  background: "#dc2626",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "3px",
                  padding: "8px 16px",
                  fontSize: "12px",
                  fontWeight: 900,
                  fontFamily: "'Courier New', monospace",
                  cursor: "pointer",
                }}
              >
                UNLOCK
              </button>
            </div>
            {overrideError && (
              <span style={{ fontSize: "11px", color: "#ef4444", fontWeight: 800 }}>
                INVALID OVERRIDE PASSCODE. RE-ENTER CREDENTIALS.
              </span>
            )}
          </motion.form>
        )}
      </motion.div>
    </div>
  );
}
