import { SanitizedChapter, ChapterVaultSecret, RadiometerPinSecret } from "../types";

/**
 * SANITIZED PUBLIC CHAPTER DATA
 * This is the ONLY data sent to the client when requesting chapter details.
 * Contains ZERO answers, ZERO correct flags, and ZERO regexes.
 */
export const SANITIZED_CHAPTERS: SanitizedChapter[] = [
  {
    id: 1,
    label: "CHAPTER 1",
    tag: "TOWN TELEMETRY",
    archiveSector: "CIVIC DISTRICT",
    archiveTitle: "HAWKINS TOWN",
    archiveSubtitle: "1986 · EMERGENCY TELEMETRY PULSE",
    archiveLines: [
      "The town sleeps under a low autumn mist.",
      "Public utility transmitters are broadcasting anomalous pulses across Roane County.",
      "Verify your classified security clearance to access the emergency telemetry network.",
    ],
    bgSrc: "/hawkins-town-bg.jpg",
    taskId: "ch1-quiz",
    points: 50,
    questionPrompt:
      "During the covert November 1983 incident at Hawkins National Laboratory, which classified Department of Energy project resulted in the initial psychokinetic rift and the escape of test subjects?",
    options: [
      { id: "A", text: "Project MKUltra / Sublevel 04" },
      { id: "B", text: "Operation Paperclip / Echo Division" },
      { id: "C", text: "Stargate Surveillance Protocol" },
      { id: "D", text: "Project Blue Book Sub-Archive" },
    ],
  },
  {
    id: 2,
    label: "CHAPTER 2",
    tag: "PRECINCT DOSSIER",
    archiveSector: "POLICE DEPT",
    archiveTitle: "POLIC STATION",
    archiveSubtitle: "CHIEF'S DESK EVIDENCE DOSSIER",
    archiveLines: [
      "Chief Hopper's office, Hawkins Police Department.",
      "Eyewitness reports, dispatch audio logs, and sensor telemetry have been recovered.",
      "Correlate the timestamps and radio recordings to identify the epicenter of the breach.",
    ],
    bgSrc: "/hawkins-police-bg.jpg",
    taskId: "ch2-police",
    points: 50,
    questionPrompt: "WHICH FACILITY SERVES AS THE CONFIRMED EPICENTER OF THE RIFT?",
    options: [
      { id: "A", text: "Hawkins National Laboratory (Sublevel 4)" },
      { id: "B", text: "Cornwallis Municipal Substation" },
      { id: "C", text: "Roane County Water Tower Reservoir" },
      { id: "D", text: "Sattler Quarry Abandoned Basin" },
    ],
    evidenceLogs: [
      {
        title: "DISPATCH LOG 22:42",
        badge: "AUDIO TRANSCRIPT",
        time: "22:42:15",
        content:
          "Deputies report high-voltage transformers blew along North Elm. An anomalous 3.5 GHz harmonic wave was detected traveling northeast toward the Department of Energy perimeter line.",
      },
      {
        title: "WITNESS 22:58",
        badge: "BENNY'S DINER",
        time: "22:58:00",
        content:
          "Individual in hospital gown spotted fleeing south from woods bordering the government facility. Witness reported lights flickered violently when subject walked near electrical lines.",
      },
      {
        title: "RF SENSOR 23:15",
        badge: "EAST HILL REPEATER",
        time: "23:15:30",
        content:
          "Electromagnetic radiation spike registered at 14.8 MHz. Triangulated vector points directly at Hawkins National Laboratory Sublevel 4 Containment Zone.",
      },
    ],
  },
  {
    id: 3,
    label: "CHAPTER 3",
    tag: "CHRISTMAS LIGHTS",
    archiveSector: "MIRKWOOD",
    archiveTitle: "BYERS HOUSE",
    archiveSubtitle: "WALL COMMUNICATIONS & SCRAMBLED NOTES",
    archiveLines: [
      "The Byers house stands isolated along the edge of Mirkwood.",
      "Tangled strings of Christmas lights are illuminated on the living room wallpaper without any power connection.",
      "Scrambled message fragments are strewn across the table. Reconstruct Will's urgent warning.",
    ],
    bgSrc: "/hawkins-bg.jpg",
    taskId: "ch3-byers",
    points: 50,
    questionPrompt: "Rearrange the scrambled message cards in order to decode Will's warning from the walls:",
    initialTiles: ["THE", "OPEN", "GATE", "NOT", "DO"],
  },
  {
    id: 4,
    label: "CHAPTER 4",
    tag: "MAINFRAME ROUTINE",
    archiveSector: "GRID MAINFRAME",
    archiveTitle: "HAWKINS LAB",
    archiveSubtitle: "TELEMETRY BUFFER OVERFLOW & LOGIC",
    archiveLines: [
      "Hawkins National Laboratory. Sublevel 3 automated relay terminal accessed.",
      "The telemetry packet router crashed due to an unhandled parity logic routine.",
      "Inspect the routine, trace the data loop, and enter the output integer to restore transmission.",
    ],
    bgSrc: "/hawkins-lab-bg.jpg",
    taskId: "ch4-lab",
    points: 50,
    questionPrompt:
      "Inspect the accumulator loop routine. Trace the parity logic when given telemetry signals [12, 5, 8, 3, 10]. Enter the calculated output integer to restore the telemetry router.",
    codeSnippet: `function parseTelemetry(signals) {
  let paritySum = 0;
  for (let i = 0; i < signals.length; i++) {
    # Even numbers multiplied by 2; odd numbers added directly
    if (signals[i] % 2 === 0) {
      paritySum += signals[i] * 2;
    } else {
      paritySum += signals[i];
    }
  }
  return paritySum;
}
console.log(parseTelemetry([12, 5, 8, 3, 10]));`,
    placeholder: "e.g. 68",
  },
  {
    id: 5,
    label: "CHAPTER 5",
    tag: "CARVED RUNES",
    archiveSector: "ROANE COUNTY WOODS",
    archiveTitle: "FOREST",
    archiveSubtitle: "DEEP WOODS · TRAIL 7 COORDINATE RUNES",
    archiveLines: [
      "Deep woods near Trail 7. Autumn fog hangs thick among towering pines.",
      "Flashlight beams reveal strange geometric runes carved into ancient tree trunks.",
      "Extract the three glowing pine digits left-to-right to lock the vector coordinates.",
    ],
    bgSrc: "/creel-bg.jpg",
    taskId: "ch5-forest",
    points: 50,
    questionPrompt:
      "Flashlights reveal ancient markings carved along Trail 7. Inspect the three marked pines in sequence (West, Central, East). Enter the 3-digit vector code:",
    placeholder: "e.g. 417",
  },
  {
    id: 6,
    label: "CHAPTER 6",
    tag: "5-PIN RADIOMETER",
    archiveSector: "EAST HILL",
    archiveTitle: "RADIO TOWER",
    archiveSubtitle: "HARMONIC OSCILLATION & LAB CIPHER",
    archiveLines: [
      "East Hill Radio Tower sublevel accessed.",
      "The tower's emergency radiometer is scrambled by dimensional static.",
      "Calibrate the carrier frequencies, align the waveform, and restore all 5 pins with Pip.",
    ],
    bgSrc: "/hawkins-gate-bg.jpg",
    taskId: "ch6-radio-tower",
    points: 50,
    questionPrompt: "Calibrate the 5 radiometer pins and enter the decrypted 5-digit master access cipher into the keypad.",
  },
  {
    id: 7,
    label: "CHAPTER 7",
    tag: "THE GATE RIFT",
    archiveSector: "PARALLEL ABYSS",
    archiveTitle: "UPSIDE DOWN",
    archiveSubtitle: "THE GATEWAY RIFT & VECNA'S MIND",
    archiveLines: [
      "The dimensional boundary has collapsed. Spores drift through crimson skies.",
      "The ticking grandfather clock echoes across corrupted Hawkins.",
      "Decode Experiment 001's scrubbed identity to sever Vecna's psychic hold on Hawkins.",
    ],
    bgSrc: "/upsidedown-bg.jpg",
    taskId: "ch7-upsidedown",
    points: 50,
    questionPrompt:
      "Before Dr. Brenner designated him Subject 001 at Hawkins Lab, what was the true human identity of the entity now known as Vecna?",
    options: [
      { id: "A", text: "Dr. Martin Brenner" },
      { id: "B", text: "Henry Creel (Subject 001)" },
      { id: "C", text: "Edward Munson" },
      { id: "D", text: "Peter Ballard" },
    ],
  },
];

