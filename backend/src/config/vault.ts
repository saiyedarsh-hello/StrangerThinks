import { ChapterDef, SanitizedChapter, ChapterQuestion, SanitizedQuestion } from "../types";

export const CHAPTER_METADATA = [
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
    completionLoreTitle: "SECURITY CLEARANCE VERIFIED · RECORDS DECRYPTED",
    completionLoreText:
      "Project MKUltra records confirmed: psychic trials breached the dimensional veil beneath Hawkins Lab. Officer Callahan directs your team to Chief Hopper's evidence dossier.",
    completionLines: [
      "CLEARANCE CONFIRMED. Access granted to municipal dispatch telemetry.",
      "Project MKUltra records confirm psychic trials breached the dimensional veil in November 1983.",
      "Proceed to the Hawkins Police Department to examine Chief Hopper's incident board.",
    ],
    bgSrc: "/hawkins-town-bg.jpg",
    taskId: "ch1-quiz",
    points: 50,
    docketNumber: "FORM HPD-01-83 // CLASSIFIED TELEMETRY DOCKET",
    sectionHeader: "SECTION 01 — FORMAL INQUIRY // HAWKINS TOWN TELEMETRY",
  },
  {
    id: 2,
    label: "CHAPTER 2",
    tag: "PRECINCT DOSSIER",
    archiveSector: "POLICE DEPT",
    archiveTitle: "POLICE STATION",
    archiveSubtitle: "CHIEF'S DESK EVIDENCE DOSSIER",
    archiveLines: [
      "Chief Hopper's office, Hawkins Police Department.",
      "Eyewitness reports, dispatch audio logs, and sensor telemetry have been recovered.",
      "Correlate the timestamps and radio recordings to identify the epicenter of the breach.",
    ],
    completionLoreTitle: "ANOMALY EPICENTER CONFIRMED",
    completionLoreText:
      "All field reports and sensor vectors converge directly on Hawkins National Laboratory Sublevel 4. But first, urgent dispatches report lights communicating at the Byers residence.",
    completionLines: [
      "ANOMALY EPICENTER CONFIRMED · GROUND ZERO IDENTIFIED.",
      "All telemetry vectors and field reports converge on Hawkins National Laboratory Sublevel 4.",
      "Investigate the Byers residence where lights have begun communicating through the walls.",
    ],
    bgSrc: "/hawkins-police-bg.jpg",
    taskId: "ch2-police",
    points: 50,
    docketNumber: "FORM HPD-02-83 // CLASSIFIED CASE DOSSIER DOCKET",
    sectionHeader: "SECTION 02 — FORMAL INQUIRY // POLICE STATION CASE DOSSIER",
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
    completionLoreTitle: "WILL'S WARNING DECODED · 'DO NOT OPEN THE GATE'",
    completionLoreText:
      "The message is assembled: 'DO NOT OPEN THE GATE'. The lights flicker violently toward Hawkins National Laboratory. The Sublevel 3 mainframe has suffered telemetry parity overflow.",
    completionLines: [
      "WILL'S WARNING RESTORED: 'DO NOT OPEN THE GATE'.",
      "Electromagnetic surge tracks directly toward the government facility.",
      "Sublevel 3 mainframe has suffered telemetry parity overflow. Stabilize the routine.",
    ],
    bgSrc: "/hawkins-bg.jpg",
    taskId: "ch3-byers",
    points: 50,
    docketNumber: "FORM HPD-03-83 // CLASSIFIED WALL COMMUNICATIONS DOCKET",
    sectionHeader: "SECTION 03 — FORMAL INQUIRY // BYERS HOUSE COMMUNICATIONS",
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
    completionLoreTitle: "MAINFRAME TELEMETRY BUFFER RESTORED",
    completionLoreText:
      "Parity logic routine stabilized! Intercepted Department of Energy logs reveal anomalous coordinates carved into ancient pine trees along Deep Woods Trail 7.",
    completionLines: [
      "TELEMETRY BUFFER RESTORED · ROUTINE EXECUTION SUCCESSFUL.",
      "Sublevel 3 parity routine stabilized. Grid telemetry active.",
      "Follow the signal vector into the deep forest to find the carved trail markers.",
    ],
    bgSrc: "/hawkins-lab-bg.jpg",
    taskId: "ch4-lab",
    points: 50,
    docketNumber: "FORM HPD-04-83 // CLASSIFIED MAINFRAME ROUTINE DOCKET",
    sectionHeader: "SECTION 04 — FORMAL INQUIRY // HAWKINS LAB MAINFRAME ROUTINE",
  },
  {
    id: 5,
    label: "CHAPTER 5",
    tag: "5-PIN RADIOMETER",
    archiveSector: "EAST HILL",
    archiveTitle: "RADIO TOWER",
    archiveSubtitle: "HARMONIC OSCILLATION & LAB CIPHER",
    archiveLines: [
      "East Hill Radio Tower sublevel accessed.",
      "The tower's emergency radiometer is scrambled by dimensional static.",
      "Calibrate the carrier frequencies, align the waveform, and restore all 5 pins with Pip.",
    ],
    completionLoreTitle: "RADIOMETER CALIBRATED · MASTER CIPHER RECOVERED",
    completionLoreText:
      "All 5 pins locked into harmonic resonance! The master security code 8-3-4-7-9 has been recovered, unlocking the Gate rift leading into the Upside Down.",
    completionLines: [
      "ALL 5 PINS RESTORED. Master code 8-3-4-7-9 decoded.",
      "Dimensional rift threshold stabilized across Roane County.",
      "The threshold into the Upside Down is open. Prepare for Vecna.",
    ],
    bgSrc: "/hawkins-gate-bg.jpg",
    taskId: "ch5-radio-tower",
    points: 50,
    docketNumber: "FORM HPD-05-83 // CLASSIFIED RADIO TOWER DOCKET",
    sectionHeader: "SECTION 05 — FORMAL INQUIRY // RADIO FREQUENCY CALIBRATION",
  },
  {
    id: 6,
    label: "CHAPTER 6",
    tag: "THE GATE RIFT",
    archiveSector: "PARALLEL ABYSS",
    archiveTitle: "UPSIDE DOWN",
    archiveSubtitle: "THE GATEWAY RIFT & VECNA'S MIND",
    archiveLines: [
      "The dimensional boundary has collapsed. Spores drift through crimson skies.",
      "The ticking grandfather clock echoes across corrupted Hawkins.",
      "Decode Experiment 001's scrubbed identity to sever Vecna's psychic hold on Hawkins.",
    ],
    completionLoreTitle: "HAWKINS PROTOCOL COMPLETE · THE GATE SEALED",
    completionLoreText:
      "Henry Creel's identity confirmed! The psychic feedback loop fractures Vecna's link. The dimensional gate seals shut. Hawkins is saved.",
    completionLines: [
      "HENRY CREEL IDENTIFIED. Subject 001 psychic link severed.",
      "The Gate is sealed. Grandfather clock silenced.",
      "CONGRATULATIONS, RECON TEAM · TOURNAMENT VICTORY!",
    ],
    bgSrc: "/upsidedown-bg.jpg",
    taskId: "ch6-upsidedown",
    points: 50,
    docketNumber: "FORM HPD-06-83 // CLASSIFIED GATE RIFT DOCKET",
    sectionHeader: "SECTION 06 — FORMAL INQUIRY // THE GATEWAY RIFT & VECNA CIPHER",
  },
];

