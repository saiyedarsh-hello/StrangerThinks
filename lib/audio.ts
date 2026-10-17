// Comprehensive WebAudio Synth for The Hawkins Protocol
// Zero audio files: every ambient sound, drone, glitch, heartbeat, and effect is synthesized live.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let droneNodes: { stop: () => void; setTheme: (t: "normal" | "upside" | "mind") => void } | null = null;
let staticNode: { stop: () => void; setVolume: (v: number) => void } | null = null;
let humNode: { stop: () => void } | null = null;
let muted = true;

function ensure(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.55;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") {
    ctx.resume();
  }
  return ctx;
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(m: boolean): void {
  muted = m;
  const c = ensure();
  if (c && master) {
    master.gain.setTargetAtTime(m ? 0 : 0.55, c.currentTime, 0.08);
  }
  if (!m) {
    startDrone();
    start60HzHum();
  } else {
    stopDrone();
    stop60HzHum();
  }
}

function noiseBuffer(c: AudioContext, seconds = 1): AudioBuffer {
  const buf = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) {
    d[i] = Math.random() * 2 - 1;
  }
  return buf;
}

export function start60HzHum(): void {
  const c = ensure();
  if (!c || !master || humNode || muted) return;
  const osc = c.createOscillator();
  const osc2 = c.createOscillator();
  const gain = c.createGain();
  const filter = c.createBiquadFilter();

  osc.type = "sine";
  osc.frequency.value = 60; // 60Hz US mains hum
  osc2.type = "triangle";
  osc2.frequency.value = 120; // 2nd harmonic

  filter.type = "lowpass";
  filter.frequency.value = 180;

  gain.gain.value = 0.04;

  osc.connect(filter);
  osc2.connect(filter);
  filter.connect(gain);
  gain.connect(master);

  osc.start();
  osc2.start();

  humNode = {
    stop: () => {
      try {
        osc.stop();
        osc2.stop();
      } catch {}
      humNode = null;
    },
  };
}

export function stop60HzHum(): void {
  humNode?.stop();
}

export function startDrone(): void {
  const c = ensure();
  if (!c || !master || droneNodes || muted) return;
  const g = c.createGain();
  g.gain.value = 0.0;
  g.gain.setTargetAtTime(0.18, c.currentTime, 1.2);
  g.connect(master);

  const o1 = c.createOscillator();
  o1.type = "sawtooth";
  o1.frequency.value = 55;
  const o2 = c.createOscillator();
  o2.type = "sine";
  o2.frequency.value = 82.4;
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 220;
  const lfo = c.createOscillator();
  lfo.frequency.value = 0.12;
  const lfoGain = c.createGain();
  lfoGain.gain.value = 90;

  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);
  o1.connect(filter);
  o2.connect(filter);
  filter.connect(g);

  o1.start();
  o2.start();
  lfo.start();

  droneNodes = {
    stop: () => {
      g.gain.setTargetAtTime(0, c.currentTime, 0.4);
      setTimeout(() => {
        try {
          o1.stop();
          o2.stop();
          lfo.stop();
        } catch {}
      }, 1500);
      droneNodes = null;
    },
    setTheme: (t) => {
      const now = c.currentTime;
      if (t === "mind") {
        o1.frequency.setTargetAtTime(32.7, now, 1.0); // Sub-bass C1
        o2.frequency.setTargetAtTime(49.0, now, 1.0);
        filter.frequency.setTargetAtTime(160, now, 1.0);
        lfo.frequency.setTargetAtTime(0.6, now, 1.0);
      } else if (t === "upside") {
        o1.frequency.setTargetAtTime(41.2, now, 1.2);
        o2.frequency.setTargetAtTime(58.3, now, 1.2);
        filter.frequency.setTargetAtTime(340, now, 1.2);
        lfo.frequency.setTargetAtTime(0.4, now, 1.2);
      } else {
        o1.frequency.setTargetAtTime(55, now, 1.2);
        o2.frequency.setTargetAtTime(82.4, now, 1.2);
        filter.frequency.setTargetAtTime(220, now, 1.2);
        lfo.frequency.setTargetAtTime(0.12, now, 1.2);
      }
    },
  };
}

export function stopDrone(): void {
  droneNodes?.stop();
}

export function setDroneTheme(t: "normal" | "upside" | "mind"): void {
  droneNodes?.setTheme(t);
}

// Interactive Radio Static Generator with dynamic volume
export function setRadioStatic(volume: number): void {
  const c = ensure();
  if (!c || !master || muted) return;

  if (volume <= 0.01) {
    if (staticNode) {
      staticNode.stop();
      staticNode = null;
    }
    return;
  }

  if (!staticNode) {
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(c, 3);
    src.loop = true;
    const filter = c.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1600;
    filter.Q.value = 1.2;
    const gain = c.createGain();
    gain.gain.value = volume * 0.25;

    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start();

    staticNode = {
      stop: () => {
        try {
          src.stop();
        } catch {}
      },
      setVolume: (v: number) => {
        gain.gain.setTargetAtTime(v * 0.25, c.currentTime, 0.05);
      },
    };
  } else {
    staticNode.setVolume(volume);
  }
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType = "square",
  vol = 0.12,
  slideTo?: number,
  delay = 0
): void {
  const c = ensure();
  if (!c || !master || muted) return;
  const t0 = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) {
    o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  }
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}

