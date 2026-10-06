// components/PushPin.tsx
"use client";
import React from "react";

export interface PushPinProps {
  color?: string; // Main plastic tint (defaults to deep crimson)
  size?: number; // Size in pixels
  angle?: number; // Tilt angle in degrees (-20 to 20)
  shadowOpacity?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Photorealistic 3D vector PushPin (Thumbtack) component
 * Features:
 * - Tapered translucent acrylic cap with glossy specular highlight reflections
 * - Steel needle with chrome gradient & puncture point shadow
 * - Authentic 3D cast drop-shadow for paper & corkboard elevation
 */
export default function PushPin({
  color = "#d32f2f",
  size = 24,
  angle = -8,
  shadowOpacity = 0.65,
  className = "",
  style = {},
}: PushPinProps) {
  // Generate unique IDs for SVG gradients
  const idPrefix = React.useId().replace(/:/g, "_");

  return (
    <div
      className={`realistic-3d-pushpin ${className}`}
      style={{
        position: "relative",
        width: size,
        height: Math.round(size * 1.25),
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `rotate(${angle}deg)`,
        filter: `drop-shadow(2px 5px 4px rgba(0,0,0,${shadowOpacity})) drop-shadow(0 1px 2px rgba(0,0,0,0.4))`,
        userSelect: "none",
        pointerEvents: "none",
        zIndex: 10,
        flexShrink: 0,
        ...style,
      }}
    >
      <svg
        viewBox="0 0 40 50"
        width={size}
        height={Math.round(size * 1.25)}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: "visible", display: "block" }}
      >
        <defs>
          {/* Metal Needle Linear Chrome Gradient */}
          <linearGradient id={`${idPrefix}-needle`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#cfd8dc" />
            <stop offset="35%" stopColor="#ffffff" />
            <stop offset="65%" stopColor="#90a4ae" />
            <stop offset="100%" stopColor="#37474f" />
          </linearGradient>

          {/* Plastic Dome Radial Specular Gradient */}
          <radialGradient id={`${idPrefix}-dome`} cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="25%" stopColor={color} />
            <stop offset="70%" stopColor={color} />
            <stop offset="100%" stopColor="#2b0004" />
          </radialGradient>

          {/* Plastic Waist & Rim Cylindrical Gradient */}
          <linearGradient id={`${idPrefix}-waist`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b0005" />
            <stop offset="25%" stopColor={color} />
            <stop offset="55%" stopColor="#ffffff" stopOpacity="0.75" />
            <stop offset="85%" stopColor={color} />
            <stop offset="100%" stopColor="#2b0004" />
          </linearGradient>

          {/* Needle Highlight Shine */}
          <linearGradient id={`${idPrefix}-needle-edge`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#546e7a" />
          </linearGradient>
        </defs>

        {/* 1. Paper Puncture Hole Shadow */}
        <ellipse cx="20" cy="46.5" rx="4" ry="1.8" fill="rgba(0,0,0,0.55)" />

        {/* 2. Steel Metallic Needle Shaft */}
        <path
          d="M18 24 L20 46.5 L22 24 Z"
          fill={`url(#${idPrefix}-needle)`}
          stroke="#455a64"
          strokeWidth="0.5"
        />
        <line
          x1="20"
          y1="25"
          x2="20"
          y2="45"
          stroke={`url(#${idPrefix}-needle-edge)`}
          strokeWidth="0.6"
          strokeLinecap="round"
        />

        {/* 3. Base Collar / Flange */}
        <ellipse
          cx="20"
          cy="24"
          rx="8.5"
          ry="3.5"
          fill={`url(#${idPrefix}-waist)`}
          stroke="rgba(0,0,0,0.35)"
          strokeWidth="0.5"
        />
        {/* Base Rim Specular Line */}
        <path
          d="M12.5 24 C14.5 26.5 25.5 26.5 27.5 24"
          stroke="rgba(255,255,255,0.6)"
          strokeWidth="0.75"
          fill="none"
        />

        {/* 4. Tapered Waist (Middle Grip) */}
        <path
          d="M13 14 C13 17.5 15 21 14.5 23 C16.5 24.5 23.5 24.5 25.5 23 C25 21 27 17.5 27 14 Z"
          fill={`url(#${idPrefix}-waist)`}
          stroke="rgba(0,0,0,0.3)"
          strokeWidth="0.5"
        />

        {/* 5. Upper Ridge / Collar */}
        <ellipse
          cx="20"
          cy="14"
          rx="9"
          ry="3.2"
          fill={`url(#${idPrefix}-dome)`}
          stroke="rgba(0,0,0,0.35)"
          strokeWidth="0.5"
        />

        {/* 6. Top Dome Head */}
        <path
          d="M11 14 C11 6.5 29 6.5 29 14 C29 16 11 16 11 14 Z"
          fill={`url(#${idPrefix}-dome)`}
          stroke="rgba(0,0,0,0.25)"
          strokeWidth="0.5"
        />

        {/* 7. Intense Glassy Specular Highlight Dot on Top Left Dome */}
        <ellipse
          cx="16"
          cy="10.5"
          rx="3.5"
          ry="2"
          transform="rotate(-20 16 10.5)"
          fill="#ffffff"
          opacity="0.88"
        />
        <ellipse
          cx="18.5"
          cy="9.5"
          rx="1.2"
          ry="0.8"
          fill="#ffffff"
          opacity="0.95"
        />

        {/* 8. Secondary Reflective Rim Arc */}
        <path
          d="M12.5 13.5 C14.5 15.5 25.5 15.5 27.5 13.5"
          stroke="rgba(255,255,255,0.5)"
          strokeWidth="0.7"
          fill="none"
        />
      </svg>
    </div>
  );
}

// Named export for backwards compatibility
export { PushPin };
