// components/PushPin.tsx
"use client";
import React from "react";

export interface PushPinProps {
  color?: string;
  size?: number;
  angle?: number;
  shadowOpacity?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Classic Round Ball-Headed Bulletin Board Pin
 * Features:
 * - Large glossy sphere head with radial gradient (white highlight top-left)
 * - Thin silver metallic shaft below
 * - Drop shadow for corkboard depth
 */
export default function PushPin({
  color = "#cc1111",
  size = 24,
  angle = -8,
  shadowOpacity = 0.7,
  className = "",
  style = {},
}: PushPinProps) {
  const idPrefix = React.useId().replace(/:/g, "_");

  // Ball radius = ~40% of total size, shaft below
  const ballR = 0.42 * size;
  const ballCx = size / 2;
  const ballCy = ballR + 1;
  const shaftW = size * 0.09;
  const shaftX = size / 2 - shaftW / 2;
  const shaftTopY = ballCy + ballR - 2;
  const shaftH = size * 0.52;
  const totalH = ballCy + ballR + shaftH;

  return (
    <div
      className={`round-push-pin ${className}`}
      style={{
        position: "relative",
        width: size,
        height: totalH,
        display: "inline-flex",
        alignItems: "flex-start",
        justifyContent: "center",
        transform: `rotate(${angle}deg)`,
        filter: `drop-shadow(1px 3px 3px rgba(0,0,0,${shadowOpacity})) drop-shadow(0 1px 1px rgba(0,0,0,0.4))`,
        userSelect: "none",
        pointerEvents: "none",
        zIndex: 10,
        flexShrink: 0,
        ...style,
      }}
    >
      <svg
        viewBox={`0 0 ${size} ${totalH}`}
        width={size}
        height={totalH}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: "visible", display: "block" }}
      >
        <defs>
          {/* Glossy ball radial gradient — white highlight top-left, deep shadow bottom-right */}
          <radialGradient id={`${idPrefix}-ball`} cx="35%" cy="28%" r="72%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="18%" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="42%" stopColor={color} />
            <stop offset="75%" stopColor={color} />
            <stop offset="100%" stopColor="#1a0000" />
          </radialGradient>

          {/* Rim inner shadow for depth */}
          <radialGradient id={`${idPrefix}-rim`} cx="50%" cy="50%" r="50%">
            <stop offset="75%" stopColor="transparent" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.45)" />
          </radialGradient>

          {/* Chrome shaft gradient */}
          <linearGradient id={`${idPrefix}-shaft`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#888" />
            <stop offset="30%" stopColor="#ddd" />
            <stop offset="60%" stopColor="#bbb" />
            <stop offset="100%" stopColor="#666" />
          </linearGradient>
        </defs>

        {/* Shaft shadow dot */}
        <ellipse
          cx={size / 2}
          cy={shaftTopY + shaftH + 1}
          rx={shaftW * 1.5}
          ry={shaftW * 0.7}
          fill="rgba(0,0,0,0.35)"
        />

        {/* Metal shaft */}
        <rect
          x={shaftX}
          y={shaftTopY}
          width={shaftW}
          height={shaftH}
          rx={shaftW * 0.4}
          fill={`url(#${idPrefix}-shaft)`}
        />

        {/* Ball sphere */}
        <circle
          cx={ballCx}
          cy={ballCy}
          r={ballR}
          fill={`url(#${idPrefix}-ball)`}
          stroke="rgba(0,0,0,0.25)"
          strokeWidth="0.5"
        />

        {/* Rim shadow overlay on ball edge */}
        <circle
          cx={ballCx}
          cy={ballCy}
          r={ballR}
          fill={`url(#${idPrefix}-rim)`}
        />

        {/* Small bright specular highlight dot */}
        <ellipse
          cx={ballCx - ballR * 0.22}
          cy={ballCy - ballR * 0.3}
          rx={ballR * 0.18}
          ry={ballR * 0.12}
          transform={`rotate(-30 ${ballCx - ballR * 0.22} ${ballCy - ballR * 0.3})`}
          fill="white"
          opacity="0.9"
        />
      </svg>
    </div>
  );
}

// Named export for backwards compatibility
export { PushPin };