/**
 * SECURE VAULT SECRETS (SERVER-ONLY)
 * These values NEVER leave the backend process.
 */
export const VAULT_SECRETS: Record<string, ChapterVaultSecret> = {
  "ch1-quiz": {
    id: 1,
    taskId: "ch1-quiz",
    type: "quiz",
    points: 50,
    validation: {
      correctOptionId: "A",
      acceptedAnswers: ["A", "Project MKUltra / Sublevel 04"],
    },
    completionLore: {
      title: "SECURITY CLEARANCE VERIFIED · RECORDS DECRYPTED",
      text: "Project MKUltra records confirmed: psychic trials breached the dimensional veil beneath Hawkins Lab. Officer Callahan directs your team to Chief Hopper's evidence dossier.",
      lines: [
        "CLEARANCE CONFIRMED. Access granted to municipal dispatch telemetry.",
        "Project MKUltra records confirm psychic trials breached the dimensional veil in November 1983.",
        "Proceed to the Hawkins Police Department to examine Chief Hopper's incident board.",
      ],
    },
  },
  "ch2-police": {
    id: 2,
    taskId: "ch2-police",
    type: "case_study",
    points: 50,
    validation: {
      correctOptionId: "A",
      acceptedAnswers: ["A", "Hawkins National Laboratory (Sublevel 4)"],
    },
    completionLore: {
      title: "ANOMALY EPICENTER CONFIRMED",
      text: "All field reports and sensor vectors converge directly on Hawkins National Laboratory Sublevel 4. But first, urgent dispatches report lights communicating at the Byers residence.",
      lines: [
        "ANOMALY EPICENTER CONFIRMED · GROUND ZERO IDENTIFIED.",
        "All telemetry vectors and field reports converge on Hawkins National Laboratory Sublevel 4.",
        "Investigate the Byers residence where lights have begun communicating through the walls.",
      ],
    },
  },
  "ch3-byers": {
    id: 3,
    taskId: "ch3-byers",
    type: "rearrange",
    points: 50,
    validation: {
      correctPhrase: "DO NOT OPEN THE GATE",
    },
    completionLore: {
      title: "WILL'S WARNING DECODED · 'DO NOT OPEN THE GATE'",
      text: "The message is assembled: 'DO NOT OPEN THE GATE'. The lights flicker violently toward Hawkins National Laboratory. The Sublevel 3 mainframe has suffered telemetry parity overflow.",
      lines: [
        "WILL'S WARNING RESTORED: 'DO NOT OPEN THE GATE'.",
        "Electromagnetic surge tracks directly toward the government facility.",
        "Sublevel 3 mainframe has suffered telemetry parity overflow. Stabilize the routine.",
      ],
    },
  },
  "ch4-lab": {
    id: 4,
    taskId: "ch4-lab",
    type: "code",
    points: 50,
    validation: {
      numericAnswer: 68,
      acceptedAnswers: ["68"],
    },
    completionLore: {
      title: "MAINFRAME TELEMETRY BUFFER RESTORED",
      text: "Parity logic routine stabilized! Intercepted Department of Energy logs reveal anomalous coordinates carved into ancient pine trees along Deep Woods Trail 7.",
      lines: [
        "TELEMETRY BUFFER RESTORED · ROUTINE EXECUTION SUCCESSFUL.",
        "Sublevel 3 parity routine stabilized. Grid telemetry active.",
        "Follow the signal vector into the deep forest to find the carved trail markers.",
      ],
    },
  },
  "ch5-forest": {
    id: 5,
    taskId: "ch5-forest",
    type: "forest_runes",
    points: 50,
    validation: {
      codeAnswer: "417",
      acceptedAnswers: ["417", "4-1-7", "4 1 7"],
    },
    completionLore: {
      title: "FOREST COORDINATES LOCKED · VECTOR 4-1-7",
      text: "Trail coordinates 4 · 1 · 7 verified! The harmonic vector points directly to the high-altitude East Hill Radio Tower. Pip is waiting on frequency 14.3 MHz.",
      lines: [
        "FOREST RUNES DECODED: VECTOR 4 · 1 · 7.",
        "Coordinates align with East Hill Radio Tower sublevel.",
        "Ascend to the Radio Tower to calibrate the scrambled 5-pin radiometer.",
      ],
    },
  },
  "ch6-radio-tower": {
    id: 6,
    taskId: "ch6-radio-tower",
    type: "radiometer",
    points: 50,
    validation: {
      codeAnswer: "83479",
      acceptedAnswers: ["83479", "8-3-4-7-9", "8 3 4 7 9"],
    },
    completionLore: {
      title: "RADIOMETER CALIBRATED · MASTER CIPHER RECOVERED",
      text: "All 5 pins locked into harmonic resonance! The master security code 8-3-4-7-9 has been recovered, unlocking the Gate rift leading into the Upside Down.",
      lines: [
        "ALL 5 PINS RESTORED. Master code 8-3-4-7-9 decoded.",
        "Dimensional rift threshold stabilized across Roane County.",
        "The threshold into the Upside Down is open. Prepare for Vecna.",
      ],
    },
  },
  "ch7-upsidedown": {
    id: 7,
    taskId: "ch7-upsidedown",
    type: "final_quiz",
    points: 50,
    validation: {
      correctOptionId: "B",
      acceptedAnswers: ["B", "Henry Creel (Subject 001)"],
    },
    completionLore: {
      title: "HAWKINS PROTOCOL COMPLETE · THE GATE SEALED",
      text: "Henry Creel's identity confirmed! The psychic feedback loop fractures Vecna's link. The dimensional gate seals shut. Hawkins is saved.",
      lines: [
        "HENRY CREEL IDENTIFIED. Subject 001 psychic link severed.",
        "The Gate is sealed. Grandfather clock silenced.",
        "CONGRATULATIONS, RECON TEAM · TOURNAMENT VICTORY!",
      ],
    },
  },
};

