"use client";
import React, { useState } from "react";
import { sfx } from "@/lib/audio";

export interface TacticalLocation {
  id: string;
  name: string;
  x: number;
  y: number;
  status: "ACTIVE" | "LOCKED";
}

export const MAP_LOCATIONS: TacticalLocation[] = [
  { id: "town", name: "HAWKINS TOWN", x: 395, y: 220, status: "ACTIVE" },
  { id: "police", name: "POLICE STATION", x: 635, y: 215, status: "ACTIVE" },
  { id: "byers", name: "BYERS HOUSE", x: 175, y: 195, status: "ACTIVE" },
  { id: "lab", name: "HAWKINS LAB", x: 490, y: 120, status: "ACTIVE" },
  { id: "forest", name: "FOREST", x: 250, y: 130, status: "ACTIVE" },
  { id: "radioTower", name: "RADIO TOWER", x: 220, y: 290, status: "ACTIVE" },
  { id: "upsideDown", name: "THE UPSIDE DOWN", x: 490, y: 300, status: "ACTIVE" },
];

export interface MapTeamInfo {
  id: string;
  name: string;
  status: "Online" | "Stuck" | "Offline";
}

interface VecnaTacticalMapProps {
  selectedLocationId: string;
  onSelectLocation: (locId: string, locName: string) => void;
  teamsAtLocation?: Record<string, MapTeamInfo[]>;
  onInspectTeam?: (teamId: string) => void;
}

