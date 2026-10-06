"use client";
import React, { useEffect, useState } from "react";
import { sfx } from "@/lib/audio";

interface VecnaHeaderProps {
  operatorName: string;
  onLogout: () => void;
  score?: number;
}

export default function VecnaHeader({ operatorName, onLogout, score = 0 }: VecnaHeaderProps) {
  const [timeStr, setTimeStr] = useState("02:17 AM");

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      let hours = d.getHours();
      const minutes = d.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;
      const formattedHours = hours.toString().padStart(2, "0");
      setTimeStr(`${formattedHours}:${minutes} ${ampm}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 24px",
        background: "rgba(12, 3, 5, 0.95)",
        borderBottom: "1px solid rgba(255, 45, 58, 0.35)",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.8)",
        width: "100%",
        flexWrap: "wrap",
        gap: "16px",
      }}
    >
      {/* Left: Mind Flayer Emblem + Title */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {/* Mind Flayer / Vecna Tentacle SVG Icon */}
        <div
          style={{
            width: "36px",
            height: "36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            filter: "drop-shadow(0 0 8px rgba(255, 45, 58, 0.8))",
          }}
        >
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="#ff2d3a" strokeWidth="1.8">
            <path d="M12 2v8M12 10c-2-3-5-4-8-4 0 4 2 8 6 9M12 10c2-3 5-4 8-4 0 4-2 8-6 9M12 10v12M8 18c-3 1-5 4-5 4M16 18c3 1 5 4 5 4" />
            <circle cx="12" cy="10" r="2" fill="#ff2d3a" />
          </svg>
        </div>

        <div>
          <h1
            style={{
              fontFamily: "var(--font-title)",
              fontSize: "22px",
              fontWeight: 900,
              letterSpacing: "0.22em",
              color: "#ff2d3a",
              margin: 0,
              lineHeight: 1.1,
              textTransform: "uppercase",
            }}
          >
            VECNA CONTROL
          </h1>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "11px",
              letterSpacing: "0.3em",
              color: "rgba(255, 180, 180, 0.6)",
              marginTop: "2px",
            }}
          >
            HAWKINS · 1986
          </div>
        </div>
      </div>

      {/* Right: Retro Digital LED Clock + Operator Info + Logout */}
      <div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
        {/* 1986 Red LED Clock */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            background: "rgba(0, 0, 0, 0.75)",
            border: "1px solid rgba(255, 45, 58, 0.3)",
            padding: "4px 14px",
            borderRadius: "4px",
          }}
        >
          <div
            style={{
              fontSize: "9px",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.25em",
              color: "rgba(255, 120, 120, 0.8)",
            }}
          >
            OCT 21 1986
          </div>
          <div
            style={{
              fontFamily: "var(--font-term)",
              fontSize: "20px",
              color: "#ff2d3a",
              letterSpacing: "0.15em",
              lineHeight: 1,
              textShadow: "0 0 10px rgba(255, 45, 58, 0.8)",
            }}
          >
            {timeStr}
          </div>
        </div>

        {/* Vecna Score Module */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0, 0, 0, 0.75)",
            border: "1px solid rgba(255, 45, 58, 0.3)",
            padding: "4px 14px",
            borderRadius: "4px",
          }}
        >
          <div
            style={{
              fontSize: "9px",
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.25em",
              color: "rgba(255, 120, 120, 0.8)",
              textTransform: "uppercase",
            }}
          >
            SCORE
          </div>
          <div
            style={{
              fontFamily: "var(--font-term)",
              fontSize: "20px",
              color: "#ff2d3a",
              letterSpacing: "0.15em",
              lineHeight: 1,
              textShadow: "0 0 10px rgba(255, 45, 58, 0.8)",
            }}
          >
            {String(score).padStart(3, "0")} / 350
          </div>
        </div>

        {/* Operator Badge */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              fontSize: "13px",
              fontWeight: "bold",
              color: "#ffffff",
              letterSpacing: "0.08em",
            }}
          >
            {operatorName || "Henry Creel"}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "10px",
              color: "#ff3b45",
              letterSpacing: "0.15em",
              fontFamily: "var(--font-mono)",
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#ff2d3a",
                boxShadow: "0 0 6px #ff2d3a",
              }}
            />
            ACTIVE OPERATOR
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={() => {
            sfx("click");
            onLogout();
          }}
          style={{
            padding: "8px 18px",
            background: "transparent",
            border: "1px solid rgba(255, 45, 58, 0.5)",
            color: "#ff4d58",
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            letterSpacing: "0.2em",
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255, 45, 58, 0.2)";
            e.currentTarget.style.color = "#ffffff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "#ff4d58";
          }}
        >
          LOGOUT
        </button>
      </div>
    </header>
  );
}
