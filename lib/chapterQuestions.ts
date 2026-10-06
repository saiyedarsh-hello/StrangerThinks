// lib/chapterQuestions.ts

export interface QuizOption {
  id: string;
  text: string;
}

export interface QuizQuestion {
  id: string;
  itemNumber: number;
  subHeader: string;
  question: string;
  options: QuizOption[];
  correctAnswerId: string;
  hint?: string;
  docketTag?: string;
}

export interface StageQuizConfig {
  chapterId: number;
  stageName: string;
  docketNumber: string;
  sectionHeader: string;
  points: number;
  questions: QuizQuestion[];
}

export const STAGE_QUIZ_CONFIGS: Record<number, StageQuizConfig> = {
  1: {
    chapterId: 1,
    stageName: "HAWKINS TOWN",
    docketNumber: "FORM HPD-01-83 // CLASSIFIED TELEMETRY DOCKET",
    sectionHeader: "SECTION 01 — FORMAL INQUIRY // HAWKINS TOWN TELEMETRY",
    points: 100,
    questions: [
      {
        id: "ch1-q1",
        itemNumber: 1,
        subHeader: "ITEM 01: SUBLEVEL 04 ANOMALY",
        question:
          "During the covert November 1983 incident at Hawkins National Laboratory, which classified Department of Energy project resulted in the initial psychokinetic rift and the escape of test subjects?",
        options: [
          { id: "A", text: "Project MKUltra / Sublevel 04" },
          { id: "B", text: "Operation Paperclip / Echo Division" },
          { id: "C", text: "Stargate Surveillance Protocol" },
          { id: "D", text: "Project Blue Book Sub-Archive" },
        ],
        correctAnswerId: "A",
        hint: "Callahan logged unusual psychokinetic activity near Sublevel 4 under MKUltra.",
        docketTag: "CLASSIFIED DOSSIER",
      },
      {
        id: "ch1-q2",
        itemNumber: 2,
        subHeader: "ITEM 02: RADIO INTERFERENCE FREQUENCY",
        question:
          "What radio frequency band was monitored by Hawkins Middle AV Club when receiving the first anomalous subspace broadcast?",
        options: [
          { id: "A", text: "Heathkit 14.175 MHz CB Band" },
          { id: "B", text: "98.5 MHz FM Commercial Carrier" },
          { id: "C", text: "2.4 GHz Microwave Vector" },
          { id: "D", text: "433 MHz Digital Telemetry Link" },
        ],
        correctAnswerId: "A",
        hint: "Mr. Clarke helped the club assemble the Heathkit ham radio transceiver.",
        docketTag: "SIGNAL LOG",
      },
      {
        id: "ch1-q3",
        itemNumber: 3,
        subHeader: "ITEM 03: MUNICIPAL GRID SURGE",
        question:
          "Which municipal utility experienced catastrophic power surging simultaneously with the gate opening?",
        options: [
          { id: "A", text: "Roane County Power Grid & North Elm Substation" },
          { id: "B", text: "Sattler Quarry Water Reservoir" },
          { id: "C", text: "Cornwallis Telephone Exchange" },
          { id: "D", text: "Hawkins High Heating Boiler" },
        ],
        correctAnswerId: "A",
        hint: "Deputies noted voltage spikes tracking toward the DOE perimeter line.",
        docketTag: "POWER TELEMETRY",
      },
      {
        id: "ch1-q4",
        itemNumber: 4,
        subHeader: "ITEM 04: SUBJECT 011 PHYSIOLOGY",
        question:
          "What physiological indicator consistently accompanied Eleven's remote viewing and sensory deprivation tank sessions?",
        options: [
          { id: "A", text: "Unilateral Nasal Hemorrhage (Nosebleed)" },
          { id: "B", text: "Retinal Color Inversion" },
          { id: "C", text: "Complete Auditory Silence" },
          { id: "D", text: "Thermal Body Hypothermia" },
        ],
        correctAnswerId: "A",
        hint: "High psychokinetic output causes blood vessels in the nasal cavity to rupture.",
        docketTag: "MEDICAL OBSERVATION",
      },
    ],
  },
  2: {
    chapterId: 2,
    stageName: "POLICE STATION",
    docketNumber: "FORM HPD-02-83 // CLASSIFIED CASE DOSSIER DOCKET",
    sectionHeader: "SECTION 02 — FORMAL INQUIRY // POLICE STATION CASE DOSSIER",
    points: 150,
    questions: [
      {
        id: "ch2-q1",
        itemNumber: 1,
        subHeader: "ITEM 01: ANOMALY EPICENTER",
        question:
          "Chief Hopper's incident board correlates witness reports, power station voltage drops, and RF interference. Which facility is the primary epicenter of the anomaly?",
        options: [
          { id: "A", text: "Hawkins National Laboratory (Sublevel 4)" },
          { id: "B", text: "Cornwallis Municipal Substation" },
          { id: "C", text: "Roane County Water Tower Reservoir" },
          { id: "D", text: "Sattler Quarry Abandoned Basin" },
        ],
        correctAnswerId: "A",
        hint: "All field vectors and radio recordings converge directly on Hawkins Lab.",
        docketTag: "GROUND ZERO",
      },
      {
        id: "ch2-q2",
        itemNumber: 2,
        subHeader: "ITEM 02: MIRKWOOD ROADWAY RECON",
        question:
          "What vehicle was found abandoned near the Mirkwood perimeter road on the night Will Byers disappeared?",
        options: [
          { id: "A", text: "1980 Ross Apollo Green Bicycle" },
          { id: "B", text: "1978 Chevy K5 Blazer" },
          { id: "C", text: "1974 Ford Pinto Hatchback" },
          { id: "D", text: "1982 Honda Civic Sedan" },
        ],
        correctAnswerId: "A",
        hint: "Found tipped over in the ditch with the headlight still faintly running.",
        docketTag: "PHYSICAL EVIDENCE",
      },
      {
        id: "ch2-q3",
        itemNumber: 3,
        subHeader: "ITEM 03: PERIMETER SLIME RESIDUE",
        question:
          "What chemical substance was discovered on the perimeter fences of the Department of Energy facility during morning recon?",
        options: [
          { id: "A", text: "Corrosive Biological Slime with Organic Spores" },
          { id: "B", text: "High-Octane Transformer Dielectric Oil" },
          { id: "C", text: "Liquid Nitrogen Cooling Residue" },
          { id: "D", text: "Refined Sulfuric Battery Acid" },
        ],
        correctAnswerId: "A",
        hint: "The biological mucus leaves glowing organic spore residues under UV light.",
        docketTag: "CHEMICAL BIOHAZARD",
      },
      {
        id: "ch2-q4",
        itemNumber: 4,
        subHeader: "ITEM 04: DISPATCH RECON OFFICERS",
        question:
          "Which Hawkins Police Department officers assisted Chief Hopper in reviewing the surveillance logs from the main gate checkpoint?",
        options: [
          { id: "A", text: "Officer Callahan & Officer Powell" },
          { id: "B", text: "Agent Frazier & Special Agent Miller" },
          { id: "C", text: "Sheriff Clark & Deputy Owens" },
          { id: "D", text: "Officer Bradley & Sergeant Hicks" },
        ],
        correctAnswerId: "A",
        hint: "Callahan and Powell are the two main deputies at the Hawkins precinct.",
        docketTag: "PERSONNEL RECORD",
      },
    ],
  },
  3: {
    chapterId: 3,
    stageName: "BYERS HOUSE",
    docketNumber: "FORM HPD-03-83 // CLASSIFIED WALL COMMUNICATIONS DOCKET",
    sectionHeader: "SECTION 03 — FORMAL INQUIRY // BYERS HOUSE COMMUNICATIONS",
    points: 150,
    questions: [
      {
        id: "ch3-q1",
        itemNumber: 1,
        subHeader: "ITEM 01: WALL INTERFACE ARRAY",
        question:
          "What household decoration did Joyce Byers string across the living room to establish direct alphabetic contact with Will?",
        options: [
          { id: "A", text: "26 Multicolored Christmas String Lights (A through Z)" },
          { id: "B", text: "Rotary Telephone Handset Bells" },
          { id: "C", text: "Cassette Tape Magnetic Ribbons" },
          { id: "D", text: "Flashlight Morse Code Reflectors" },
        ],
        correctAnswerId: "A",
        hint: "Joyce painted 26 English letters on the floral wallpaper beneath each bulb.",
        docketTag: "INTERFACE SCHEMATIC",
      },
      {
        id: "ch3-q2",
        itemNumber: 2,
        subHeader: "ITEM 02: URGENT WALL CIPHER",
        question:
          "What urgent warning did Will spell out through the wall lights before the Demogorgon burst through the wallpaper?",
        options: [
          { id: "A", text: "R - U - N (RUN)" },
          { id: "B", text: "H - I - D - E (HIDE)" },
          { id: "C", text: "H - E - L - P (HELP)" },
          { id: "D", text: "B - A - C - K (BACK)" },
        ],
        correctAnswerId: "A",
        hint: "Three rapid pulses spelled out the single imperative word to flee.",
        docketTag: "DECODED TRANSMISSION",
      },
      {
        id: "ch3-q3",
        itemNumber: 3,
        subHeader: "ITEM 03: CASSETTE GROUNDING TRACK",
        question:
          "Which rock anthem did Jonathan play on his cassette deck in Will's bedroom to keep his spirits grounded?",
        options: [
          { id: "A", text: "The Clash — 'Should I Stay or Should I Go'" },
          { id: "B", text: "Joy Division — 'Atmosphere'" },
          { id: "C", text: "Echo & the Bunnymen — 'Nocturnal Me'" },
          { id: "D", text: "Peter Gabriel — 'Heroes'" },
        ],
        correctAnswerId: "A",
        hint: "From Combat Rock (1982), Will sang this track while hiding in Castle Byers.",
        docketTag: "AUDIO EVIDENCE",
      },
      {
        id: "ch3-q4",
        itemNumber: 4,
        subHeader: "ITEM 04: DIMENSIONAL MEMBRANE",
        question:
          "What physical barrier anomaly formed behind the wallpaper when Joyce tried to reach through to her son?",
        options: [
          { id: "A", text: "A Translucent, Membrane-Like Dimensional Wall" },
          { id: "B", text: "Solidified Black Obsidian Glass" },
          { id: "C", text: "An Invisible High-Voltage Electrical Field" },
          { id: "D", text: "A Vacuum Air Pocket with Freezing Frost" },
        ],
        correctAnswerId: "A",
        hint: "The wall stretched like elastic latex as the Upside Down intersected our world.",
        docketTag: "ANOMALY ANALYSIS",
      },
    ],
  },
  4: {
    chapterId: 4,
    stageName: "HAWKINS LAB",
    docketNumber: "FORM HPD-04-83 // CLASSIFIED MAINFRAME ROUTINE DOCKET",
    sectionHeader: "SECTION 04 — FORMAL INQUIRY // HAWKINS LAB MAINFRAME ROUTINE",
    points: 200,
    questions: [
      {
        id: "ch4-q1",
        itemNumber: 1,
        subHeader: "ITEM 01: BUFFER PARITY ROUTINE",
        question:
          "In the Sublevel 3 telemetry router, what parity logic routine stabilized the crashed data packet buffer?",
        options: [
          { id: "A", text: "Double Even Integers (* 2) and Add 1 to Odds (+ 1)" },
          { id: "B", text: "Bitwise XOR Shift Right by 2 Bits" },
          { id: "C", text: "Cyclic Redundancy Check Polynomial 0x1021" },
          { id: "D", text: "Invert Odd Bytes and Sum Modulo 256" },
        ],
        correctAnswerId: "A",
        hint: "Check the Hawkins Lab telemetry parity script in Sublevel 3.",
        docketTag: "LOGIC SCHEMATIC",
      },
      {
        id: "ch4-q2",
        itemNumber: 2,
        subHeader: "ITEM 02: LEAD RESEARCH DIRECTOR",
        question:
          "Who was the senior research scientist overseeing Project Indigo and the psychokinetic child experiments at Hawkins Lab?",
        options: [
          { id: "A", text: "Dr. Martin Brenner ('Papa')" },
          { id: "B", text: "Dr. Sam Owens" },
          { id: "C", text: "Dr. Alexei" },
          { id: "D", text: "Agent Connie Frazier" },
        ],
        correctAnswerId: "A",
        hint: "Brenner ran the classified sensory deprivation program throughout the 1970s and 1980s.",
        docketTag: "DIRECTOR PROFILE",
      },
      {
        id: "ch4-q3",
        itemNumber: 3,
        subHeader: "ITEM 03: SENSORY ISOLATION TANK",
        question:
          "What isolation apparatus was utilized in Hawkins Lab to amplify test subjects' extra-sensory perception into the Void?",
        options: [
          { id: "A", text: "Saline-Filled Sensory Deprivation Immersion Tank" },
          { id: "B", text: "Hyperbaric Oxygen Compression Chamber" },
          { id: "C", text: "Faraday Cage Electromagnetic Room" },
          { id: "D", text: "Sub-Zero Cryogenic Suspension Capsule" },
        ],
        correctAnswerId: "A",
        hint: "Filled with hundreds of pounds of salt to allow complete zero-gravity floatation.",
        docketTag: "EQUIPMENT LOG",
      },
      {
        id: "ch4-q4",
        itemNumber: 4,
        subHeader: "ITEM 04: FIRST GATE INTRUDER",
        question:
          "What creature first breached through the dimensional gate following Subject 011's psychic contact in the Void?",
        options: [
          { id: "A", text: "The Demogorgon (Flower-Headed Predator)" },
          { id: "B", text: "The Mind Flayer (Shadow Monster)" },
          { id: "C", text: "The Demodog Quadruped Pack" },
          { id: "D", text: "The Meat Puppet Collective" },
        ],
        correctAnswerId: "A",
        hint: "The humanoid creature with petal-like jaw mandibles entered our realm first.",
        docketTag: "ENTITY IDENTIFICATION",
      },
    ],
  },
  5: {
    chapterId: 5,
    stageName: "THE FOREST",
    docketNumber: "FORM HPD-05-83 // CLASSIFIED FOREST RECON DOCKET",
    sectionHeader: "SECTION 05 — FORMAL INQUIRY // DEEP WOODS RUNIC VECTORS",
    points: 200,
    questions: [
      {
        id: "ch5-q1",
        itemNumber: 1,
        subHeader: "ITEM 01: TREE PORTAL ANOMALY",
        question:
          "What tree landmark in Mirkwood concealed an organic portal into the Upside Down discovered by Nancy Wheeler?",
        options: [
          { id: "A", text: "Hollowed Rotting Sycamore Trunk with Dripping Slime" },
          { id: "B", text: "Lightning-Struck Charred Pine Tree" },
          { id: "C", text: "Ancient Oak with Carved Coordinates" },
          { id: "D", text: "Overgrown Weeping Willow near Sattler Quarry" },
        ],
        correctAnswerId: "A",
        hint: "Nancy crawled through the pulsating fleshy opening inside the sycamore base.",
        docketTag: "PORTAL COORD",
      },
      {
        id: "ch5-q2",
        itemNumber: 2,
        subHeader: "ITEM 02: PREDATOR SCENT VECTOR",
        question:
          "What behavioral vulnerability was observed when tracking Demogorgon scent signatures through the forest?",
        options: [
          { id: "A", text: "Highly Attracted to the Scent of Fresh Blood" },
          { id: "B", text: "Triggered Exclusively by Ultrasonic Whistles" },
          { id: "C", text: "Drawn Exclusively to Bright Ultraviolet Light" },
          { id: "D", text: "Paralyzed by High-Frequency Radio Waves" },
        ],
        correctAnswerId: "A",
        hint: "A single drop of blood cuts through the dimensional barrier like a beacon.",
        docketTag: "BEHAVIORAL BIO",
      },
      {
        id: "ch5-q3",
        itemNumber: 3,
        subHeader: "ITEM 03: RUNIC VECTOR TRIANGULATION",
        question:
          "What runic vector pattern was marked on the three perimeter surveillance trees along Trail 7?",
        options: [
          { id: "A", text: "Vector 4 - 1 - 7 (North-East Triangulation)" },
          { id: "B", text: "Vector 9 - 2 - 5 (South-West Convergence)" },
          { id: "C", text: "Vector 1 - 1 - 0 (Azimuth Dead Reckoning)" },
          { id: "D", text: "Vector 8 - 3 - 4 (Radial Offset Quadrant)" },
        ],
        correctAnswerId: "A",
        hint: "Extract the glowing red pine runes left-to-right to find vector 4-1-7.",
        docketTag: "RUNIC VECTOR",
      },
      {
        id: "ch5-q4",
        itemNumber: 4,
        subHeader: "ITEM 04: TRAP COUNTERMEASURES",
        question:
          "What makeshift countermeasures did Nancy Wheeler and Jonathan Byers prepare at the Byers house to trap the predator?",
        options: [
          { id: "A", text: "Bear Trap, Gasoline Fire, and Nail-Studded Bat" },
          { id: "B", text: "High-Voltage Electrical Cattle Prod & Net" },
          { id: "C", text: "Liquid Nitrogen Aerosers" },
          { id: "D", text: "Magnesium Flares and Fireworks Battery" },
        ],
        correctAnswerId: "A",
        hint: "Steve Harrington joined with the nail-spiked Louisville Slugger bat.",
        docketTag: "TACTICAL DEFENSE",
      },
    ],
  },
  6: {
    chapterId: 6,
    stageName: "RADIO TOWER",
    docketNumber: "FORM HPD-06-83 // CLASSIFIED RADIO TOWER DOCKET",
    sectionHeader: "SECTION 06 — FORMAL INQUIRY // RADIO FREQUENCY CALIBRATION",
    points: 250,
    questions: [
      {
        id: "ch6-q1",
        itemNumber: 1,
        subHeader: "ITEM 01: CEREBRO ANTENNA ARRAY",
        question:
          "What custom radio apparatus did Dustin Henderson construct on Weathertop to broadcast clear signals to Utah?",
        options: [
          { id: "A", text: "Cerebro Ham Radio with Directional Antenna Mast" },
          { id: "B", text: "VHF Military Repeater with Satellite Dish" },
          { id: "C", text: "Shortwave Tube Transceiver on 50 MHz" },
          { id: "D", text: "Microwave Dish Link Aimed at Chicago" },
        ],
        correctAnswerId: "A",
        hint: "Dustin hauled the massive battery-powered Cerebro kit up Weathertop hill.",
        docketTag: "TRANSMITTER SPEC",
      },
      {
        id: "ch6-q2",
        itemNumber: 2,
        subHeader: "ITEM 02: UPSIDE DOWN PROPAGATION LOSS",
        question:
          "What environmental element in the Upside Down severely disrupts electromagnetic radio wave propagation?",
        options: [
          { id: "A", text: "Toxic Airborne Spores & Localized Electromagnetic Storms" },
          { id: "B", text: "Total Absence of Atmospheric Nitrogen" },
          { id: "C", text: "Constant Sub-Zero Temperature Inversions" },
          { id: "D", text: "Heavy Radioactive Gamma Decay Fields" },
        ],
        correctAnswerId: "A",
        hint: "Particles suspended in the air generate continuous electrostatic bursts.",
        docketTag: "PROPAGATION PHYSICS",
      },
      {
        id: "ch6-q3",
        itemNumber: 3,
        subHeader: "ITEM 03: RADIOMETER PIN HARMONICS",
        question:
          "How many pins must be aligned on the Hawkins Radiometer to calibrate the subspace resonance circuit?",
        options: [
          { id: "A", text: "5 Harmonic Resonance Calibration Pins" },
          { id: "B", text: "3 Low-Frequency Quartz Crystals" },
          { id: "C", text: "8 Parity Check Switch Relays" },
          { id: "D", text: "12 Dual-Tone Multi-Frequency Diodes" },
        ],
        correctAnswerId: "A",
        hint: "Calibrate all 5 pins on the tower radiometer to clear the distortion meter.",
        docketTag: "INSTRUMENT CALIBRATION",
      },
      {
        id: "ch6-q4",
        itemNumber: 4,
        subHeader: "ITEM 04: PLANCK'S CONSTANT RELAY",
        question:
          "What mathematical constant was relayed via Cerebro from Utah to unlock the Russian subterranean vault?",
        options: [
          { id: "A", text: "Planck's Constant: 6.62607004 (or 6.62607015)" },
          { id: "B", text: "Euler's Number: 2.71828182" },
          { id: "C", text: "Fine Structure Constant: 0.00729735" },
          { id: "D", text: "Speed of Light in Vacuum: 299792458" },
        ],
        correctAnswerId: "A",
        hint: "Suzie required Dustin to sing 'The NeverEnding Story' before giving Planck's constant.",
        docketTag: "CIPHER CODE",
      },
    ],
  },
  7: {
    chapterId: 7,
    stageName: "THE GATE RIFT",
    docketNumber: "FORM HPD-07-83 // CLASSIFIED GATE RIFT DOCKET",
    sectionHeader: "SECTION 07 — FORMAL INQUIRY // THE GATEWAY RIFT & VECNA CIPHER",
    points: 500,
    questions: [
      {
        id: "ch7-q1",
        itemNumber: 1,
        subHeader: "ITEM 01: EXPERIMENT 001 TRUE IDENTITY",
        question:
          "What scrubbed identity was decrypted from the 1959 Creel House incident as the true identity of Experiment 001?",
        options: [
          { id: "A", text: "Henry Creel (Peter Ballard / Vecna)" },
          { id: "B", text: "Victor Creel" },
          { id: "C", text: "Dr. Martin Brenner" },
          { id: "D", text: "Billy Hargrove" },
        ],
        correctAnswerId: "A",
        hint: "Applying ROT13 decryption on 'URAEL PERRY' reveals Henry Creel's name.",
        docketTag: "SUBJECT 001",
      },
      {
        id: "ch7-q2",
        itemNumber: 2,
        subHeader: "ITEM 02: PSYCHIC TRANCE COUNTERMEASURE",
        question:
          "What musical melody successfully broke Vecna's psychic trance curse for Max Mayfield in the Mind Lair?",
        options: [
          { id: "A", text: "Kate Bush — 'Running Up That Hill (A Deal with God)'" },
          { id: "B", text: "The Police — 'Every Breath You Take'" },
          { id: "C", text: "Cyndi Lauper — 'Time After Time'" },
          { id: "D", text: "New Order — 'Blue Monday'" },
        ],
        correctAnswerId: "A",
        hint: "Playing Max's favorite cassette track created a red exit portal out of the mindscape.",
        docketTag: "AUDIO LIFELINE",
      },
      {
        id: "ch7-q3",
        itemNumber: 3,
        subHeader: "ITEM 03: VECNA'S MINDSCAPE ANCHOR",
        question:
          "What architectural relic from Henry Creel's childhood home anchors Vecna's mindscape and chiming curse?",
        options: [
          { id: "A", text: "Four-Chime Ornate Rosewood Grandfather Clock" },
          { id: "B", text: "Stained Glass Attic Rose Window" },
          { id: "C", text: "Black-Widow Spider Breeding Terrarium" },
          { id: "D", text: "Basement Iron Furnace Door" },
        ],
        correctAnswerId: "A",
        hint: "Four heavy chimes herald the victim's psychic trance and gate opening.",
        docketTag: "CURSE ARTIFACT",
      },
      {
        id: "ch7-q4",
        itemNumber: 4,
        subHeader: "ITEM 04: SEVERING THE PSYCHIC HIVE-LINK",
        question:
          "What synchronized strategy permanently fractures Vecna's psychic link and seals the dimensional rift?",
        options: [
          { id: "A", text: "Physical Attack in the Upside Down + Psychic Anchor Sever in the Void" },
          { id: "B", text: "High-Voltage Electromagnetic EMP Pulse on Hawkins Substation" },
          { id: "C", text: "Flooding Hawkins Lab Sublevels with Liquid Nitrogen" },
          { id: "D", text: "Detonating Underground Gas Pipelines Beneath Mirkwood" },
        ],
        correctAnswerId: "A",
        hint: "A coordinated multi-realm assault in Hawkins, the Upside Down, and Eleven's psychic void.",
        docketTag: "FINAL VICTORY PROTOCOL",
      },
    ],
  },
};
