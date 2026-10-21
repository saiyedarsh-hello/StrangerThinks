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

// Exactly the 6 canonical stages of the Hawkins Protocol tournament
export const MAP_LOCATIONS: TacticalLocation[] = [
  { id: "town", name: "HAWKINS TOWN", x: 395, y: 220, status: "ACTIVE" },
  { id: "police", name: "POLICE STATION", x: 635, y: 215, status: "ACTIVE" },
  { id: "byers", name: "BYERS HOUSE", x: 175, y: 195, status: "ACTIVE" },
  { id: "lab", name: "HAWKINS LAB", x: 490, y: 120, status: "ACTIVE" },
  { id: "radioTower", name: "RADIO TOWER", x: 220, y: 290, status: "ACTIVE" },
  { id: "gate", name: "THE GATE RIFT", x: 490, y: 300, status: "ACTIVE" },
];

export interface MapTeamInfo {
  id: string;
  name: string;
  leader?: string;
  status: "Online" | "Offline" | "Stuck";
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
  const [inspectedLocation, setInspectedLocation] = useState<string | null>(null);

  const handleZoomIn = () => {
    sfx("click");
    setZoomLevel((z) => Math.min(1.4, z + 0.1));
  };

  const handleZoomOut = () => {
    sfx("click");
    setZoomLevel((z) => Math.max(0.8, z - 0.1));
  };