function burst(dur: number, vol = 0.15, freq = 1800, delay = 0): void {
  const c = ensure();
  if (!c || !master || muted) return;
  const t0 = c.currentTime + delay;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, dur);
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = freq;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f);
  f.connect(g);
  g.connect(master);
  src.start(t0);
}

export type Sfx =
  | "click"
  | "type"
  | "ok"
  | "err"
  | "glitch"
  | "power"
  | "gate"
  | "boom"
  | "clue"
  | "alarm"
  | "heartbeat"
  | "clockTick"
  | "clockChime"
  | "blip"
  | "gateRumble"
  | "morseDot"
  | "morseDash"
  | "snap"
  | "dial"
  | "staticBurst"
  | "tvSwitch"
  | "vecnaCurse";

export function sfx(name: Sfx): void {
  const c = ensure();
  if (!c || !master || muted) return;

  switch (name) {
    case "click":
      tone(680, 0.04, "square", 0.07);
      break;

    case "type":
      tone(950 + Math.random() * 250, 0.025, "square", 0.035);
      break;

    case "ok":
      tone(523, 0.12, "triangle", 0.14);
      tone(659, 0.12, "triangle", 0.14, undefined, 0.09);
      tone(784, 0.28, "triangle", 0.14, undefined, 0.18);
      tone(1046, 0.35, "sine", 0.1, undefined, 0.28);
      break;

    case "err":
      tone(150, 0.28, "sawtooth", 0.18, 70);
      burst(0.2, 0.12, 380);
      break;

    case "glitch":
      burst(0.28, 0.18, 2600);
      tone(1400, 0.1, "square", 0.08, 120);
      burst(0.15, 0.12, 800, 0.12);
      break;

    case "power":
      tone(110, 0.9, "sawtooth", 0.12, 880);
      tone(220, 0.9, "sine", 0.12, 1760);
      burst(0.4, 0.08, 1200, 0.2);
      break;

    case "gate":
      tone(50, 2.8, "sawtooth", 0.22, 25);
      burst(2.0, 0.16, 260);
      break;

    case "boom":
      tone(65, 1.1, "sine", 0.35, 24);
      burst(0.8, 0.22, 180);
      break;

    case "clue":
      tone(880, 0.12, "sine", 0.12);
      tone(1320, 0.35, "sine", 0.12, undefined, 0.09);
      break;

    case "alarm":
      for (let i = 0; i < 4; i++) {
        tone(i % 2 ? 440 : 660, 0.18, "square", 0.1, undefined, i * 0.2);
      }
      burst(0.8, 0.1, 1000);
      break;

    case "heartbeat":
      // Low sinister double-thump
      tone(55, 0.18, "sine", 0.35, 35);
      burst(0.12, 0.08, 120);
      tone(45, 0.22, "sine", 0.28, 30, 0.22);
      burst(0.14, 0.06, 90, 0.22);
      break;

    case "clockTick":
      // Woody antique mechanical escapement click
      tone(1200, 0.02, "triangle", 0.12, 400);
      burst(0.03, 0.08, 3200);
      break;

    case "clockChime":
      // Deep ominous grandfather clock bell
      tone(196, 2.5, "sine", 0.35, 192); // G3
      tone(392, 1.8, "sine", 0.18, 388); // G4 harmonic
      tone(587, 1.2, "triangle", 0.08);  // D5 harmonic
      burst(0.2, 0.08, 500);
      break;

    case "blip":
      tone(1046, 0.05, "sine", 0.15);
      break;

    case "gateRumble":
      tone(42, 3.2, "sawtooth", 0.24, 20);
      burst(2.5, 0.18, 140);
      break;

    case "morseDot":
      tone(800, 0.07, "sine", 0.15);
      break;

    case "morseDash":
      tone(800, 0.21, "sine", 0.15);
      break;

    case "snap":
      burst(0.04, 0.25, 4200);
      tone(2400, 0.03, "sawtooth", 0.12, 600);
      break;

    case "dial":
      tone(420, 0.025, "triangle", 0.08);
      break;

    case "staticBurst":
      burst(0.35, 0.25, 1800);
      break;

    case "tvSwitch":
      // Vintage CRT TV flyback transformer whine + cathode ray static discharge pop
      tone(15734, 0.22, "sine", 0.08); // 15.734 kHz NTSC line frequency whine
      burst(0.2, 0.24, 2200);          // CRT static zap
      tone(85, 0.14, "triangle", 0.2, 28); // Low frequency power thump/pop
      break;

    case "vecnaCurse":
      // Terrifying deep subterranean frequency sweep + ominous grandfather clock toll + sinister static burst
      tone(48, 3.8, "sawtooth", 0.48, 20); // Sub-bass descending sweep
      tone(96, 3.2, "sine", 0.35, 40);
      burst(1.8, 0.22, 180);              // Rumbling atmospheric noise
      // Sinister clock chime harmonic overlay
      tone(196, 3.0, "sine", 0.38, 192, 0.2);
      tone(392, 2.2, "sine", 0.24, 388, 0.2);
      tone(587, 1.8, "triangle", 0.14, undefined, 0.25);
      // Dual sinister heartbeat thump
      tone(50, 0.28, "sine", 0.45, 25, 0.7);
      tone(42, 0.32, "sine", 0.38, 22, 1.05);
      break;
  }
}