export const RAW_CHAPTER_QUESTIONS: Record<number, ChapterQuestion[]> = {
  "1": [
    {
      "id": "ch1-q1",
      "chapterId": 1,
      "itemNumber": 1,
      "subHeader": "QUIZ Q1 · D&D CAMPAIGN ROLL",
      "question": "In Season 1 Episode 1, what roll did Will need on the twenty-sided die (d20) to successfully cast Fireball against the Demogorgon?",
      "options": [
        {
          "id": "A",
          "text": "14 or higher"
        },
        {
          "id": "B",
          "text": "13 or higher"
        },
        {
          "id": "C",
          "text": "15 or higher"
        },
        {
          "id": "D",
          "text": "7 or higher"
        }
      ],
      "correctAnswerId": "B",
      "hint": "Will rolled a 7 and said, 'Did the rest of you see that? It got me.' He needed a 13 or higher.",
      "docketTag": "D&D LOG"
    },
    {
      "id": "ch1-q2",
      "chapterId": 1,
      "itemNumber": 2,
      "subHeader": "QUIZ Q2 · AV CLUB FACULTY",
      "question": "What is the full name of Hawkins Middle School's science teacher who runs the A.V. Club?",
      "options": [
        {
          "id": "A",
          "text": "Scott A. Clarke"
        },
        {
          "id": "B",
          "text": "Arthur C. Clarke"
        },
        {
          "id": "C",
          "text": "Robert A. Clarke"
        },
        {
          "id": "D",
          "text": "Richard M. Clarke"
        }
      ],
      "correctAnswerId": "A",
      "hint": "Mr. Clarke is known for his enthusiastic support and Heathkit ham radio demonstrations.",
      "docketTag": "FACULTY DOSSIER"
    },
    {
      "id": "ch1-q3",
      "chapterId": 1,
      "itemNumber": 3,
      "subHeader": "QUIZ Q3 · SENSORY DEPRIVATION POOL",
      "question": "How much salt did Mr. Clarke calculate was required for the improvised sensory deprivation pool in the gym?",
      "options": [
        {
          "id": "A",
          "text": "1,500 lb"
        },
        {
          "id": "B",
          "text": "1,200 lb"
        },
        {
          "id": "C",
          "text": "800 lb"
        },
        {
          "id": "D",
          "text": "1,000 lb"
        }
      ],
      "correctAnswerId": "A",
      "hint": "Dustin called Mr. Clarke late at night while he was watching 'The Thing from Another World'.",
      "docketTag": "PHYSICS CALC"
    },
    {
      "id": "ch1-q4",
      "chapterId": 1,
      "itemNumber": 4,
      "subHeader": "QUIZ Q4 · CASSETTE MIXTAPE",
      "question": "Which iconic Clash song does Jonathan play on cassette in Will's room to bond over music?",
      "options": [
        {
          "id": "A",
          "text": "\"Should I Stay or Should I Go\""
        },
        {
          "id": "B",
          "text": "\"Atmosphere\""
        },
        {
          "id": "C",
          "text": "\"Running Up That Hill\""
        },
        {
          "id": "D",
          "text": "\"Elegia\""
        }
      ],
      "correctAnswerId": "A",
      "hint": "Will later sings this song to stay grounded while trapped in the Upside Down.",
      "docketTag": "AUDIO EVIDENCE"
    },
    {
      "id": "ch1-q5",
      "chapterId": 1,
      "itemNumber": 5,
      "subHeader": "QUIZ Q5 · BENNY'S BURGERS",
      "question": "What is the name of the kind diner owner who discovers Eleven and offers her food after her escape?",
      "options": [
        {
          "id": "A",
          "text": "Gary Hammond"
        },
        {
          "id": "B",
          "text": "Earl Benny"
        },
        {
          "id": "C",
          "text": "Benny Hammond"
        },
        {
          "id": "D",
          "text": "Benny Baker"
        }
      ],
      "correctAnswerId": "C",
      "hint": "He owned Benny's Burgers and gave her fresh burgers before DOE agents arrived.",
      "docketTag": "WITNESS LOG"
    },
    {
      "id": "ch1-q6",
      "chapterId": 1,
      "itemNumber": 6,
      "subHeader": "QUIZ Q6 · MORGUE AUTOPSY REVELATION",
      "question": "What material does Chief Hopper discover stuffed inside Will's decoy body in the Hawkins morgue?",
      "options": [
        {
          "id": "A",
          "text": "Dry Wood Sawdust"
        },
        {
          "id": "B",
          "text": "Foam Batting and Cotton"
        },
        {
          "id": "C",
          "text": "Shredded Lab Paper"
        },
        {
          "id": "D",
          "text": "Polyfill Synthetic Stuffing"
        }
      ],
      "correctAnswerId": "D",
      "hint": "Hopper cut open the torso seam with a pocket knife, confirming the state troopers planted a dummy.",
      "docketTag": "CORONER REPORT"
    },
    {
      "id": "ch1-q7",
      "chapterId": 1,
      "itemNumber": 7,
      "subHeader": "QUIZ Q7 · PALACE ARCADE RECORD",
      "question": "What Dig Dug high score does Max Mayfield achieve at the Palace Arcade under the handle 'MADMAX'?",
      "options": [
        {
          "id": "A",
          "text": "651,990"
        },
        {
          "id": "B",
          "text": "751,300"
        },
        {
          "id": "C",
          "text": "850,220"
        },
        {
          "id": "D",
          "text": "900,100"
        }
      ],
      "correctAnswerId": "B",
      "hint": "Dustin was shocked to find his previous top score dethroned by MADMAX.",
      "docketTag": "ARCADE TELEMETRY"
    },
    {
      "id": "ch1-q8",
      "chapterId": 1,
      "itemNumber": 8,
      "subHeader": "QUIZ Q8 · DEMODOG DIET",
      "question": "What specific candy bar does Dustin feed Dart the juvenile Demodog to domesticate it?",
      "options": [
        {
          "id": "A",
          "text": "Three Musketeers"
        },
        {
          "id": "B",
          "text": "Snickers"
        },
        {
          "id": "C",
          "text": "Baby Ruth"
        },
        {
          "id": "D",
          "text": "Butterfinger"
        }
      ],
      "correctAnswerId": "A",
      "hint": "Dustin gave Dart the chocolate bar in his bedroom terrarium, calling it 'nougat'.",
      "docketTag": "SPECIMEN LOG"
    },
    {
      "id": "ch1-q9",
      "chapterId": 1,
      "itemNumber": 9,
      "subHeader": "QUIZ Q9 · LAB SECURITY REBOOT",
      "question": "Which programming language does Bob Newby use on Hawkins Lab's terminals to override the security door lockouts?",
      "options": [
        {
          "id": "A",
          "text": "Fortran"
        },
        {
          "id": "B",
          "text": "COBOL"
        },
        {
          "id": "C",
          "text": "BASIC"
        },
        {
          "id": "D",
          "text": "C++"
        }
      ],
      "correctAnswerId": "C",
      "hint": "Bob founded the Hawkins Middle AV Club and remarked that he learned BASIC for computer engineering.",
      "docketTag": "SYSTEM LOG"
    },
    {
      "id": "ch1-q10",
      "chapterId": 1,
      "itemNumber": 10,
      "subHeader": "QUIZ Q10 · LAB INHIBITOR IMPLANT",
      "question": "What is the name of the miniature psychokinetic inhibitor capsule surgically implanted into Henry Creel (001)?",
      "options": [
        {
          "id": "A",
          "text": "Project MK-Tracker"
        },
        {
          "id": "B",
          "text": "Soteria"
        },
        {
          "id": "C",
          "text": "Cerberus"
        },
        {
          "id": "D",
          "text": "Promethium"
        }
      ],
      "correctAnswerId": "B",
      "hint": "Eleven used her telekinesis to rip the Soteria chip out of Henry's neck in 1979.",
      "docketTag": "LAB DOSSIER"
    }
  ],
  "2": [
    {
      "id": "ch2-q1",
      "chapterId": 2,
      "itemNumber": 1,
      "subHeader": "CONNECTION 01 · HAWKINS BY THE NUMBERS",
      "question": "Match each Stranger Things number in Column A to its matching converted computer value in Column B.",
      "options": [
        {
          "id": "A",
          "text": "1–b, 2–d, 3–c, 4–a (11 = 1011₂, 9 = 1001₂, 1983 = 7BF₁₆, 88 = 58₁₆)"
        },
        {
          "id": "B",
          "text": "1–a, 2–b, 3–c, 4–d (Direct ascending map)"
        },
        {
          "id": "C",
          "text": "1–c, 2–a, 3–d, 4–b (Inverted hexadecimal map)"
        },
        {
          "id": "D",
          "text": "1–d, 2–b, 3–a, 4–c (Binary inverted offset)"
        }
      ],
      "correctAnswerId": "A",
      "hint": "11 in binary is 8+2+1 = 1011₂. 9 in binary is 8+1 = 1001₂. 1983 in hex is 7BF₁₆.",
      "docketTag": "NUMERIC MATRIX"
    },
    {
      "id": "ch2-q2",
      "chapterId": 2,
      "itemNumber": 2,
      "subHeader": "CONNECTION 02 · GATES OF THE UPSIDE DOWN",
      "question": "Match each Hawkins operational situation to the logic gate that governs its exact behavior.",
      "options": [
        {
          "id": "A",
          "text": "1–AND, 2–OR, 3–NOT, 4–XOR"
        },
        {
          "id": "B",
          "text": "1–NAND, 2–NOR, 3–XNOR, 4–AND"
        },
        {
          "id": "C",
          "text": "1–OR, 2–AND, 3–XOR, 4–NOT"
        },
        {
          "id": "D",
          "text": "1–XOR, 2–NOT, 3–AND, 4–OR"
        }
      ],
      "correctAnswerId": "A",
      "hint": "Exclusive choice is XOR; inversion is NOT; simultaneous required conditions is AND.",
      "docketTag": "BOOLEAN LOGIC"
    },
    {
      "id": "ch2-q3",
      "chapterId": 2,
      "itemNumber": 3,
      "subHeader": "CONNECTION 03 · HAWKINS DATA STRUCTURES",
      "question": "Match each town scenario to the computer science data structure it mirrors.",
      "options": [
        {
          "id": "A",
          "text": "1–Stack, 2–Queue, 3–Tree, 4–Graph"
        },
        {
          "id": "B",
          "text": "1–Queue, 2–Stack, 3–Array, 4–Tree"
        },
        {
          "id": "C",
          "text": "1–Graph, 2–Tree, 3–Stack, 4–Queue"
        },
        {
          "id": "D",
          "text": "1–Array, 2–Linked List, 3–Binary Tree, 4–Heap"
        }
      ],
      "correctAnswerId": "A",
      "hint": "Last-in First-out is Stack; First-in First-out is Queue; Networks of arbitrary connections are Graphs.",
      "docketTag": "STRUCTURE MAP"
    },
    {
      "id": "ch2-q4",
      "chapterId": 2,
      "itemNumber": 4,
      "subHeader": "CONNECTION 04 · MIND FLAYER VS CYBERSECURITY",
      "question": "Match each Hawkins threat vector to the cyber attack classification it exemplifies.",
      "options": [
        {
          "id": "A",
          "text": "1–Botnet, 2–DDoS Attack, 3–Trojan Horse, 4–Spyware"
        },
        {
          "id": "B",
          "text": "1–Ransomware, 2–Phishing, 3–Spyware, 4–Botnet"
        },
        {
          "id": "C",
          "text": "1–Trojan Horse, 2–Botnet, 3–DDoS, 4–Ransomware"
        },
        {
          "id": "D",
          "text": "1–Man-in-the-Middle, 2–Zero Day, 3–Rootkit, 4–Worm"
        }
      ],
      "correctAnswerId": "A",
      "hint": "A puppet army is a Botnet; resource starvation via swarms is DDoS; deceptive camouflage is a Trojan.",
      "docketTag": "SECURITY THREAT"
    },
    {
      "id": "ch2-q5",
      "chapterId": 2,
      "itemNumber": 5,
      "subHeader": "CONNECTION 05 · HAWKINS VERSION CONTROL",
      "question": "Treat Hawkins history as a Git repository. Match each event to its corresponding Git operation.",
      "options": [
        {
          "id": "A",
          "text": "1–git branch, 2–git merge, 3–git commit, 4–git revert"
        },
        {
          "id": "B",
          "text": "1–git clone, 2–git push, 3–git pull, 4–git reset"
        },
        {
          "id": "C",
          "text": "1–git stash, 2–git checkout, 3–git rebase, 4–git cherry-pick"
        },
        {
          "id": "D",
          "text": "1–git init, 2–git remote, 3–git fetch, 4–git diff"
        }
      ],
      "correctAnswerId": "A",
      "hint": "Divergent timeline is a branch; combining is merge; recording snapshot is commit; safe undo is revert.",
      "docketTag": "GIT TOPOLOGY"
    },
    {
      "id": "ch2-q6",
      "chapterId": 2,
      "itemNumber": 6,
      "subHeader": "CONNECTION 06 · THE SEARCH FOR WILL",
      "question": "Match each investigative search strategy used by Hawkins residents to its fundamental algorithm.",
      "options": [
        {
          "id": "A",
          "text": "1–Linear Search, 2–Binary Search, 3–Depth-First Search, 4–Breadth-First Search"
        },
        {
          "id": "B",
          "text": "1–Binary Search, 2–Linear Search, 3–Breadth-First, 4–Depth-First"
        },
        {
          "id": "C",
          "text": "1–Dijkstra, 2–A* Search, 3–Floyd-Warshall, 4–Bellman-Ford"
        },
        {
          "id": "D",
          "text": "1–Quick Select, 2–Merge Search, 3–Jump Search, 4–Interpolation Search"
        }
      ],
      "correctAnswerId": "A",
      "hint": "Step-by-step is Linear; halving sorted items is Binary; going deep is DFS; expanding ripples is BFS.",
      "docketTag": "ALGORITHM MAP"
    },
    {
      "id": "ch2-q7",
      "chapterId": 2,
      "itemNumber": 7,
      "subHeader": "CONNECTION 07 · HOW FAST IS HAWKINS? (TIME COMPLEXITY)",
      "question": "Match each Hawkins computation or operational task to its asymptotic Big-O time complexity.",
      "options": [
        {
          "id": "A",
          "text": "1–O(1), 2–O(n), 3–O(n log n), 4–O(n²)"
        },
        {
          "id": "B",
          "text": "1–O(n), 2–O(1), 3–O(n²), 4–O(n log n)"
        },
        {
          "id": "C",
          "text": "1–O(log n), 2–O(n²), 3–O(2ⁿ), 4–O(n!)"
        },
        {
          "id": "D",
          "text": "1–O(1), 2–O(log n), 3–O(n), 4–O(2ⁿ)"
        }
      ],
      "correctAnswerId": "A",
      "hint": "Instant top-stack access is O(1); scanning list is O(n); divide-and-conquer sort is O(n log n); pairwise pairs is O(n²).",
      "docketTag": "ASYMPTOTICS"
    },
    {
      "id": "ch2-q8",
      "chapterId": 2,
      "itemNumber": 8,
      "subHeader": "CONNECTION 08 · CLASSES OF HAWKINS (OOP PRINCIPLES)",
      "question": "Match each Hawkins scenario to the Object-Oriented Programming (OOP) pillar it demonstrates.",
      "options": [
        {
          "id": "A",
          "text": "1–Inheritance, 2–Polymorphism, 3–Encapsulation, 4–Abstraction"
        },
        {
          "id": "B",
          "text": "1–Abstraction, 2–Encapsulation, 3–Polymorphism, 4–Inheritance"
        },
        {
          "id": "C",
          "text": "1–Polymorphism, 2–Inheritance, 3–Abstraction, 4–Encapsulation"
        },
        {
          "id": "D",
          "text": "1–Coupling, 2–Cohesion, 3–Overloading, 4–Aggregation"
        }
      ],
      "correctAnswerId": "A",
      "hint": "Extending a parent is Inheritance; one method with different forms is Polymorphism; hiding internals is Abstraction.",
      "docketTag": "OOP MATRIX"
    },
    {
      "id": "ch2-q9",
      "chapterId": 2,
      "itemNumber": 9,
      "subHeader": "CONNECTION 09 · HAWKINS OPERATING SYSTEM CONCEPTS",
      "question": "Match each situation among the Hawkins kids to the operating system concurrency concept it exhibits.",
      "options": [
        {
          "id": "A",
          "text": "1–Round Robin, 2–Deadlock, 3–Mutual Exclusion (Mutex), 4–Multithreading"
        },
        {
          "id": "B",
          "text": "1–Paging, 2–Semaphore, 3–Deadlock, 4–Thrashing"
        },
        {
          "id": "C",
          "text": "1–Deadlock, 2–Round Robin, 3–Multithreading, 4–Mutex"
        },
        {
          "id": "D",
          "text": "1–Context Switch, 2–Virtual Memory, 3–Interrupt, 4–Daemon"
        }
      ],
      "correctAnswerId": "A",
      "hint": "Time slice rotation is Round Robin; circular mutual blocking is Deadlock; single access lock is Mutex.",
      "docketTag": "OS PRINCIPLES"
    },
    {
      "id": "ch2-q10",
      "chapterId": 2,
      "itemNumber": 10,
      "subHeader": "CONNECTION 10 · DUSTIN'S MEMORY HIERARCHY",
      "question": "Match Dustin's expedition equipment items to their counterparts in a computer's memory hierarchy.",
      "options": [
        {
          "id": "A",
          "text": "1–Register, 2–Cache, 3–RAM, 4–Hard Disk / SSD"
        },
        {
          "id": "B",
          "text": "1–Cache, 2–Register, 3–Hard Disk, 4–RAM"
        },
        {
          "id": "C",
          "text": "1–RAM, 2–ROM, 3–Cache, 4–Registers"
        },
        {
          "id": "D",
          "text": "1–Virtual Memory, 2–Flash, 3–EEPROM, 4–Optical Disc"
        }
      ],
      "correctAnswerId": "A",
      "hint": "Fastest in-hand is Register; fast buffer is Cache; active temporary is RAM; bulk persistent is Hard Disk.",
      "docketTag": "STORAGE TIERS"
    }
  ],
  "3": [
    {
      "id": "ch3-q1",
      "chapterId": 3,
      "itemNumber": 1,
      "subHeader": "REARRANGE 01 · SCRAMBLED WORD (ALGORITHM)",
      "question": "Hawkins Lab decoder intercept received scrambled letters for a 'step-by-step procedure for solving a computational problem'. Arrange into the correct word.",
      "options": [
        {
          "id": "A",
          "text": "A → L → G → O → R → I → T → H → M (ALGORITHM)"
        },
        {
          "id": "B",
          "text": "L → O → Garithm → A → R (LOGARITHM)"
        },
        {
          "id": "C",
          "text": "M → O → R → T → A → L → I → G → H (MORTALIGH)"
        },
        {
          "id": "D",
          "text": "T → E → L → E → G → R → A → M → S (TELEGRAMS)"
        }
      ],
      "correctAnswerId": "A",
      "hint": "Unscramble TLHIGROMA: It begins with A and defines every automated program.",
      "docketTag": "CIPHER WORD"
    },
    {
      "id": "ch3-q2",
      "chapterId": 3,
      "itemNumber": 2,
      "subHeader": "REARRANGE 02 · SCRAMBLED WORD (RECURSION)",
      "question": "Unscramble the letters describing the core programming technique where a function calls itself repeatedly until reaching a base condition.",
      "options": [
        {
          "id": "A",
          "text": "R → E → C → U → R → S → I → O → N (RECURSION)"
        },
        {
          "id": "B",
          "text": "C → Uursion → R → E → S → O → N (CURSIONER)"
        },
        {
          "id": "C",
          "text": "S → U → C → C → E → S → S → I → O (SUCCESSION)"
        },
        {
          "id": "D",
          "text": "R → E → S → O → U → R → C → I → N (RESOURCING)"
        }
      ],
      "correctAnswerId": "A",
      "hint": "Unscramble ECROSNIRU: Like two mirrors facing each other in the Upside Down.",
      "docketTag": "CIPHER WORD"
    },
    {
      "id": "ch3-q3",
      "chapterId": 3,
      "itemNumber": 3,
      "subHeader": "REARRANGE 03 · SCRAMBLED STATEMENT (PYTHON LOOP)",
      "question": "Arrange the scrambled syntax tokens to construct a valid Python loop header that executes exactly 5 iterations.",
      "options": [
        {
          "id": "A",
          "text": "for → i → in → range → ( → 5 → ) → :"
        },
        {
          "id": "B",
          "text": "range → ( → 5 → ) → for → i → in → :"
        },
        {
          "id": "C",
          "text": "for → in → range → ( → 5 → ) → i → :"
        },
        {
          "id": "D",
          "text": ": → for → i → in → range → 5 → ( → )"
        }
      ],
      "correctAnswerId": "A",
      "hint": "Standard Python loop syntax: 'for <variable> in range(<count>):'",
      "docketTag": "TOKEN SYNTAX"
    },
    {
      "id": "ch3-q4",
      "chapterId": 3,
      "itemNumber": 4,
      "subHeader": "REARRANGE 04 · SCRAMBLED STATEMENT (SQL QUERY)",
      "question": "Arrange these SQL clauses in correct execution sequence to fetch names of characters with power above 5, sorted alphabetically.",
      "options": [
        {
          "id": "A",
          "text": "SELECT name → FROM characters → WHERE power > 5 → ORDER BY name;"
        },
        {
          "id": "B",
          "text": "FROM characters → SELECT name → ORDER BY name; → WHERE power > 5"
        },
        {
          "id": "C",
          "text": "WHERE power > 5 → SELECT name → FROM characters → ORDER BY name;"
        },
        {
          "id": "D",
          "text": "ORDER BY name; → SELECT name → FROM characters → WHERE power > 5"
        }
      ],
      "correctAnswerId": "A",
      "hint": "Standard SQL clause order: SELECT ... FROM ... WHERE ... ORDER BY ...",
      "docketTag": "DATABASE QUERY"
    },
    {
      "id": "ch3-q5",
      "chapterId": 3,
      "itemNumber": 5,
      "subHeader": "REARRANGE 05 · SCRAMBLED CODE (RECURSIVE FACTORIAL)",
      "question": "The lines of this recursive factorial calculation function are jumbled. Arrange them in valid working order. (What does factorial(5) return?)",
      "options": [
        {
          "id": "A",
          "text": "B → C → D → A (Returns 120)"
        },
        {
          "id": "B",
          "text": "A → B → C → D (Returns 0)"
        },
        {
          "id": "C",
          "text": "C → D → B → A (SyntaxError)"
        },
        {
          "id": "D",
          "text": "B → A → C → D (Infinite Recursion)"
        }
      ],
      "correctAnswerId": "A",
      "hint": "Function definition first (B), then base case condition (C) and base return (D), followed by recursive step (A).",
      "docketTag": "PYTHON CODE"
    },
    {
      "id": "ch3-q6",
      "chapterId": 3,
      "itemNumber": 6,
      "subHeader": "REARRANGE 06 · SCRAMBLED CODE (STRING REVERSAL)",
      "question": "Rearrange the lines to build a string-reversing function. (Calling it with 'NWOD' reveals a crucial Upside Down clue!)",
      "options": [
        {
          "id": "A",
          "text": "B → D → C → E → A (reverse('NWOD') reveals 'DOWN')"
        },
        {
          "id": "B",
          "text": "B → C → D → E → A (UnboundLocalError)"
        },
        {
          "id": "C",
          "text": "D → B → E → C → A (NameError)"
        },
        {
          "id": "D",
          "text": "E → D → C → B → A (SyntaxError)"
        }
      ],
      "correctAnswerId": "A",
      "hint": "Initialize empty string accumulator before loop: B, then D, loop C, prepend E, return A.",
      "docketTag": "PYTHON CODE"
    },
    {
      "id": "ch3-q7",
      "chapterId": 3,
      "itemNumber": 7,
      "subHeader": "REARRANGE 07 · SCRAMBLED CODE (SUM OF EVEN NUMBERS)",
      "question": "Arrange the lines so the script calculates the sum of all even numbers from 1 to 10. What is the printed output?",
      "options": [
        {
          "id": "A",
          "text": "B → E → A → D → C (Output: 30)"
        },
        {
          "id": "B",
          "text": "E → B → A → D → C (Output: 20)"
        },
        {
          "id": "C",
          "text": "B → A → E → D → C (SyntaxError)"
        },
        {
          "id": "D",
          "text": "C → B → E → A → D (Output: 0)"
        }
      ],
      "correctAnswerId": "A",
      "hint": "Initialize accumulator B, iterate range E, check modulo A, accumulate D, print total C. 2+4+6+8+10 = 30.",
      "docketTag": "PYTHON CODE"
    },
    {
      "id": "ch3-q8",
      "chapterId": 3,
      "itemNumber": 8,
      "subHeader": "REARRANGE 08 · SCRAMBLED CODE (HTML STRUCTURE)",
      "question": "Arrange the jumbled HTML tags to form a valid document displaying heading 'Hawkins Lab'.",
      "options": [
        {
          "id": "A",
          "text": "C → B → E → D → A (<html> <body> <h1>...</h1> </body> </html>)"
        },
        {
          "id": "B",
          "text": "B → C → E → A → D (Mismatched tags)"
        },
        {
          "id": "C",
          "text": "E → C → B → D → A (Invalid root)"
        },
        {
          "id": "D",
          "text": "C → E → B → D → A (Heading outside body)"
        }
      ],
      "correctAnswerId": "A",
      "hint": "Document root <html> opens first, then <body>, content inside, then </body> and </html> close.",
      "docketTag": "HTML MARKUP"
    },
    {
      "id": "ch3-q9",
      "chapterId": 3,
      "itemNumber": 9,
      "subHeader": "REARRANGE 09 · SCRAMBLED STEPS (GIT BUGFIX WORKFLOW)",
      "question": "Put the professional Git workflow for creating a feature branch, committing fixes, and pushing in correct chronological order.",
      "options": [
        {
          "id": "A",
          "text": "C → E → B → D → A (Clone → Branch → Stage → Commit → Push)"
        },
        {
          "id": "B",
          "text": "C → B → D → E → A (Commit on main before branch)"
        },
        {
          "id": "C",
          "text": "E → C → B → D → A (Branch before clone failure)"
        },
        {
          "id": "D",
          "text": "B → D → A → C → E (Push uninitialized repo)"
        }
      ],
      "correctAnswerId": "A",
      "hint": "First clone repo (C), make branch (E), stage modifications (B), commit message (D), push upstream (A).",
      "docketTag": "DEV WORKFLOW"
    },
    {
      "id": "ch3-q10",
      "chapterId": 3,
      "itemNumber": 10,
      "subHeader": "REARRANGE 10 · SCRAMBLED STEPS (AUTHENTICATION FLOW)",
      "question": "Arrange the chronological steps of a secure client-server user authentication protocol.",
      "options": [
        {
          "id": "A",
          "text": "B → D → C → A → E (Submit → Transmit → Verify Hash → Issue Token → Access Granted)"
        },
        {
          "id": "B",
          "text": "D → B → C → A → E (Transmission before input)"
        },
        {
          "id": "C",
          "text": "B → C → D → A → E (Client-side database comparison)"
        },
        {
          "id": "D",
          "text": "A → B → D → C → E (Token generation before authentication)"
        }
      ],
      "correctAnswerId": "A",
      "hint": "User inputs (B), browser posts (D), backend hashes and checks (C), server issues token (A), client navigates (E).",
      "docketTag": "SECURITY PROTOCOL"
    }
  ],
  "4": [
    {
      "id": "ch4-q1",
      "chapterId": 4,
      "itemNumber": 1,
      "subHeader": "CASE 01 · SUBSTATION SATURATION BREACH",
      "question": "Analyze the incident evidence from Hawkins Power & Light Substation 03. What type of cyber attack caused the total terminal lockout?",
      "options": [
        {
          "id": "A",
          "text": "Distributed Denial of Service (DDoS) Attack"
        },
        {
          "id": "B",
          "text": "SQL Injection Database Exfiltration"
        },
        {
          "id": "C",
          "text": "Cross-Site Scripting (XSS) Session Hijack"
        },
        {
          "id": "D",
          "text": "Ransomware Cryptographic Drive Encryption"
        }
      ],
      "correctAnswerId": "A",
      "hint": "Mass distributed connection flooding that exhausts service resources without attempting authentication is a classic DDoS attack.",
      "docketTag": "INCIDENT REPORT"
    },
    {
      "id": "ch4-q2",
      "chapterId": 4,
      "itemNumber": 2,
      "subHeader": "CASE 02 · ARCADE LEADERBOARD CORRUPTION",
      "question": "Review the database diagnostic dump from the Palace Arcade mainframe. What database integrity constraint was violated?",
      "options": [
        {
          "id": "A",
          "text": "Duplicate Key / Uniqueness Constraint Violation on PRIMARY KEY"
        },
        {
          "id": "B",
          "text": "Foreign Key Referential Cascade Failure"
        },
        {
          "id": "C",
          "text": "Table Schema Drop Cascade Lockout"
        },
        {
          "id": "D",
          "text": "Null Pointer Dereference Exception"
        }
      ],
      "correctAnswerId": "A",
      "hint": "A PRIMARY KEY column strictly enforces uniqueness; inserting an existing key (101) triggers a uniqueness violation.",
      "docketTag": "DATABASE AUDIT"
    },
    {
      "id": "ch4-q3",
      "chapterId": 4,
      "itemNumber": 3,
      "subHeader": "CASE 03 · BYERS WALL CIRCUIT RECONSTRUCTION",
      "question": "Inspect Joyce Byers' living room light grid evidence. What message is being transmitted across the dimensional boundary?",
      "options": [
        {
          "id": "A",
          "text": "\"RUN\" (Warning of imminent Demogorgon wall breach)"
        },
        {
          "id": "B",
          "text": "\"WAR\" (Military alert)"
        },
        {
          "id": "C",
          "text": "\"HURT\" (Eleven status indicator)"
        },
        {
          "id": "D",
          "text": "\"GATE\" (Sublevel 04 coordinate)"
        }
      ],
      "correctAnswerId": "A",
      "hint": "Shift each letter backward by 3 in the alphabet: U->R, X->U, Q->N. The lights spell 'RUN'.",
      "docketTag": "SIGNAL CIPHER"
    },
    {
      "id": "ch4-q4",
      "chapterId": 4,
      "itemNumber": 4,
      "subHeader": "CASE 04 · MUNICIPAL POWER INFRASTRUCTURE COLLAPSE",
      "question": "Based on engineering topology documents, what critical system architecture vulnerability caused the total town blackout?",
      "options": [
        {
          "id": "A",
          "text": "Single Point of Failure (SPOF) Architecture"
        },
        {
          "id": "B",
          "text": "Asynchronous Deadlock Livelock"
        },
        {
          "id": "C",
          "text": "Unbounded Memory Thrashing"
        },
        {
          "id": "D",
          "text": "Byzantine General Consensus Failure"
        }
      ],
      "correctAnswerId": "A",
      "hint": "A system where a single component's failure brings down the entire network suffers from a Single Point of Failure (SPOF).",
      "docketTag": "SYSTEM ARCHITECTURE"
    },
    {
      "id": "ch4-q5",
      "chapterId": 4,
      "itemNumber": 5,
      "subHeader": "CASE 05 · WILL'S TELEMETRY CONCURRENT LINK",
      "question": "Evaluate the Season 2 hospital telemetry logs. What physiological countermeasure severed the Mind Flayer's shared vision?",
      "options": [
        {
          "id": "A",
          "text": "Blindfolding Will and closing his eyes to sever the optical reconnaissance link"
        },
        {
          "id": "B",
          "text": "Administering full-spectrum sedative paralysis"
        },
        {
          "id": "C",
          "text": "Broadcasting high-decibel acoustic interference"
        },
        {
          "id": "D",
          "text": "Lowering room temperature to freezing levels"
        }
      ],
      "correctAnswerId": "A",
      "hint": "Mike realized: 'He's a spy! He can see where they are!' and yelled for everyone to close Will's eyes.",
      "docketTag": "MEDICAL TELEMETRY"
    },
    {
      "id": "ch4-q6",
      "chapterId": 4,
      "itemNumber": 6,
      "subHeader": "CASE 06 · CREEL HOUSE PSYCHIC CURSE ANCHOR",
      "question": "Examine the psychological dossiers of Vecna's victims. What acoustic mechanism allows a captive to escape Vecna's mind lair?",
      "options": [
        {
          "id": "A",
          "text": "Acoustic resonance of favorite personal music via headphones anchoring reality"
        },
        {
          "id": "B",
          "text": "Direct electrical shock to the cerebral cortex"
        },
        {
          "id": "C",
          "text": "Administering high-potency epinephrine injections"
        },
        {
          "id": "D",
          "text": "Reflecting visual laser beams into the pupils"
        }
      ],
      "correctAnswerId": "A",
      "hint": "Favorite music acts as a lifeline, reconnecting the victim's emotional memory to physical reality.",
      "docketTag": "PSYCHIC PHENOMENON"
    },
    {
      "id": "ch4-q7",
      "chapterId": 4,
      "itemNumber": 7,
      "subHeader": "CASE 07 · SUBLEVEL 04 EMERGENCY AIRLOCK",
      "question": "Analyze the boolean sensor telemetry for Hawkins Lab Airlock Door 04. What is the current door status?",
      "options": [
        {
          "id": "A",
          "text": "Door is OPEN (The manual override evaluates the OR condition to True)"
        },
        {
          "id": "B",
          "text": "Door is LOCKED (Missing physical key causes total circuit short)"
        },
        {
          "id": "C",
          "text": "Door is UNPOWERED (Incompatible voltage detected)"
        },
        {
          "id": "D",
          "text": "Door is DESTROYED (Thermal overload triggered)"
        }
      ],
      "correctAnswerId": "A",
      "hint": "In boolean logic, (True AND False) is False, but False OR True evaluates to True. The door unlocks.",
      "docketTag": "CIRCUIT LOGIC"
    },
    {
      "id": "ch4-q8",
      "chapterId": 4,
      "itemNumber": 8,
      "subHeader": "CASE 08 · STARCOURT SUBTERRANEAN LOGISTICS",
      "question": "Investigate delivery manifest records for Starcourt Mall. What disguised mechanism facilitated Soviet subterranean expansion?",
      "options": [
        {
          "id": "A",
          "text": "A disguised deep-shaft hydraulic freight elevator behind mall stockrooms"
        },
        {
          "id": "B",
          "text": "An abandoned coal rail tunnel connected to Cornwallis Quarry"
        },
        {
          "id": "C",
          "text": "A subterranean pneumatic tube canister conduit system"
        },
        {
          "id": "D",
          "text": "A fleet of covert municipal sewage vacuum tankers"
        }
      ],
      "correctAnswerId": "A",
      "hint": "The Scoops Ahoy crew got trapped inside the secret freight elevator as it plummeted deep beneath the mall.",
      "docketTag": "LOGISTICS INQUIRY"
    },
    {
      "id": "ch4-q9",
      "chapterId": 4,
      "itemNumber": 9,
      "subHeader": "CASE 09 · ANOMALY SIGHTING DISTRIBUTION ANALYSIS",
      "question": "Examine the geographic field records of 50 documented paranormal encounters. Which location represents the primary epicenter, and at what percentage?",
      "options": [
        {
          "id": "A",
          "text": "Mirkwood Forest at 40% (Primary epicenter of entity incursions)"
        },
        {
          "id": "B",
          "text": "Hawkins National Laboratory at 30%"
        },
        {
          "id": "C",
          "text": "Starcourt Mall at 20%"
        },
        {
          "id": "D",
          "text": "Hawkins High School at 10%"
        }
      ],
      "correctAnswerId": "A",
      "hint": "20 out of 50 total sightings is exactly 40%, placing Mirkwood Forest as the heaviest concentration.",
      "docketTag": "STATISTICAL AUDIT"
    },
    {
      "id": "ch4-q10",
      "chapterId": 4,
      "itemNumber": 10,
      "subHeader": "CASE 10 · PROJECT NINA SYNAPTIC RESTORATION",
      "question": "Review Dr. Martin Brenner's neurological research dossier. How did Project Nina successfully restore Eleven's lost abilities?",
      "options": [
        {
          "id": "A",
          "text": "Sensory deprivation immersion paired with neuro-playback confronting repressed 1979 trauma"
        },
        {
          "id": "B",
          "text": "Direct surgical implantation of an artificial psychokinetic transceiver"
        },
        {
          "id": "C",
          "text": "High-voltage electroconvulsive therapy sessions"
        },
        {
          "id": "D",
          "text": "Synthetic adrenal hormone infusions"
        }
      ],
      "correctAnswerId": "A",
      "hint": "Project Nina was named after the opera: re-experiencing buried memories in the sensory tank re-ignited her neural circuits.",
      "docketTag": "MEDICAL REPORT"
    }
  ],
  "5": [
    {
      "id": "ch5-q1",
      "chapterId": 5,
      "itemNumber": 1,
      "subHeader": "SIGNAL 01 · CAESAR CIPHER BROADCAST",
      "question": "A high-frequency radio signal pulses encrypted sequence 'UXQ'. Intelligence reports confirm a Caesar cipher with key +3. Decode the carrier message.",
      "options": [
        {
          "id": "A",
          "text": "\"RUN\" (Decoded: U - 3 = R, X - 3 = U, Q - 3 = N)"
        },
        {
          "id": "B",
          "text": "\"WAR\" (Decoded offset +2)"
        },
        {
          "id": "C",
          "text": "\"SOS\" (Decoded frequency)"
        },
        {
          "id": "D",
          "text": "\"BOY\" (Decoded inverted alphabet)"
        }
      ],
      "correctAnswerId": "A",
      "hint": "U becomes R, X becomes U, Q becomes N. The decoded signal is 'RUN'.",
      "docketTag": "RADIO INTERCEPT"
    },
    {
      "id": "ch5-q2",
      "chapterId": 5,
      "itemNumber": 2,
      "subHeader": "SIGNAL 02 · 8-BIT BINARY TELEMETRY",
      "question": "Eleven taps a rhythmic electrical transmission into the Supercom microphone: binary code 01010010. Which ASCII character does this encode?",
      "options": [
        {
          "id": "A",
          "text": "'R' (01010010₂ = 64 + 16 + 2 = 82 = ASCII 'R')"
        },
        {
          "id": "B",
          "text": "'E' (01000101₂ = 69 = ASCII 'E')"
        },
        {
          "id": "C",
          "text": "'L' (01001100₂ = 76 = ASCII 'L')"
        },
        {
          "id": "D",
          "text": "'Z' (01011010₂ = 90 = ASCII 'Z')"
        }
      ],
      "correctAnswerId": "A",
      "hint": "Binary 01010010 = 2^6 + 2^4 + 2^1 = 64 + 16 + 2 = 82. ASCII 82 is uppercase 'R'.",
      "docketTag": "BINARY STREAM"
    },
    {
      "id": "ch5-q3",
      "chapterId": 5,
      "itemNumber": 3,
      "subHeader": "SIGNAL 03 · RUSSIAN ENCRYPTED BROADCAST",
      "question": "Dustin intercepts a looping Russian radio transmission beneath Starcourt Mall. What is the verified English translation of the cipher?",
      "options": [
        {
          "id": "A",
          "text": "\"The week is long. A trip to China sounds nice. If you tread lightly. The silver cat feeds when blue and yellow meet in the West.\""
        },
        {
          "id": "B",
          "text": "\"The night is cold. The winter in Moscow is harsh. The iron bear roars when fire burns in the North.\""
        },
        {
          "id": "C",
          "text": "\"Comrades report to the silo. Open the vault at midnight when the red star rises in the East.\""
        },
        {
          "id": "D",
          "text": "\"Operation Key is underway. Evacuate all personnel before the American police arrive.\""
        }
      ],
      "correctAnswerId": "A",
      "hint": "The message decoded by Robin, Steve, and Dustin talks about the silver cat and blue and yellow hands.",
      "docketTag": "RUSSIAN CIPHER"
    },
    {
      "id": "ch5-q4",
      "chapterId": 5,
      "itemNumber": 4,
      "subHeader": "SIGNAL 04 · MORSE CODE DISTRESS BEACON",
      "question": "A high-frequency buzzer emits rhythmic Morse code pulses: `... --- ...`. What universal distress priority does this broadcast?",
      "options": [
        {
          "id": "A",
          "text": "\"SOS\" (Universal maritime & telegraphic distress code)"
        },
        {
          "id": "B",
          "text": "\"HELP\" (Emergency tactical ping)"
        },
        {
          "id": "C",
          "text": "\"RUN\" (Immediate evacuation warning)"
        },
        {
          "id": "D",
          "text": "\"DIE\" (Subspace anomalous whisper)"
        }
      ],
      "correctAnswerId": "A",
      "hint": "... is S, --- is O, ... is S. It spells SOS.",
      "docketTag": "MORSE LOG"
    },
    {
      "id": "ch5-q5",
      "chapterId": 5,
      "itemNumber": 5,
      "subHeader": "SIGNAL 05 · REVERSE AUDIO PHONOGRAM",
      "question": "Joyce Byers tunes the radio receiver to an analog static channel, capturing a reversed audio whisper. What message is Will communicating?",
      "options": [
        {
          "id": "A",
          "text": "\"RIGHT HERE\" (Will indicating he is in the Upside Down copy of his house)"
        },
        {
          "id": "B",
          "text": "\"GET OUT\" (Warning of Demogorgon advance)"
        },
        {
          "id": "C",
          "text": "\"IT'S COLD\" (Environmental description of the shadow plane)"
        },
        {
          "id": "D",
          "text": "\"HELP ME\" (General distress plea)"
        }
      ],
      "correctAnswerId": "A",
      "hint": "Reversing 'EREH THGIR' yields 'RIGHT HERE'.",
      "docketTag": "AUDIO PHONOGRAM"
    },
    {
      "id": "ch5-q6",
      "chapterId": 5,
      "itemNumber": 6,
      "subHeader": "SIGNAL 06 · HEATHKIT HAM RADIO TRANSCEIVER",
      "question": "Which amateur radio frequency did the boys tune their Heathkit transceiver to when communicating with Mr. Clarke?",
      "options": [
        {
          "id": "A",
          "text": "Heathkit 14.175 MHz (20-Meter Amateur Band)"
        },
        {
          "id": "B",
          "text": "Commercial Broadcast 104.3 MHz"
        },
        {
          "id": "C",
          "text": "Aviation Airband 121.5 MHz"
        },
        {
          "id": "D",
          "text": "Marine VHF Channel 16 (156.8 MHz)"
        }
      ],
      "correctAnswerId": "A",
      "hint": "The Heathkit SB-220 was calibrated to the 14.175 MHz ham radio band.",
      "docketTag": "HAM RADIO"
    },
    {
      "id": "ch5-q7",
      "chapterId": 5,
      "itemNumber": 6,
      "subHeader": "SIGNAL 07 · CEREBRO REPEATER TELEMETRY",
      "question": "What radio communication device did Dustin Henderson assemble on Weathertop to reach his girlfriend Suzie in Utah?",
      "options": [
        {
          "id": "A",
          "text": "Cerebro (High-powered ham radio tower named after X-Men)"
        },
        {
          "id": "B",
          "text": "Supercom Walkie-Talkie Mark IV"
        },
        {
          "id": "C",
          "text": "Motorola Squad Radio Transceiver"
        },
        {
          "id": "D",
          "text": "Hawkins Lab Sublevel Repeater"
        }
      ],
      "correctAnswerId": "A",
      "hint": "Dustin hauled Cerebro up the highest hill in Hawkins to get long-range radio line-of-sight.",
      "docketTag": "CEREBRO LOG"
    },
    {
      "id": "ch5-q8",
      "chapterId": 5,
      "itemNumber": 8,
      "subHeader": "SIGNAL 08 · STARCOURT VAULT ACCESS CIPHER",
      "question": "Suzie transmits the mathematical constant needed as the cryptographic password for the Russian laser vault. What value does she broadcast?",
      "options": [
        {
          "id": "A",
          "text": "6.626070 × 10⁻³⁴ J·s"
        },
        {
          "id": "B",
          "text": "6.626176 × 10⁻³⁴ J·s"
        },
        {
          "id": "C",
          "text": "3.141592 × 10⁰"
        },
        {
          "id": "D",
          "text": "2.997924 × 10⁸ m/s"
        }
      ],
      "correctAnswerId": "A",
      "hint": "Suzie insisted Dustin sing 'Never Ending Story' before providing the exact Planck's constant: 6.626070 × 10⁻³⁴.",
      "docketTag": "VAULT CIPHER"
    },
    {
      "id": "ch5-q9",
      "chapterId": 5,
      "itemNumber": 9,
      "subHeader": "SIGNAL 09 · ELECTROMAGNETIC VECTOR ANOMALY",
      "question": "A compass placed near the radio tower deflects erratically. What physical force causes magnetic needles to stray from true North?",
      "options": [
        {
          "id": "A",
          "text": "Immense artificial electromagnetic field created by the gate opening"
        },
        {
          "id": "B",
          "text": "Dead batteries inside the compass housing"
        },
        {
          "id": "C",
          "text": "Atmospheric solar storm in the upper ionosphere"
        },
        {
          "id": "D",
          "text": "Underground iron ore deposit beneath Mirkwood"
        }
      ],
      "correctAnswerId": "A",
      "hint": "Dustin explains: 'The compass doesn't point to true North; it points to a stronger local magnetic field.'",
      "docketTag": "FLUX TELEMETRY"
    },
    {
      "id": "ch5-q10",
      "chapterId": 5,
      "itemNumber": 10,
      "subHeader": "SIGNAL 10 · SUB-BASIN GATE CONVERGENCE",
      "question": "At the end of Season 4, sub-audible seismic pulses broadcast across municipal radio channels. What catastrophic event do they announce?",
      "options": [
        {
          "id": "A",
          "text": "Four gates converge simultaneously, opening a massive rift across Hawkins"
        },
        {
          "id": "B",
          "text": "A localized natural earthquake along the Wabash fault"
        },
        {
          "id": "C",
          "text": "Starcourt Mall basement explosion"
        },
        {
          "id": "D",
          "text": "Hawkins National Laboratory self-destruct countdown"
        }
      ],
      "correctAnswerId": "A",
      "hint": "Vecna's plan was four kills to open four gates that tear open Hawkins in a cross shape.",
      "docketTag": "SEISMIC SIGNAL"
    }
    ],
  "6": [
    {
      "id": "ch6-q1",
      "chapterId": 6,
      "itemNumber": 1,
      "subHeader": "LAB TASK 01 · LOGICAL SEQUENCE (EXPERIMENT IDS)",
      "question": "Hawkins Lab experiment subject IDs run in sequence: 2, 6, 12, 20, 30, ... What is the next experiment ID in this progression?",
      "options": [
        {
          "id": "A",
          "text": "42 (30 + 12 = 42; formula 6 × 7 = 42)"
        },
        {
          "id": "B",
          "text": "40 (Linear step +10)"
        },
        {
          "id": "C",
          "text": "38 (Decaying rate)"
        },
        {
          "id": "D",
          "text": "48 (Exponential doubling)"
        }
      ],
      "correctAnswerId": "A",
      "hint": "The intervals between numbers increase by 2 each step (+4, +6, +8, +10, +12). 30 + 12 = 42.",
      "docketTag": "LAB SEQUENCE"
    },
    {
      "id": "ch6-q2",
      "chapterId": 6,
      "itemNumber": 2,
      "subHeader": "LAB TASK 02 · BOOLEAN LOGIC CIRCUIT EVALUATION",
      "question": "The Sublevel 04 security gate opens if `(Power = ON AND Key = INSERTED) OR Override = ON`. Power is ON, Key is NOT inserted, Override is ON. Does the gate open?",
      "options": [
        {
          "id": "A",
          "text": "Yes (The expression evaluates to TRUE via the active Override switch)"
        },
        {
          "id": "B",
          "text": "No (The missing key aborts the circuit)"
        },
        {
          "id": "C",
          "text": "Error (Conflicting inputs short-circuit the gate)"
        },
        {
          "id": "D",
          "text": "Undefined (Insufficient voltage detected)"
        }
      ],
      "correctAnswerId": "A",
      "hint": "(True AND False) is False. However, False OR True evaluates to True. The gate opens.",
      "docketTag": "GATE LOGIC"
    },
    {
      "id": "ch6-q3",
      "chapterId": 6,
      "itemNumber": 3,
      "subHeader": "LAB TASK 03 · SYSTEM OPERATIONS (KILL ROGUE PID)",
      "question": "A rogue daemon process with PID 1983 is locking the Hawkins Lab security server. Which UNIX terminal command force-terminates it immediately?",
      "options": [
        {
          "id": "A",
          "text": "kill -9 1983 (Sends SIGKILL signal to forcibly terminate process 1983)"
        },
        {
          "id": "B",
          "text": "stop process 1983"
        },
        {
          "id": "C",
          "text": "delete pid 1983"
        },
        {
          "id": "D",
          "text": "systemctl freeze 1983"
        }
      ],
      "correctAnswerId": "A",
      "hint": "In UNIX systems, 'kill -9 <PID>' issues the non-catchable SIGKILL signal to immediately stop a rogue process.",
      "docketTag": "UNIX TERMINAL"
    },
    {
      "id": "ch6-q4",
      "chapterId": 6,
      "itemNumber": 4,
      "subHeader": "LAB TASK 04 · SYSTEM OPERATIONS (POWER RESTORATION ORDER)",
      "question": "Place the Hawkins Lab power recovery protocol steps in correct operational sequence: (a) turn on lab lights, (b) start backup generator, (c) reset control panel, (d) close main breaker.",
      "options": [
        {
          "id": "A",
          "text": "b → d → c → a (Generator → Main Breaker → Control Panel → Lights)"
        },
        {
          "id": "B",
          "text": "a → b → c → d (Lights first is impossible without power)"
        },
        {
          "id": "C",
          "text": "c → a → b → d (Control panel cannot boot without generator)"
        },
        {
          "id": "D",
          "text": "d → b → a → c (Breaker closed before source risks surge)"
        }
      ],
      "correctAnswerId": "A",
      "hint": "Each step depends on power supplied by the step before it: Generator (b) -> Breaker (d) -> Panel (c) -> Lights (a).",
      "docketTag": "POWER SEQUENCE"
    },
    {
      "id": "ch6-q5",
      "chapterId": 6,
      "itemNumber": 5,
      "subHeader": "LAB TASK 05 · FUNCTION RESTORATION (BUGGY SIGHTING COUNTER)",
      "question": "This telemetry script gives an incorrect count for Demogorgon sightings. Diagnose the bug and select the proper repair.",
      "options": [
        {
          "id": "A",
          "text": "The loop starts at index 1 and skips element 0. Fix: use range(len(sightings)) or sum(sightings)"
        },
        {
          "id": "B",
          "text": "The 'total' variable should be initialized to -1"
        },
        {
          "id": "C",
          "text": "The return statement must be placed inside the for loop"
        },
        {
          "id": "D",
          "text": "Python requires while loops for array traversal"
        }
      ],
      "correctAnswerId": "A",
      "hint": "range(1, len(sightings)) starts at index 1, completely ignoring the first sighting at index 0.",
      "docketTag": "PYTHON DEBUG"
    },
    {
      "id": "ch6-q6",
      "chapterId": 6,
      "itemNumber": 6,
      "subHeader": "LAB TASK 06 · FUNCTION RESTORATION (INFINITE RECURSION)",
      "question": "Why does this recursive function crash the Hawkins Lab simulation console with a RecursionError?",
      "options": [
        {
          "id": "A",
          "text": "Missing base case! Add 'if n <= 1: return 1' before the recursive return"
        },
        {
          "id": "B",
          "text": "Python cannot perform multiplication inside a return statement"
        },
        {
          "id": "C",
          "text": "The function parameter name must be uppercase"
        },
        {
          "id": "D",
          "text": "The function needs an external global variable"
        }
      ],
      "correctAnswerId": "A",
      "hint": "Without a base condition (like if n <= 1: return 1), fact(n) recurses forever until stack overflow.",
      "docketTag": "RECURSION BUG"
    },
    {
      "id": "ch6-q7",
      "chapterId": 6,
      "itemNumber": 7,
      "subHeader": "LAB TASK 07 · DATA ANALYSIS (LIGHT FLICKER METRICS)",
      "question": "Substation bulb flickers recorded Monday to Friday: 3, 5, 4, 12, 6. Compute the Mean, Median, and identify the statistical Outlier.",
      "options": [
        {
          "id": "A",
          "text": "Mean = 6, Median = 5, Outlier = 12 (Thursday surge)"
        },
        {
          "id": "B",
          "text": "Mean = 5, Median = 6, Outlier = 3"
        },
        {
          "id": "C",
          "text": "Mean = 7.5, Median = 4, Outlier = 6"
        },
        {
          "id": "D",
          "text": "Mean = 8, Median = 5.5, Outlier = 4"
        }
      ],
      "correctAnswerId": "A",
      "hint": "Sum is 30 / 5 = 6 (mean). In sorted order [3, 4, 5, 6, 12], middle element is 5 (median). 12 is the outlier.",
      "docketTag": "STATISTICS"
    },
    {
      "id": "ch6-q8",
      "chapterId": 6,
      "itemNumber": 8,
      "subHeader": "LAB TASK 08 · DATA ANALYSIS (ZONE PERCENTAGE CONCENTRATION)",
      "question": "Out of 50 total confirmed entity sightings: Forest 20, Lab 15, Mall 10, School 5. Which location has the highest concentration and what percentage?",
      "options": [
        {
          "id": "A",
          "text": "The Forest at 40% (20 out of 50 total events)"
        },
        {
          "id": "B",
          "text": "The Lab at 35%"
        },
        {
          "id": "C",
          "text": "Starcourt Mall at 25%"
        },
        {
          "id": "D",
          "text": "Hawkins School at 15%"
        }
      ],
      "correctAnswerId": "A",
      "hint": "Forest has 20 out of 50 total sightings. (20 / 50) * 100 = 40%.",
      "docketTag": "ZONE ANALYSIS"
    },
    {
      "id": "ch6-q9",
      "chapterId": 6,
      "itemNumber": 9,
      "subHeader": "LAB TASK 09 · SIMULATED EXPERIMENT (TEMPERATURE CORRELATION)",
      "question": "Experimental data records ambient temperature vs. flickers per hour: (20°C: 0), (15°C: 2), (10°C: 5), (5°C: 9). Identify the independent variable, dependent variable, and scientific conclusion.",
      "options": [
        {
          "id": "A",
          "text": "Independent: Temperature; Dependent: Flicker Count; Conclusion: Negative correlation (colder air increases flickers)"
        },
        {
          "id": "B",
          "text": "Independent: Flicker Count; Dependent: Temperature; Conclusion: Flickering lights freeze the room"
        },
        {
          "id": "C",
          "text": "Independent: Time; Dependent: Electricity; Conclusion: Random fluctuations"
        },
        {
          "id": "D",
          "text": "Independent: Pressure; Dependent: Voltage; Conclusion: Direct positive correlation"
        }
      ],
      "correctAnswerId": "A",
      "hint": "We control Temperature (independent variable), which alters Flicker frequency (dependent variable). As temp drops, flickers rise (negative correlation).",
      "docketTag": "EXPERIMENT LOG"
    },
    {
      "id": "ch6-q10",
      "chapterId": 6,
      "itemNumber": 10,
      "subHeader": "LAB TASK 10 · SIMULATED EXPERIMENT (GATE EXPONENTIAL DOUBLING)",
      "question": "Gate energy starts at 2 units at 1:00 AM and doubles every hour (2, 4, 8, 16, 32, ...). At what time does it first exceed 100 energy units?",
      "options": [
        {
          "id": "A",
          "text": "7:00 AM (Energy reaches 128 units, surpassing 100)"
        },
        {
          "id": "B",
          "text": "6:00 AM (Energy is 64 units)"
        },
        {
          "id": "C",
          "text": "8:00 AM (Energy is 256 units)"
        },
        {
          "id": "D",
          "text": "5:00 AM (Energy is 32 units)"
        }
      ],
      "correctAnswerId": "A",
      "hint": "Sequence: 1:00=2, 2:00=4, 3:00=8, 4:00=16, 5:00=32, 6:00=64, 7:00=128. It first exceeds 100 at 7:00 AM.",
      "docketTag": "ENERGY GROWTH"
    }
    ]
};