  const activeLocId = inspectedLocation || selectedLocationId || "town";
  const activeLocDef = MAP_LOCATIONS.find(
    (l) => l.id.toLowerCase() === activeLocId.toLowerCase() || l.name.toLowerCase() === activeLocId.toLowerCase()
  ) || MAP_LOCATIONS[0];
  const activeTeams = teamsAtLocation[activeLocDef.id] || [];

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
        minHeight: "420px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* MAP HEADER / TITLE & COMPASS */}
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
            fontSize: "15px",
            letterSpacing: "0.25em",
            fontWeight: 900,
            color: "#e8eff5",
          }}
        >
          HAWKINS TACTICAL RADAR
        </div>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "10px",
            color: "rgba(255, 100, 100, 0.7)",
            letterSpacing: "0.1em",
            marginTop: "2px",
          }}
        >
          6 CANONICAL STAGES · REAL-TIME ONLINE TELEMETRY
        </div>
      </div>

      {/* LEGEND (Top Right) */}
      <div
        style={{
          position: "absolute",
          top: "14px",
          right: "16px",
          zIndex: 10,
          background: "rgba(0, 0, 0, 0.85)",
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
          <span>Stage Node (1-6)</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#00ffcc", boxShadow: "0 0 6px #00ffcc" }} />
          <span>Online Hawkins Squads</span>
        </div>
      </div>

      {/* ZOOM CONTROLS */}
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

      {/* SVG RADAR MAP */}
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
          <defs>
            <pattern id="tactical-grid-6" width="30" height="30" patternUnits="userSpaceOnUse">
              <path d="M 30 0 L 0 0 0 30" fill="none" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="0.8" />
            </pattern>
            <filter id="radar-glow-6" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect width="800" height="420" fill="url(#tactical-grid-6)" />

          {/* River / Water Outlines */}
          <path
            d="M 300 0 Q 320 100 350 160 T 420 220 T 480 300 T 540 420"
            fill="none"
            stroke="rgba(40, 90, 140, 0.35)"
            strokeWidth="6"
            strokeLinecap="round"
          />

          {/* Stage Interconnecting Tactical Corridors */}
          <g stroke="rgba(255, 45, 58, 0.2)" strokeWidth="1.2" strokeDasharray="4 4">
            <path d="M 395 220 L 635 215" />
            <path d="M 395 220 L 175 195" />
            <path d="M 395 220 L 490 120" />
            <path d="M 395 220 L 220 290" />
            <path d="M 395 220 L 490 300" />
            <path d="M 175 195 L 490 120" />
            <path d="M 220 290 L 490 300" />
          </g>

          {/* THE 6 ACTUAL STAGES */}
          {MAP_LOCATIONS.map((loc, idx) => {
            const isSelected =
              activeLocDef.id.toLowerCase() === loc.id.toLowerCase() ||
              activeLocDef.name.toLowerCase() === loc.name.toLowerCase();
            const teamsHere = teamsAtLocation[loc.id] || [];
            const onlineCount = teamsHere.filter((t) => t.status === "Online").length;

            return (
              <g key={loc.id}>
                <g
                  onClick={() => {
                    sfx("blip");
                    setInspectedLocation(loc.id);
                    onSelectLocation(loc.id, loc.name);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  {/* Outer Radar Rings */}
                  <circle
                    cx={loc.x}
                    cy={loc.y}
                    r={isSelected ? "20" : "14"}
                    fill="none"
                    stroke="#ff2d3a"
                    strokeWidth="1"
                    opacity="0.6"
                  >
                    <animate attributeName="r" values="8;22" dur="2.4s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.8;0" dur="2.4s" repeatCount="indefinite" />
                  </circle>

                  {/* Node Center Dot */}
                  <circle
                    cx={loc.x}
                    cy={loc.y}
                    r="6.5"
                    fill={isSelected ? "#ff2d3a" : "#ff3b45"}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    filter="url(#radar-glow-6)"
                  />

                  {/* Stage Number & Label */}
                  <g transform={`translate(${loc.x + 12}, ${loc.y - 12})`}>
                    <rect
                      x="0"
                      y="0"
                      width={loc.name.length * 7.5 + 24}
                      height="22"
                      rx="3"
                      fill={isSelected ? "rgba(255, 45, 58, 0.9)" : "rgba(0, 0, 0, 0.85)"}
                      stroke={isSelected ? "#ffffff" : "rgba(255, 45, 58, 0.5)"}
                      strokeWidth="1"
                    />
                    <text
                      x="7"
                      y="15"
                      fill="#ffffff"
                      fontSize="10"
                      fontFamily="var(--font-mono)"
                      fontWeight="bold"
                      letterSpacing="0.08em"
                    >
                      {idx + 1}. {loc.name}
                    </text>
                  </g>
                </g>

                {/* ONLINE HAWKINS TEAMS BADGE */}
                <g transform={`translate(${loc.x + 12}, ${loc.y + 13})`}>
                  <g
                    onClick={(e) => {
                      e.stopPropagation();
                      sfx("click");
                      setInspectedLocation(loc.id);
                      onSelectLocation(loc.id, loc.name);
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <rect
                      x="0"
                      y="0"
                      width="88"
                      height="18"
                      rx="3"
                      fill="rgba(10, 3, 5, 0.92)"
                      stroke={onlineCount > 0 ? "#00ffcc" : "rgba(255, 255, 255, 0.2)"}
                      strokeWidth="1"
                    />
                    <circle cx="8" cy="9" r="3" fill={onlineCount > 0 ? "#00ffcc" : "#888888"} />
                    <text
                      x="16"
                      y="13"
                      fill={onlineCount > 0 ? "#00ffcc" : "rgba(255, 255, 255, 0.5)"}
                      fontSize="9"
                      fontFamily="var(--font-mono)"
                      fontWeight="bold"
                      letterSpacing="0.06em"
                    >
                      {onlineCount} ONLINE
                    </text>
                  </g>
                </g>
              </g>
            );
          })}
        </svg>
      </div>

      {/* STAGE DETAILS DRAWER: Shows Online Hawkins Teams Currently on Selected Stage */}
      <div
        style={{
          background: "rgba(8, 2, 4, 0.95)",
          borderTop: "1.5px solid rgba(255, 45, 58, 0.4)",
          padding: "10px 16px",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          maxHeight: "140px",
          overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: "bold", color: "#ff4d58", letterSpacing: "0.1em" }}>
            STAGE OCCUPANCY: {activeLocDef.name} ({activeTeams.filter((t) => t.status === "Online").length} SQUADS ONLINE)
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "rgba(255, 200, 200, 0.6)" }}>
            CLICK STAGE TO INSPECT SQUADS
          </div>
        </div>

        {activeTeams.filter((t) => t.status === "Online").length === 0 ? (
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "rgba(255, 255, 255, 0.4)", padding: "4px 0" }}>
            No online Hawkins squads currently active at {activeLocDef.name}.
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {activeTeams
              .filter((t) => t.status === "Online")
              .map((tm) => (
                <div
                  key={tm.id}
                  onClick={() => onInspectTeam?.(tm.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    background: "rgba(0, 0, 0, 0.7)",
                    border: "1px solid rgba(0, 255, 204, 0.4)",
                    padding: "4px 8px",
                    borderRadius: "3px",
                    fontFamily: "var(--font-mono)",
                    fontSize: "11px",
                    cursor: "pointer",
                  }}
                >
                  <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#00ffcc", boxShadow: "0 0 6px #00ffcc" }} />
                  <span style={{ color: "#ffffff", fontWeight: "bold" }}>{tm.name}</span>
                  {tm.leader && <span style={{ color: "rgba(255, 255, 255, 0.5)", fontSize: "9.5px" }}>({tm.leader})</span>}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