/**
 * RADIOMETER PIN SECRETS (SERVER-ONLY)
 */
export const RADIOMETER_PIN_SECRETS: RadiometerPinSecret[] = [
  {
    taskIndex: 0,
    digit: "8",
    label: "FREQ 8",
    validation: {
      type: "radio",
      answerRegex: "^8$",
    },
    points: 25,
  },
  {
    taskIndex: 1,
    digit: "3",
    label: "SEQ 3",
    validation: {
      type: "series",
      answerRegex: "^3$",
    },
    points: 25,
  },
  {
    taskIndex: 2,
    digit: "4",
    label: "PATCH 4",
    validation: {
      type: "connection",
      pairs: [
        { from: "a", to: "b" },
        { from: "c", to: "a" },
        { from: "d", to: "c" },
        { from: "b", to: "d" },
      ],
    },
    points: 30,
  },
  {
    taskIndex: 3,
    digit: "7",
    label: "LOG 7",
    validation: {
      type: "rearrange",
      correctOrder: ["GRID", "SPIKE", "GATE", "OPEN"],
    },
    points: 30,
  },
  {
    taskIndex: 4,
    digit: "9",
    label: "CODE 9",
    validation: {
      type: "debug",
      answerRegex: "^9$",
    },
    points: 35,
  },
];

export const MASTER_KEYPAD_CODE = "83479";