// Interactive mini-game tasks secrets
export const STORY_TASK_SECRETS: Record<string, { answerPattern: RegExp; points: number; category: string }> = {
  "ch1-quiz": { answerPattern: /^A$/i, points: 200, category: "tech" },
  "town-1": { answerPattern: /^(A|86-04|mkultra|1983)$/i, points: 200, category: "tech" },
  "ch2-police": { answerPattern: /^(A|radio-tower|east-hill)$/i, points: 200, category: "clue" },
  "ch3-byers": { answerPattern: /^DO\s*NOT\s*OPEN\s*THE\s*GATE$/i, points: 200, category: "puzzle" },
  "ch4-lab": { answerPattern: /^30$/i, points: 200, category: "tech" },
  "lab-terminal": { answerPattern: /^30$/i, points: 200, category: "tech" },
  "ch5-forest": { answerPattern: /^(417|4-1-7|vector\s*4-1-7)$/i, points: 200, category: "clue" },
  "forest-marks": { answerPattern: /^(417|4-1-7)$/i, points: 200, category: "clue" },
  "ch5-radio-tower": { answerPattern: /^83479$/i, points: 200, category: "puzzle" },
  "ch6-radio-tower": { answerPattern: /^83479$/i, points: 200, category: "puzzle" },
  "gate-unlock": { answerPattern: /^83479$/i, points: 200, category: "puzzle" },
  "ch6-upsidedown": { answerPattern: /^(HENRY\s*CREEL|001|VECNA|PETER\s*BALLARD)$/i, points: 200, category: "story" },
  "ch7-upsidedown": { answerPattern: /^(HENRY\s*CREEL|001|VECNA|PETER\s*BALLARD)$/i, points: 200, category: "story" },
};

export const RADIOMETER_PIN_SECRETS: Record<number, { digit: string; points: number }> = {
  0: { digit: "8", points: 25 },
  1: { digit: "3", points: 25 },
  2: { digit: "4", points: 25 },
  3: { digit: "7", points: 25 },
  4: { digit: "9", points: 25 },
};

export const MASTER_KEYPAD_CODE = "83479";

/**
 * Builds the initial default full chapter list
 */
export function buildDefaultChapters(): ChapterDef[] {
  return CHAPTER_METADATA.map((meta) => ({
    ...meta,
    questions: RAW_CHAPTER_QUESTIONS[meta.id] || [],
  }));
}

/**
 * Sanitizes chapter data for public consumption by stripping `correctAnswerId`
 */
export function sanitizeChapter(chapter: ChapterDef): SanitizedChapter {
  return {
    ...chapter,
    questions: chapter.questions.map((q) => {
      const { correctAnswerId, ...rest } = q;
      return rest;
    }),
  };
}
