export interface Result { team: string; score: number; time: number; when: number; mock?: boolean }
const KEY = "hawkins-protocol:results";

export const MOCK: Result[] = [
  { team: "NULL POINTERS", score: 320, time: 61 * 60, when: 0, mock: true },
  { team: "STACK SMASHERS", score: 300, time: 66 * 60, when: 0, mock: true },
  { team: "RIFT RUNNERS", score: 275, time: 72 * 60, when: 0, mock: true },
  { team: "BYTE HUNTERS", score: 250, time: 78 * 60, when: 0, mock: true },
  { team: "SEGFAULT SQUAD", score: 210, time: 81 * 60, when: 0, mock: true },
  { team: "KERNEL PANIC", score: 180, time: 85 * 60, when: 0, mock: true },
];

export function loadResults(): Result[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveResult(r: Result) {
  try {
    const all = loadResults().filter((x) => !(x.team === r.team && x.score === r.score));
    all.push(r);
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {}
}

export const mmss = (t: number) => `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