export default function VecnaTacticalMap({
  selectedLocationId,
  onSelectLocation,
  teamsAtLocation = {},
  onInspectTeam,
}: VecnaTacticalMapProps) {
  const [zoomLevel, setZoomLevel] = useState(1);

  const handleZoomIn = () => {
    sfx("click");
    setZoomLevel((z) => Math.min(1.4, z + 0.1));
  };

  const handleZoomOut = () => {
    sfx("click");
    setZoomLevel((z) => Math.max(0.8, z - 0.1));
  };

  return (
    <div
      style={{
        position: "relative",
        background: "rgba(5, 7, 10, 0.95)",
        border: "1px solid rgba(255, 45, 58, 0.3)",
        borderRadius: "4px",
        overflow: "hidden",
        width: "100%",
        height: "100%",
        minHeight: "360px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* MAP HEADER / TITLE & COMPASS & CONTROLS */}
      <div
        style={{
          position: "absolute",
          top: "14px",
          left: "16px",
          zIndex: 10,
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-title)",
            fontSize: "16px",
            letterSpacing: "0.3em",
            fontWeight: 900,
            color: "#e8eff5",
          }}
        >
          H A W K I N S
        </div>

        {/* Compass Rose */}
        <div
          style={{
            marginTop: "12px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            width: "28px",
            opacity: 0.7,
          }}
        >
          <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "#ff4d58", fontWeight: "bold" }}>
            N
          </span>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#ff4d58" strokeWidth="1.5">
            <line x1="12" y1="2" x2="12" y2="22" />
            <polygon points="12,2 9,9 15,9" fill="#ff4d58" />
            <line x1="2" y1="12" x2="22" y2="12" />
          </svg>
        </div>
      </div>

      {/* LEGEND (Top Right inside Map) */}
      <div
        style={{
          position: "absolute",
          top: "14px",
          right: "16px",
          zIndex: 10,
          background: "rgba(0, 0, 0, 0.8)",
          border: "1px solid rgba(255, 45, 58, 0.25)",
          padding: "8px 12px",
          borderRadius: "3px",
          fontSize: "10px",
          fontFamily: "var(--font-mono)",
          letterSpacing: "0.1em",
          color: "rgba(255, 220, 220, 0.8)",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ff2d3a", boxShadow: "0 0 6px #ff2d3a" }} />
          <span>Active Location</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", border: "1px solid #888899" }} />
          <span>Locked Location</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "14px", height: "1px", borderTop: "1px dashed rgba(255, 255, 255, 0.4)" }} />
          <span>Roads</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "12px", height: "8px", border: "1px solid rgba(255, 255, 255, 0.3)" }} />
          <span>Buildings (Area)</span>
        </div>
      </div>

      {/* ZOOM CONTROLS (Bottom Left inside Map) */}
      <div
        style={{
          position: "absolute",
          bottom: "16px",
          left: "16px",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}
      >
        <button
          onClick={handleZoomIn}
          style={{
            width: "26px",
            height: "26px",
            background: "rgba(0, 0, 0, 0.8)",
            border: "1px solid rgba(255, 45, 58, 0.4)",
            color: "#ffffff",
            fontFamily: "var(--font-mono)",
            fontSize: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          style={{
            width: "26px",
            height: "26px",
            background: "rgba(0, 0, 0, 0.8)",
            border: "1px solid rgba(255, 45, 58, 0.4)",
            color: "#ffffff",
            fontFamily: "var(--font-mono)",
            fontSize: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          -
        </button>
      </div>

      {/* SCHEMATIC VECTOR MAP (SVG / Canvas Render) */}
      <div
        style={{
          flex: 1,
          width: "100%",
          height: "100%",
          position: "relative",
          transform: `scale(${zoomLevel})`,
          transformOrigin: "center center",
          transition: "transform 0.25s ease-out",
        }}
      >
        <svg
          viewBox="0 0 800 420"
          style={{
            width: "100%",
            height: "100%",
            display: "block",
            background: "radial-gradient(ellipse at 50% 50%, #070e14 0%, #030508 100%)",
          }}
        >
          {/* Tactical Grid Lines */}
          <defs>
            <pattern id="tactical-grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="0.8" />
            </pattern>
            {/* Pulsing Radar Glow Filter */}
            <filter id="radar-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect width="800" height="420" fill="url(#tactical-grid)" />

          {/* River / Water outlines */}
          <path
            d="M 300 0 Q 320 100 350 160 T 420 220 T 480 300 T 540 420"
            fill="none"
            stroke="rgba(40, 90, 140, 0.4)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="M 300 0 Q 320 100 350 160 T 420 220 T 480 300 T 540 420"
            fill="none"
            stroke="rgba(80, 160, 230, 0.2)"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Forest Boundary Outline */}
          <path
            d="M 180 80 Q 230 50 310 70 T 360 140 T 260 170 T 160 120 Z"
            fill="rgba(20, 45, 30, 0.18)"
            stroke="rgba(50, 130, 80, 0.35)"
            strokeWidth="1.2"
            strokeDasharray="3 3"
          />
          <text x="210" y="95" fill="rgba(80, 180, 120, 0.4)" fontSize="9" fontFamily="var(--font-mono)" letterSpacing="2px">
            FOREST PERIMETER
          </text>

          {/* Town Grid / Building Area Blocks */}
          <g stroke="rgba(255, 255, 255, 0.1)" strokeWidth="0.8">
            <rect x="340" y="180" width="110" height="80" rx="4" fill="rgba(255, 255, 255, 0.02)" />
            <line x1="365" y1="180" x2="365" y2="260" />
            <line x1="395" y1="180" x2="395" y2="260" />
            <line x1="425" y1="180" x2="425" y2="260" />
            <line x1="340" y1="205" x2="450" y2="205" />
            <line x1="340" y1="235" x2="450" y2="235" />
          </g>

          {/* Major Roads (Dashed Vector Lines connecting Locations) */}
          <g stroke="rgba(255, 255, 255, 0.2)" strokeWidth="1.2" strokeDasharray="4 4">
            <path d="M 395 220 L 290 210 L 175 195" />
            <path d="M 395 220 L 440 160 L 490 120" />
            <path d="M 395 220 L 510 220 L 635 215" />
            <path d="M 395 220 L 310 260 L 220 290" />
            <path d="M 395 220 L 440 260 L 490 300" />
            <path d="M 250 130 L 350 110 L 490 120" />
            <path d="M 175 195 L 210 150 L 250 130" />
          </g>

          {/* LOCATION NODES & TEAM PINS */}
          {MAP_LOCATIONS.map((loc) => {
            const isSelected = selectedLocationId.toLowerCase().includes(loc.id.toLowerCase()) ||
                               loc.name.toLowerCase().includes(selectedLocationId.toLowerCase());
            const teamsHere = teamsAtLocation[loc.id] || [];

            return (
              <g key={loc.id}>
                {/* Clickable Area for Location */}
                <g
                  onClick={() => {
                    sfx("blip");
                    onSelectLocation(loc.id, loc.name);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  {/* Active Radar Pulse Animation */}
                  {loc.status === "ACTIVE" && (
                    <circle
                      cx={loc.x}
                      cy={loc.y}
                      r={isSelected ? "18" : "14"}
                      fill="none"
                      stroke="#ff2d3a"
                      strokeWidth="1"
                      opacity="0.6"
                    >
                      <animate attributeName="r" values="8;24" dur="2.4s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.8;0" dur="2.4s" repeatCount="indefinite" />
                    </circle>
                  )}

                  {/* Inner Core Radar Node */}
                  <circle
                    cx={loc.x}
                    cy={loc.y}
                    r="6"
                    fill={isSelected ? "#ff2d3a" : "#ff3b45"}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    filter="url(#radar-glow)"
                  />

                  {/* Tactical Label Badge */}
                  <g transform={`translate(${loc.x + 12}, ${loc.y - 10})`}>
                    <rect
                      x="0"
                      y="0"
                      width={loc.name.length * 7.5 + 14}
                      height="20"
                      rx="3"
                      fill={isSelected ? "rgba(255, 45, 58, 0.9)" : "rgba(0, 0, 0, 0.85)"}
                      stroke={isSelected ? "#ffffff" : "rgba(255, 45, 58, 0.5)"}
                      strokeWidth="1"
                    />
                    <text
                      x="7"
                      y="14"
                      fill="#ffffff"
                      fontSize="10"
                      fontFamily="var(--font-mono)"
                      fontWeight="bold"
                      letterSpacing="0.08em"
                    >
                      {loc.name}
                    </text>
                  </g>
                </g>

                {/* TEAMS AT THIS LOCATION (Clearly visible & clickable) */}
                {teamsHere.length > 0 && (
                  <g transform={`translate(${loc.x + 12}, ${loc.y + 14})`}>
                    {teamsHere.map((t, tIdx) => {
                      const badgeText = `${t.id} ${t.name}`;
                      const badgeWidth = badgeText.length * 6.5 + 16;
                      const yOffset = tIdx * 18;

                      return (
                        <g
                          key={t.id}
                          transform={`translate(0, ${yOffset})`}
                          onClick={(e) => {
                            e.stopPropagation();
                            sfx("click");
                            if (onInspectTeam) onInspectTeam(t.id);
                          }}
                          style={{ cursor: "pointer" }}
                        >
                          <rect
                            x="0"
                            y="0"
                            width={badgeWidth}
                            height="16"
                            rx="3"
                            fill="rgba(18, 4, 7, 0.95)"
                            stroke={t.status === "Stuck" ? "#ff2d3a" : "#36e0c4"}
                            strokeWidth="1"
                          />
                          <circle
                            cx="7"
                            cy="8"
                            r="3"
                            fill={t.status === "Stuck" ? "#ff2d3a" : "#36e0c4"}
                          />
                          <text
                            x="14"
                            y="12"
                            fill="#ffffff"
                            fontSize="9"
                            fontFamily="var(--font-mono)"
                            fontWeight="bold"
                          >
                            {badgeText}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
