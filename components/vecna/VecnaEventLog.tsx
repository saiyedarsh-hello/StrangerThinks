"use client";
import React, { useState } from "react";
import { sfx } from "@/lib/audio";

export interface LogEventItem {
  id: string;
  time: string;
  type: "RADIO" | "LOCK" | "MESSAGE" | "SHADOWS" | "ENV" | "CORRUPT" | "GLITCH" | "AWARD" | "STORY";
  description: string;
  target: string;
}

interface VecnaEventLogProps {
  events: LogEventItem[];
}

export default function VecnaEventLog({ events }: VecnaEventLogProps) {
  const [showAll, setShowAll] = useState(false);

  const getIcon = (type: LogEventItem["type"]) => {
    switch (type) {
      case "RADIO":
        return "[SIG]";
      case "LOCK":
        return "[LCK]";
      case "MESSAGE":
        return "[MSG]";
      case "SHADOWS":
        return "[SHD]";
      case "ENV":
        return "[ENV]";
      case "CORRUPT":
        return "[CRP]";
      case "GLITCH":
        return "[GLT]";
      case "AWARD":
        return "[AWD]";
      case "STORY":
        return "[STR]";
      default:
        return "●";
    }
  };

  const displayedEvents = showAll ? events : events.slice(0, 6);

  return (
    <div
      style={{
        background: "rgba(10, 3, 6, 0.95)",
        border: "1px solid rgba(255, 45, 58, 0.3)",
        borderRadius: "4px",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        height: "100%",
        minHeight: "260px",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontFamily: "var(--font-title)",
            fontSize: "14px",
            letterSpacing: "0.2em",
            fontWeight: 900,
            color: "#ffffff",
          }}
        >
          <span style={{ color: "#ff2d3a", fontSize: "11px" }}>◆</span> RECENT EVENTS
        </div>
        <button
          onClick={() => {
            sfx("click");
            setShowAll(!showAll);
          }}
          style={{
            background: "none",
            border: "none",
            color: "rgba(255, 180, 180, 0.7)",
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            letterSpacing: "0.1em",
            cursor: "pointer",
            padding: "2px 6px",
          }}
        >
          {showAll ? "COLLAPSE" : "VIEW ALL"}
        </button>
      </div>

      {/* Events List without clipping or dark overlapping masks */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          overflowY: "auto",
          flex: 1,
          paddingRight: "6px",
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(255, 45, 58, 0.4) transparent",
        }}
      >
        {displayedEvents.map((ev) => (
          <div
            key={ev.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "8px 10px",
              background: "rgba(0, 0, 0, 0.55)",
              borderLeft: "3px solid rgba(255, 45, 58, 0.6)",
              borderRadius: "0 3px 3px 0",
              fontSize: "12px",
              fontFamily: "var(--font-mono)",
              flexShrink: 0,
            }}
          >
            {/* Timestamp */}
            <span style={{ color: "rgba(255, 255, 255, 0.45)", fontSize: "11px", minWidth: "58px", flexShrink: 0 }}>
              {ev.time}
            </span>

            {/* Icon */}
            <span style={{ fontSize: "14px", flexShrink: 0 }}>{getIcon(ev.type)}</span>

            {/* Description */}
            <span
              style={{
                color: "rgba(255, 220, 220, 0.95)",
                flex: 1,
                wordBreak: "break-word",
                lineHeight: 1.3,
              }}
            >
              {ev.description}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
