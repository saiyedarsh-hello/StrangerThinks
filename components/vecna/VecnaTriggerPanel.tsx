"use client";
import React, { useState } from "react";
import { sfx } from "@/lib/audio";
import { MAP_LOCATIONS } from "./VecnaTacticalMap";

export type TriggerActionKind =
  | "CORRUPT"
  | "RADIO_DISTORTION"
  | "TIME_FREEZE"
  | "LOCK"
  | "SPAWN_SHADOWS"
  | "ENVIRONMENT_CHANGE"
  | "GLITCH"
  | "MISLEAD_CLUE";

export interface TriggerAction {
  id: TriggerActionKind;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  cost: number;
}

export const TRIGGER_ACTIONS: TriggerAction[] = [
  {
    id: "CORRUPT",
    label: "SYSTEM CORRUPTED",
    sublabel: "Scramble challenge screen",
    cost: 20,
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
  {
    id: "RADIO_DISTORTION",
    label: "RADIO DISTORTION",
    sublabel: "Jam 87.6 MHz Morse audio",
    cost: 20,
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4.93 4.93a10 10 0 0 1 14.14 0" />
        <path d="M7.76 7.76a6 6 0 0 1 8.48 0" />
        <circle cx="12" cy="12" r="2" fill="currentColor" />
        <path d="M12 14v7" />
      </svg>
    ),
  },
  {
    id: "TIME_FREEZE",
    label: "TIME FREEZE",
    sublabel: "Deduct 2 mins from timer",
    cost: 30,
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    id: "LOCK",
    label: "LOCK LOCATION",
    sublabel: "Access Denied path seal",
    cost: 25,
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
  {
    id: "SPAWN_SHADOWS",
    label: "SPAWN SHADOWS",
    sublabel: "Demogorgon spore storm",
    cost: 15,
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    id: "ENVIRONMENT_CHANGE",
    label: "ENVIRONMENT CHANGE",
    sublabel: "Shift realm to Upside Down",
    cost: 35,
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
  {
    id: "GLITCH",
    label: "VISUAL GLITCH",
    sublabel: "Trigger CRT static burst",
    cost: 10,
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    id: "MISLEAD_CLUE",
    label: "MISLEAD CLUE",
    sublabel: "Distort hint text into runes",
    cost: 20,
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
        <polyline points="16 3 21 3 21 8" />
        <line x1="4" y1="20" x2="21" y2="3" />
        <polyline points="21 16 21 21 16 21" />
        <line x1="15" y1="15" x2="21" y2="21" />
        <line x1="4" y1="4" x2="9" y2="9" />
      </svg>
    ),
  },
];

interface VecnaTriggerPanelProps {
  selectedLocation: string;
  onSelectLocation: (locId: string) => void;
  onTriggerAction: (action: TriggerAction) => void;
  activeActionId?: string | null;
}

export default function VecnaTriggerPanel({
  selectedLocation,
  onSelectLocation,
  onTriggerAction,
  activeActionId,
}: VecnaTriggerPanelProps) {
  return (
    <div
      style={{
        background: "rgba(10, 3, 6, 0.95)",
        border: "1px solid rgba(255, 45, 58, 0.3)",
        borderRadius: "4px",
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        height: "100%",
      }}
    >
      {/* Header */}
      <div>
        <div
          style={{
            fontFamily: "var(--font-title)",
            fontSize: "15px",
            letterSpacing: "0.2em",
            fontWeight: 900,
            color: "#ff2d3a",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <span>⚡</span> TRIGGER EVENT
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "11px",
            letterSpacing: "0.08em",
            color: "rgba(255, 180, 180, 0.6)",
            marginTop: "2px",
          }}
        >
          Select a location and trigger an event
        </div>
      </div>

      {/* Target Location / Target Dropdown */}
      <div>
        <select
          value={selectedLocation}
          onChange={(e) => {
            sfx("click");
            onSelectLocation(e.target.value);
          }}
          style={{
            width: "100%",
            padding: "8px 12px",
            background: "rgba(0, 0, 0, 0.8)",
            border: "1px solid rgba(255, 45, 58, 0.4)",
            borderRadius: "3px",
            color: "#ffffff",
            fontFamily: "var(--font-mono)",
            fontSize: "13px",
            letterSpacing: "0.08em",
            outline: "none",
            cursor: "pointer",
          }}
        >
          <option value="all">📍 ALL LOCATIONS (BROADCAST)</option>
          {MAP_LOCATIONS.map((loc) => (
            <option key={loc.id} value={loc.id}>
              📍 {loc.name}
            </option>
          ))}
        </select>
      </div>

      {/* 2x4 Grid of Tactile Action Buttons (Matches Image 3) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "10px",
          flex: 1,
        }}
      >
        {TRIGGER_ACTIONS.map((act) => {
          const isSelected = activeActionId === act.id;
          return (
            <button
              key={act.id}
              onClick={() => {
                sfx("boom");
                onTriggerAction(act);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px 10px",
                background: isSelected ? "rgba(255, 45, 58, 0.25)" : "rgba(0, 0, 0, 0.7)",
                border: isSelected ? "1.5px solid #ff2d3a" : "1px solid rgba(255, 45, 58, 0.25)",
                borderRadius: "3px",
                color: isSelected ? "#ffffff" : "rgba(255, 200, 200, 0.9)",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s ease",
                boxShadow: isSelected ? "0 0 12px rgba(255, 45, 58, 0.35)" : "none",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#ff2d3a";
                e.currentTarget.style.background = "rgba(255, 45, 58, 0.15)";
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = "rgba(255, 45, 58, 0.25)";
                  e.currentTarget.style.background = "rgba(0, 0, 0, 0.7)";
                }
              }}
            >
              <div style={{ color: "#ff2d3a", flexShrink: 0 }}>{act.icon}</div>
              <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "11px",
                    fontWeight: "bold",
                    letterSpacing: "0.06em",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {act.label}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "9px",
                    color: "rgba(255, 160, 160, 0.5)",
                    letterSpacing: "0.04em",
                  }}
                >
                  {act.sublabel}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
