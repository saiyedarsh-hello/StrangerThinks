/**
 * THE HAWKINS PROTOCOL - CHARACTER SYSTEM
 * 
 * Central registry of chapter characters, portraits, and sprite assets.
 * Chapter 1: Hawkins Town (Callahan)
 * Chapter 2: Police Station (Hopper)
 * Chapter 3: Byers House (Joyce & Will)
 * Chapter 4: Hawkins Lab (Dr. Brenner)
 * Chapter 5: Forest (Park Ranger)
 * Chapter 6: Radio Tower (Pip - "The Radio Kid" with /characters/radiokid.png sprite)
 * Chapter 7: Upside Down (Vecna)
 */

export interface CharacterDef {
  id: string;
  name: string;
  nameTag: string; // Display name tag, e.g. "PIP"
  title: string;
  location: string;
  chapterId: number;
  sprite?: string; // Path to sprite image (e.g. "/characters/radiokid.png")
  themeColor: string;
  badgeBg: string;
  silhouetteSvg: string; // Procedural SVG silhouette for characters without sprites
}

export const CHARACTERS: Record<string, CharacterDef> = {
  dot: {
    id: "dot",
    name: "Dot",
    nameTag: "DOT",
    title: "MUNICIPAL DISPATCHER · EMERGENCY TELEMETRY",
    location: "town",
    chapterId: 1,
    sprite: "/characters/dot.png",
    themeColor: "#ffb454",
    badgeBg: "rgba(255, 180, 84, 0.2)",
    silhouetteSvg: "",
  },
  callahan: {
    id: "callahan",
    name: "Officer Callahan",
    nameTag: "CALLAHAN",
    title: "PATROL OFFICER · PRECINCT 2",
    location: "town",
    chapterId: 1,
    themeColor: "#4f98ca",
    badgeBg: "rgba(79, 152, 202, 0.2)",
    silhouetteSvg: `
      <svg viewBox="0 0 32 48" fill="currentColor" style="shape-rendering: crispEdges;">
        <rect x="10" y="4" width="12" height="4" />
        <rect x="8" y="8" width="16" height="3" />
        <rect x="6" y="11" width="20" height="2" />
        <rect x="11" y="13" width="10" height="8" />
        <rect x="10" y="21" width="12" height="4" />
        <rect x="7" y="25" width="18" height="12" />
        <rect x="5" y="27" width="3" height="8" />
        <rect x="24" y="27" width="3" height="8" />
        <rect x="9" y="37" width="6" height="11" />
        <rect x="17" y="37" width="6" height="11" />
      </svg>
    `,
  },
  hopper: {
    id: "hopper",
    name: "Chief Hopper",
    nameTag: "HOPPER",
    title: "CHIEF OF POLICE",
    location: "policeStation",
    chapterId: 2,
    themeColor: "#c28859",
    badgeBg: "rgba(194, 136, 89, 0.2)",
    silhouetteSvg: `
      <svg viewBox="0 0 32 48" style="shape-rendering: crispEdges; width: 100%; height: 100%;">
        <rect x="9" y="3" width="14" height="4" fill="#795548" />
        <rect x="5" y="7" width="22" height="3" fill="#5D4037" />
        <rect x="9" y="6" width="14" height="2" fill="#3E2723" />
        <rect x="9" y="10" width="14" height="9" fill="#FFCC80" />
        <rect x="8" y="10" width="2" height="6" fill="#4E342E" />
        <rect x="22" y="10" width="2" height="6" fill="#4E342E" />
        <rect x="11" y="12" width="2" height="2" fill="#212121" />
        <rect x="19" y="12" width="2" height="2" fill="#212121" />
        <rect x="12" y="15" width="8" height="3" fill="#4E342E" />
        <rect x="11" y="16" width="10" height="2" fill="#4E342E" />
        <rect x="8" y="19" width="16" height="15" fill="#D7CCC8" />
        <rect x="15" y="19" width="2" height="15" fill="#BCAAA4" />
        <rect x="10" y="21" width="3" height="3" fill="#FFD700" />
        <rect x="5" y="20" width="3" height="11" fill="#BCAAA4" />
        <rect x="24" y="20" width="3" height="8" fill="#BCAAA4" />
        <rect x="4" y="27" width="4" height="6" fill="#212121" />
        <rect x="5" y="23" width="1" height="4" fill="#757575" />
        <rect x="24" y="28" width="3" height="3" fill="#FFCC80" />
        <rect x="8" y="34" width="16" height="3" fill="#3E2723" />
        <rect x="14" y="34" width="4" height="3" fill="#FFD700" />
        <rect x="9" y="37" width="6" height="7" fill="#4E342E" />
        <rect x="17" y="37" width="6" height="7" fill="#4E342E" />
        <rect x="8" y="44" width="7" height="4" fill="#212121" />
        <rect x="17" y="44" width="7" height="4" fill="#212121" />
      </svg>
    `,
  },
  byers: {
    id: "byers",
    name: "Joyce Byers",
    nameTag: "JOYCE",
    title: "RESIDENTIAL TELECOMMUNICATIONS",
    location: "byersHouse",
    chapterId: 3,
    themeColor: "#e6a15c",
    badgeBg: "rgba(230, 161, 92, 0.2)",
    silhouetteSvg: `
      <svg viewBox="0 0 32 48" style="shape-rendering: crispEdges; width: 100%; height: 100%;">
        <rect x="9" y="4" width="14" height="6" fill="#5D4037" />
        <rect x="7" y="8" width="18" height="10" fill="#4E342E" />
        <rect x="6" y="14" width="4" height="7" fill="#4E342E" />
        <rect x="22" y="14" width="4" height="7" fill="#4E342E" />
        <rect x="10" y="10" width="12" height="9" fill="#FFE0B2" />
        <rect x="12" y="12" width="2" height="2" fill="#212121" />
        <rect x="18" y="12" width="2" height="2" fill="#212121" />
        <rect x="14" y="16" width="4" height="1" fill="#C2185B" />
        <rect x="7" y="19" width="18" height="15" fill="#33691E" />
        <rect x="13" y="19" width="6" height="15" fill="#D32F2F" />
        <rect x="13" y="22" width="6" height="2" fill="#FFF9C4" />
        <rect x="13" y="27" width="6" height="2" fill="#FFF9C4" />
        <rect x="4" y="21" width="3" height="9" fill="#33691E" />
        <rect x="25" y="21" width="3" height="9" fill="#33691E" />
        <rect x="4" y="30" width="3" height="3" fill="#FFE0B2" />
        <rect x="25" y="30" width="3" height="3" fill="#FFE0B2" />
        <path d="M 5 31 Q 16 36 27 31" stroke="#2E7D32" stroke-width="1.5" fill="none" />
        <rect x="7" y="31" width="2" height="2" fill="#FF1744" />
        <rect x="12" y="33" width="2" height="2" fill="#FFEA00" />
        <rect x="17" y="33" width="2" height="2" fill="#00E676" />
        <rect x="22" y="31" width="2" height="2" fill="#00E5FF" />
        <rect x="9" y="34" width="6" height="10" fill="#1565C0" />
        <rect x="17" y="34" width="6" height="10" fill="#1565C0" />
        <rect x="8" y="44" width="7" height="4" fill="#424242" />
        <rect x="17" y="44" width="7" height="4" fill="#424242" />
      </svg>
    `,
  },
  brenner: {
    id: "brenner",
    name: "Dr. Brenner",
    nameTag: "BRENNER",
    title: "DIRECTOR · HAWKINS LAB",
    location: "lab",
    chapterId: 4,
    themeColor: "#26a69a",
    badgeBg: "rgba(38, 166, 154, 0.2)",
    silhouetteSvg: `
      <svg viewBox="0 0 32 48" style="shape-rendering: crispEdges; width: 100%; height: 100%;">
        <rect x="10" y="4" width="12" height="6" fill="#ECEFF1" />
        <rect x="8" y="8" width="16" height="5" fill="#CFD8DC" />
        <rect x="8" y="11" width="3" height="5" fill="#CFD8DC" />
        <rect x="21" y="11" width="3" height="5" fill="#CFD8DC" />
        <rect x="10" y="9" width="12" height="9" fill="#FFCCBC" />
        <rect x="12" y="12" width="2" height="2" fill="#263238" />
        <rect x="18" y="12" width="2" height="2" fill="#263238" />
        <rect x="14" y="16" width="4" height="1" fill="#8D6E63" />
        <rect x="7" y="18" width="18" height="16" fill="#263238" />
        <rect x="13" y="18" width="6" height="16" fill="#FFFFFF" />
        <rect x="15" y="19" width="2" height="13" fill="#102027" />
        <rect x="9" y="21" width="1" height="3" fill="#90A4AE" />
        <rect x="4" y="20" width="3" height="12" fill="#263238" />
        <rect x="25" y="20" width="3" height="12" fill="#263238" />
        <rect x="4" y="32" width="3" height="3" fill="#FFCCBC" />
        <rect x="25" y="32" width="3" height="3" fill="#FFCCBC" />
        <rect x="9" y="34" width="6" height="10" fill="#212121" />
        <rect x="17" y="34" width="6" height="10" fill="#212121" />
        <rect x="8" y="44" width="7" height="4" fill="#000000" />
        <rect x="17" y="44" width="7" height="4" fill="#000000" />
      </svg>
    `,
  },
  ranger: {
    id: "ranger",
    name: "Ranger Miller",
    nameTag: "RANGER",
    title: "FOREST PATROL · ROANE COUNTY",
    location: "forest",
    chapterId: 5,
    themeColor: "#81c784",
    badgeBg: "rgba(129, 199, 132, 0.2)",
    silhouetteSvg: `
      <svg viewBox="0 0 32 48" style="shape-rendering: crispEdges; width: 100%; height: 100%;">
        <rect x="10" y="3" width="12" height="4" fill="#2E4720" />
        <rect x="5" y="7" width="22" height="3" fill="#3D5A2B" />
        <rect x="9" y="6" width="14" height="2" fill="#1B2E13" />
        <rect x="9" y="10" width="14" height="9" fill="#E0BB95" />
        <rect x="8" y="10" width="2" height="5" fill="#4E342E" />
        <rect x="22" y="10" width="2" height="5" fill="#4E342E" />
        <rect x="12" y="12" width="2" height="2" fill="#1B2E13" />
        <rect x="18" y="12" width="2" height="2" fill="#1B2E13" />
        <rect x="7" y="19" width="18" height="15" fill="#4A6B35" />
        <rect x="15" y="19" width="2" height="15" fill="#2E4720" />
        <rect x="9" y="21" width="3" height="3" fill="#F4D03F" />
        <rect x="4" y="20" width="3" height="8" fill="#4A6B35" />
        <rect x="3" y="27" width="5" height="7" fill="#37474F" />
        <rect x="4" y="34" width="3" height="2" fill="#FFF176" />
        <rect x="25" y="20" width="3" height="11" fill="#4A6B35" />
        <rect x="25" y="31" width="3" height="3" fill="#E0BB95" />
        <rect x="7" y="34" width="18" height="3" fill="#2A1B0E" />
        <rect x="9" y="37" width="6" height="7" fill="#283B1D" />
        <rect x="17" y="37" width="6" height="7" fill="#283B1D" />
        <rect x="8" y="44" width="7" height="4" fill="#1C140C" />
        <rect x="17" y="44" width="7" height="4" fill="#1C140C" />
      </svg>
    `,
  },
  radiokid: {
    id: "radiokid",
    name: "Pip",
    nameTag: "PIP",
    title: "RADIO OPERATOR · AV CLUB",
    location: "radioTower",
    chapterId: 6,
    sprite: "/characters/radiokid.png",
    themeColor: "#ff7c85",
    badgeBg: "rgba(255, 45, 58, 0.2)",
    silhouetteSvg: "",
  },
  vecna: {
    id: "vecna",
    name: "Vecna",
    nameTag: "VECNA",
    title: "UNKNOWN ENTITY · PARALLEL ABYSS",
    location: "upsidedown",
    chapterId: 7,
    themeColor: "#ff2d3a",
    badgeBg: "rgba(255, 45, 58, 0.3)",
    silhouetteSvg: `
      <svg viewBox="0 0 32 48" style="shape-rendering: crispEdges; width: 100%; height: 100%;">
        <rect x="10" y="3" width="12" height="12" fill="#1C0A0E" />
        <rect x="11" y="4" width="10" height="10" fill="#2D0F14" />
        <rect x="12" y="8" width="2" height="2" fill="#FFFFFF" />
        <rect x="18" y="8" width="2" height="2" fill="#FFFFFF" />
        <rect x="11" y="11" width="10" height="1" fill="#FF2D3A" />
        <rect x="8" y="15" width="16" height="18" fill="#1C0A0E" />
        <rect x="10" y="16" width="12" height="16" fill="#2D0F14" />
        <rect x="13" y="16" width="2" height="16" fill="#FF2D3A" />
        <rect x="10" y="22" width="12" height="2" fill="#FF2D3A" />
        <rect x="9" y="27" width="14" height="2" fill="#FF2D3A" />
        <rect x="4" y="17" width="4" height="18" fill="#1C0A0E" />
        <rect x="5" y="20" width="2" height="12" fill="#FF2D3A" />
        <rect x="24" y="17" width="4" height="18" fill="#1C0A0E" />
        <rect x="25" y="20" width="2" height="12" fill="#FF2D3A" />
        <rect x="3" y="34" width="4" height="4" fill="#3D1219" />
        <rect x="25" y="34" width="4" height="4" fill="#3D1219" />
        <rect x="9" y="33" width="6" height="12" fill="#1C0A0E" />
        <rect x="11" y="35" width="2" height="8" fill="#FF2D3A" />
        <rect x="17" y="33" width="6" height="12" fill="#1C0A0E" />
        <rect x="19" y="35" width="2" height="8" fill="#FF2D3A" />
        <rect x="7" y="44" width="8" height="4" fill="#0D0406" />
        <rect x="17" y="44" width="8" height="4" fill="#0D0406" />
      </svg>
    `,
  },
};

/**
 * Get active character by location identifier
 */
export function getCharacterForLocation(locationId: string): CharacterDef {
  if (locationId === "radioTower") return CHARACTERS.radiokid;
  if (locationId === "town") return CHARACTERS.dot;
  if (locationId === "policeStation") return CHARACTERS.hopper;
  if (locationId === "byersHouse") return CHARACTERS.byers;
  if (locationId === "lab") return CHARACTERS.brenner;
  if (locationId === "forest") return CHARACTERS.ranger;
  if (locationId === "upsidedown") return CHARACTERS.vecna;
  return CHARACTERS.dot;
}

/**
 * Get active character by chapter number
 */
export function getCharacterForChapter(chapterId: number): CharacterDef {
  if (chapterId === 1) return CHARACTERS.dot;
  if (chapterId === 2) return CHARACTERS.hopper;
  if (chapterId === 3) return CHARACTERS.byers;
  if (chapterId === 4) return CHARACTERS.brenner;
  if (chapterId === 5) return CHARACTERS.ranger;
  if (chapterId === 6) return CHARACTERS.radiokid;
  if (chapterId === 7) return CHARACTERS.vecna;
  return CHARACTERS.dot;
}
