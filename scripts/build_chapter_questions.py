# scripts/build_chapter_questions.py
import json

code = '''// lib/chapterQuestions.ts

export type StageQuestionType =
  | "quiz"          // Stage 1: Quiz-Type Questions (series related q)
  | "connection"    // Stage 2: Connection Questions (matching)
  | "rearrange"     // Stage 3: Rearrange Questions
  | "case_study"    // Stage 4: Case Study Questions
  | "standard"      // Stage 5: As is
  | "radio"         // Stage 6: Radio Transmission
  | "lab_task";     // Stage 7: Lab-Type Tasks

export interface ConnectionPair {
  leftId: string;
  leftText: string;
  rightId: string;
  rightText: string;
}

export interface RearrangeData {
  category: "words" | "statement" | "code" | "steps";
  targetDescription: string;
  tokens: string[];
  correctOrder: string[];
}

export interface CaseStudyData {
  caseTitle: string;
  caseDocket: string;
  incidentBrief: string;
  evidence: string[];
}

export interface RadioData {
  frequency: string;
  callsign: string;
  signalType: "morse" | "binary" | "cipher" | "intercept";
  rawSignal: string;
  cipherHint?: string;
}

export interface LabTaskData {
  labCategory: "sequence" | "system" | "function" | "data" | "simulation";
  terminalPrompt?: string;
  codeSnippet?: string;
  labHint?: string;
}

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
  stageType?: StageQuestionType;
  connectionData?: {
    pairs: ConnectionPair[];
  };
  rearrangeData?: RearrangeData;
  caseStudyData?: CaseStudyData;
  radioData?: RadioData;
  labTaskData?: LabTaskData;
}

export interface StageQuizConfig {
  chapterId: number;
  stageName: string;
  stageType: StageQuestionType;
  stageSubtitle: string;
  docketNumber: string;
  sectionHeader: string;
  points: number;
  questions: QuizQuestion[];
}

export const STAGE_QUIZ_CONFIGS: Record<number, StageQuizConfig> = {
  // ─────────────────────────────────────────────────────────────────
  // STAGE 1: QUIZ-TYPE QUESTIONS (SERIES RELATED TRIVIA)
  // ─────────────────────────────────────────────────────────────────
  1: {
    chapterId: 1,
    stageName: "HAWKINS TOWN",
    stageType: "quiz",
    stageSubtitle: "SERIES LORE & TECHNICAL FOUNDATIONS",
    docketNumber: "FORM HPD-01-83 // CLASSIFIED TELEMETRY DOCKET",
    sectionHeader: "STAGE 01 — QUIZ-TYPE INQUIRY // HAWKINS CHRONICLES",
    points: 50,
    questions: [
      {
        id: "ch1-q1",
        itemNumber: 1,
        stageType: "quiz",
        subHeader: "QUIZ Q1 · D&D CAMPAIGN ROLL",
        question: "In Season 1 Episode 1, what roll did Will need on the twenty-sided die (d20) to successfully cast Fireball against the Demogorgon?",
        options: [
          { id: "A", text: "14 or higher" },
          { id: "B", text: "13 or higher" },
          { id: "C", text: "15 or higher" },
          { id: "D", text: "7 or higher" },
        ],
        correctAnswerId: "B",
        hint: "Will rolled a 7 and said, 'Did the rest of you see that? It got me.' He needed a 13 or higher.",
        docketTag: "D&D LOG",
      },
      {
        id: "ch1-q2",
        itemNumber: 2,
        stageType: "quiz",
        subHeader: "QUIZ Q2 · AV CLUB FACULTY",
        question: "What is the full name of Hawkins Middle School's science teacher who runs the A.V. Club?",
        options: [
          { id: "A", text: "Scott A. Clarke" },
          { id: "B", text: "Arthur C. Clarke" },
          { id: "C", text: "Robert A. Clarke" },
          { id: "D", text: "Richard M. Clarke" },
        ],
        correctAnswerId: "A",
        hint: "Mr. Clarke is known for his enthusiastic support and Heathkit ham radio demonstrations.",
        docketTag: "FACULTY DOSSIER",
      },
      {
        id: "ch1-q3",
        itemNumber: 3,
        stageType: "quiz",
        subHeader: "QUIZ Q3 · SENSORY DEPRIVATION POOL",
        question: "How much salt did Mr. Clarke calculate was required for the improvised sensory deprivation pool in the gym?",
        options: [
          { id: "A", text: "1,500 lb" },
          { id: "B", text: "1,200 lb" },
          { id: "C", text: "800 lb" },
          { id: "D", text: "1,000 lb" },
        ],
        correctAnswerId: "B",
        hint: "Dustin called Mr. Clarke late at night while he was watching 'The Thing from Another World'.",
        docketTag: "PHYSICS CALC",
      },
      {
        id: "ch1-q4",
        itemNumber: 4,
        stageType: "quiz",
        subHeader: "QUIZ Q4 · CASSETTE MIXTAPE",
        question: "Which iconic Clash song does Jonathan play on cassette in Will's room to bond over music?",
        options: [
          { id: "A", text: "\"Should I Stay or Should I Go\"" },
          { id: "B", text: "\"Atmosphere\"" },
          { id: "C", text: "\"Running Up That Hill\"" },
          { id: "D", text: "\"Elegia\"" },
        ],
        correctAnswerId: "A",
        hint: "Will later sings this song to stay grounded while trapped in the Upside Down.",
        docketTag: "AUDIO EVIDENCE",
      },
      {
        id: "ch1-q5",
        itemNumber: 5,
        stageType: "quiz",
        subHeader: "QUIZ Q5 · BENNY'S BURGERS",
        question: "What is the name of the kind diner owner who discovers Eleven and offers her food after her escape?",
        options: [
          { id: "A", text: "Gary Hammond" },
          { id: "B", text: "Earl Benny" },
          { id: "C", text: "Benny Hammond" },
          { id: "D", text: "Benny Baker" },
        ],
        correctAnswerId: "C",
        hint: "He owned Benny's Burgers and gave her fresh burgers before DOE agents arrived.",
        docketTag: "WITNESS LOG",
      },
      {
        id: "ch1-q6",
        itemNumber: 6,
        stageType: "quiz",
        subHeader: "QUIZ Q6 · MORGUE AUTOPSY REVELATION",
        question: "What material does Chief Hopper discover stuffed inside Will's decoy body in the Hawkins morgue?",
        options: [
          { id: "A", text: "Dry Wood Sawdust" },
          { id: "B", text: "Foam Batting and Cotton" },
          { id: "C", text: "Shredded Lab Paper" },
          { id: "D", text: "Polyfill Synthetic Stuffing" },
        ],
        correctAnswerId: "D",
        hint: "Hopper cut open the torso seam with a pocket knife, confirming the state troopers planted a dummy.",
        docketTag: "CORONER REPORT",
      },
      {
        id: "ch1-q7",
        itemNumber: 7,
        stageType: "quiz",
        subHeader: "QUIZ Q7 · PALACE ARCADE RECORD",
        question: "What Dig Dug high score does Max Mayfield achieve at the Palace Arcade under the handle 'MADMAX'?",
        options: [
          { id: "A", text: "651,990" },
          { id: "B", text: "751,300" },
          { id: "C", text: "850,220" },
          { id: "D", text: "900,100" },
        ],
        correctAnswerId: "B",
        hint: "Dustin was shocked to find his previous top score dethroned by MADMAX.",
        docketTag: "ARCADE TELEMETRY",
      },
      {
        id: "ch1-q8",
        itemNumber: 8,
        stageType: "quiz",
        subHeader: "QUIZ Q8 · DEMODOG DIET",
        question: "What specific candy bar does Dustin feed Dart the juvenile Demodog to domesticate it?",
        options: [
          { id: "A", text: "Three Musketeers" },
          { id: "B", text: "Snickers" },
          { id: "C", text: "Baby Ruth" },
          { id: "D", text: "Butterfinger" },
        ],
        correctAnswerId: "A",
        hint: "Dustin gave Dart the chocolate bar in his bedroom terrarium, calling it 'nougat'.",
        docketTag: "SPECIMEN LOG",
      },
      {
        id: "ch1-q9",
        itemNumber: 9,
        stageType: "quiz",
        subHeader: "QUIZ Q9 · LAB SECURITY REBOOT",
        question: "Which programming language does Bob Newby use on Hawkins Lab's terminals to override the security door lockouts?",
        options: [
          { id: "A", text: "Fortran" },
          { id: "B", text: "COBOL" },
          { id: "C", text: "BASIC" },
          { id: "D", text: "C++" },
        ],
        correctAnswerId: "C",
        hint: "Bob founded the Hawkins Middle AV Club and remarked that he learned BASIC for computer engineering.",
        docketTag: "SYSTEM LOG",
      },
      {
        id: "ch1-q10",
        itemNumber: 10,
        stageType: "quiz",
        subHeader: "QUIZ Q10 · LAB INHIBITOR IMPLANT",
        question: "What is the name of the miniature psychokinetic inhibitor capsule surgically implanted into Henry Creel (001)?",
        options: [
          { id: "A", text: "Project MK-Tracker" },
          { id: "B", text: "Soteria" },
          { id: "C", text: "Cerberus" },
          { id: "D", text: "Promethium" },
        ],
        correctAnswerId: "B",
        hint: "Eleven used her telekinesis to rip the Soteria chip out of Henry's neck in 1979.",
        docketTag: "LAB DOSSIER",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // STAGE 2: CONNECTION QUESTIONS (MATCHING RELATIONSHIPS)
  // ─────────────────────────────────────────────────────────────────
  2: {
    chapterId: 2,
    stageName: "HAWKINS LAB",
    stageType: "connection",
    stageSubtitle: "MATCHING TELEMETRY & RELATIONSHIP MATRICES",
    docketNumber: "FORM HPD-02-83 // CLASSIFIED LAB CONNECTION DOCKET",
    sectionHeader: "STAGE 02 — CONNECTION MATRICES // CORRELATE RELATIONSHIPS",
    points: 50,
    questions: [
      {
        id: "ch2-q1",
        itemNumber: 1,
        stageType: "connection",
        subHeader: "CONNECTION 01 · HAWKINS BY THE NUMBERS",
        question: "Match each Stranger Things number in Column A to its matching converted computer value in Column B.",
        connectionData: {
          pairs: [
            { leftId: "1", leftText: "Eleven's number (decimal 11)", rightId: "b", rightText: "1011 (binary)" },
            { leftId: "2", leftText: "Eight + One (8 + 1 = 9)", rightId: "d", rightText: "1001 (binary)" },
            { leftId: "3", leftText: "Year Season 1 is set (1983)", rightId: "c", rightText: "7BF (hexadecimal)" },
            { leftId: "4", leftText: "Eight × Eleven (8 × 11 = 88)", rightId: "a", rightText: "58 (hexadecimal)" },
          ],
        },
        options: [
          { id: "A", text: "1–b, 2–d, 3–c, 4–a (11 = 1011₂, 9 = 1001₂, 1983 = 7BF₁₆, 88 = 58₁₆)" },
          { id: "B", text: "1–a, 2–b, 3–c, 4–d (Direct ascending map)" },
          { id: "C", text: "1–c, 2–a, 3–d, 4–b (Inverted hexadecimal map)" },
          { id: "D", text: "1–d, 2–b, 3–a, 4–c (Binary inverted offset)" },
        ],
        correctAnswerId: "A",
        hint: "11 in binary is 8+2+1 = 1011₂. 9 in binary is 8+1 = 1001₂. 1983 in hex is 7BF₁₆.",
        docketTag: "NUMERIC MATRIX",
      },
      {
        id: "ch2-q2",
        itemNumber: 2,
        stageType: "connection",
        subHeader: "CONNECTION 02 · GATES OF THE UPSIDE DOWN",
        question: "Match each Hawkins operational situation to the logic gate that governs its exact behavior.",
        connectionData: {
          pairs: [
            { leftId: "1", leftText: "Lab vault opens ONLY if keycard is valid AND fingerprint is valid", rightId: "e", rightText: "AND Gate" },
            { leftId: "2", leftText: "Max is saved if her song plays OR her friends reach her (or both)", rightId: "c", rightText: "OR Gate" },
            { leftId: "3", leftText: "Whatever is true in Hawkins is exactly reversed in the Upside Down", rightId: "d", rightText: "NOT Gate" },
            { leftId: "4", leftText: "Walkie-talkie: message heard only if exactly ONE transmits (both or none fails)", rightId: "b", rightText: "XOR Gate" },
          ],
        },
        options: [
          { id: "A", text: "1–AND, 2–OR, 3–NOT, 4–XOR" },
          { id: "B", text: "1–NAND, 2–NOR, 3–XNOR, 4–AND" },
          { id: "C", text: "1–OR, 2–AND, 3–XOR, 4–NOT" },
          { id: "D", text: "1–XOR, 2–NOT, 3–AND, 4–OR" },
        ],
        correctAnswerId: "A",
        hint: "Exclusive choice is XOR; inversion is NOT; simultaneous required conditions is AND.",
        docketTag: "BOOLEAN LOGIC",
      },
      {
        id: "ch2-q3",
        itemNumber: 3,
        stageType: "connection",
        subHeader: "CONNECTION 03 · HAWKINS DATA STRUCTURES",
        question: "Match each town scenario to the computer science data structure it mirrors.",
        connectionData: {
          pairs: [
            { leftId: "1", leftText: "Crawling into narrow tunnel: last to enter is first to leave", rightId: "d", rightText: "Stack (LIFO)" },
            { leftId: "2", leftText: "Kids line up at Scoops Ahoy: first arrived is first served", rightId: "b", rightText: "Queue (FIFO)" },
            { leftId: "3", leftText: "Lab command hierarchy: Brenner at top, researchers, subjects", rightId: "e", rightText: "Tree (Hierarchical)" },
            { leftId: "4", leftText: "Lab, Mall, School, Byers house with roads in every direction", rightId: "a", rightText: "Graph (Nodes & Edges)" },
          ],
        },
        options: [
          { id: "A", text: "1–Stack, 2–Queue, 3–Tree, 4–Graph" },
          { id: "B", text: "1–Queue, 2–Stack, 3–Array, 4–Tree" },
          { id: "C", text: "1–Graph, 2–Tree, 3–Stack, 4–Queue" },
          { id: "D", text: "1–Array, 2–Linked List, 3–Binary Tree, 4–Heap" },
        ],
        correctAnswerId: "A",
        hint: "Last-in First-out is Stack; First-in First-out is Queue; Networks of arbitrary connections are Graphs.",
        docketTag: "STRUCTURE MAP",
      },
      {
        id: "ch2-q4",
        itemNumber: 4,
        stageType: "connection",
        subHeader: "CONNECTION 04 · MIND FLAYER VS CYBERSECURITY",
        question: "Match each Hawkins threat vector to the cyber attack classification it exemplifies.",
        connectionData: {
          pairs: [
            { leftId: "1", leftText: "Mind Flayer remotely controls hundreds of townspeople on its command", rightId: "c", rightText: "Botnet" },
            { leftId: "2", leftText: "Demodogs swarm Hawkins in such numbers that town defenses collapse", rightId: "e", rightText: "DDoS Attack" },
            { leftId: "3", leftText: "Secret Russian base disguised beneath an ordinary shopping mall", rightId: "d", rightText: "Trojan Horse" },
            { leftId: "4", leftText: "Vecna silently reads victims' memories and trauma without their realization", rightId: "b", rightText: "Spyware" },
          ],
        },
        options: [
          { id: "A", text: "1–Botnet, 2–DDoS Attack, 3–Trojan Horse, 4–Spyware" },
          { id: "B", text: "1–Ransomware, 2–Phishing, 3–Spyware, 4–Botnet" },
          { id: "C", text: "1–Trojan Horse, 2–Botnet, 3–DDoS, 4–Ransomware" },
          { id: "D", text: "1–Man-in-the-Middle, 2–Zero Day, 3–Rootkit, 4–Worm" },
        ],
        correctAnswerId: "A",
        hint: "A puppet army is a Botnet; resource starvation via swarms is DDoS; deceptive camouflage is a Trojan.",
        docketTag: "SECURITY THREAT",
      },
      {
        id: "ch2-q5",
        itemNumber: 5,
        stageType: "connection",
        subHeader: "CONNECTION 05 · HAWKINS VERSION CONTROL",
        question: "Treat Hawkins history as a Git repository. Match each event to its corresponding Git operation.",
        connectionData: {
          pairs: [
            { leftId: "1", leftText: "The Upside Down: parallel version of Hawkins evolving separately", rightId: "d", rightText: "git branch" },
            { leftId: "2", leftText: "Bringing parallel world changes back into the main timeline", rightId: "e", rightText: "git merge" },
            { leftId: "3", leftText: "Saving a milestone snapshot of Hawkins with a note describing it", rightId: "a", rightText: "git commit" },
            { leftId: "4", leftText: "Undoing a disaster by adding a new change that reverses it with history intact", rightId: "c", rightText: "git revert" },
          ],
        },
        options: [
          { id: "A", text: "1–git branch, 2–git merge, 3–git commit, 4–git revert" },
          { id: "B", text: "1–git clone, 2–git push, 3–git pull, 4–git reset" },
          { id: "C", text: "1–git stash, 2–git checkout, 3–git rebase, 4–git cherry-pick" },
          { id: "D", text: "1–git init, 2–git remote, 3–git fetch, 4–git diff" },
        ],
        correctAnswerId: "A",
        hint: "Divergent timeline is a branch; combining is merge; recording snapshot is commit; safe undo is revert.",
        docketTag: "GIT TOPOLOGY",
      },
      {
        id: "ch2-q6",
        itemNumber: 6,
        stageType: "connection",
        subHeader: "CONNECTION 06 · THE SEARCH FOR WILL",
        question: "Match each investigative search strategy used by Hawkins residents to its fundamental algorithm.",
        connectionData: {
          pairs: [
            { leftId: "1", leftText: "Hopper checks every house on list, one after another from the first", rightId: "d", rightText: "Linear Search" },
            { leftId: "2", leftText: "Joyce opens sorted list in middle, discards half repeatedly", rightId: "c", rightText: "Binary Search" },
            { leftId: "3", leftText: "Dustin enters tunnel and goes as deep as possible before backtracking", rightId: "b", rightText: "Depth-First Search (DFS)" },
            { leftId: "4", leftText: "Search party spreads in expanding concentric rings at equal distance", rightId: "a", rightText: "Breadth-First Search (BFS)" },
          ],
        },
        options: [
          { id: "A", text: "1–Linear Search, 2–Binary Search, 3–Depth-First Search, 4–Breadth-First Search" },
          { id: "B", text: "1–Binary Search, 2–Linear Search, 3–Breadth-First, 4–Depth-First" },
          { id: "C", text: "1–Dijkstra, 2–A* Search, 3–Floyd-Warshall, 4–Bellman-Ford" },
          { id: "D", text: "1–Quick Select, 2–Merge Search, 3–Jump Search, 4–Interpolation Search" },
        ],
        correctAnswerId: "A",
        hint: "Step-by-step is Linear; halving sorted items is Binary; going deep is DFS; expanding ripples is BFS.",
        docketTag: "ALGORITHM MAP",
      },
      {
        id: "ch2-q7",
        itemNumber: 7,
        stageType: "connection",
        subHeader: "CONNECTION 07 · HOW FAST IS HAWKINS? (TIME COMPLEXITY)",
        question: "Match each Hawkins computation or operational task to its asymptotic Big-O time complexity.",
        connectionData: {
          pairs: [
            { leftId: "1", leftText: "Taking the top card from Hellfire Club's deck", rightId: "d", rightText: "O(1) Constant" },
            { leftId: "2", leftText: "Reading each of n pages in a notebook exactly once", rightId: "e", rightText: "O(n) Linear" },
            { leftId: "3", leftText: "Sorting all n trading cards using merge sort", rightId: "c", rightText: "O(n log n) Log-Linear" },
            { leftId: "4", leftText: "Every one of n party members compares notes with every other member", rightId: "a", rightText: "O(n²) Quadratic" },
          ],
        },
        options: [
          { id: "A", text: "1–O(1), 2–O(n), 3–O(n log n), 4–O(n²)" },
          { id: "B", text: "1–O(n), 2–O(1), 3–O(n²), 4–O(n log n)" },
          { id: "C", text: "1–O(log n), 2–O(n²), 3–O(2ⁿ), 4–O(n!)" },
          { id: "D", text: "1–O(1), 2–O(log n), 3–O(n), 4–O(2ⁿ)" },
        ],
        correctAnswerId: "A",
        hint: "Instant top-stack access is O(1); scanning list is O(n); divide-and-conquer sort is O(n log n); pairwise pairs is O(n²).",
        docketTag: "ASYMPTOTICS",
      },
      {
        id: "ch2-q8",
        itemNumber: 8,
        stageType: "connection",
        subHeader: "CONNECTION 08 · CLASSES OF HAWKINS (OOP PRINCIPLES)",
        question: "Match each Hawkins scenario to the Object-Oriented Programming (OOP) pillar it demonstrates.",
        connectionData: {
          pairs: [
            { leftId: "1", leftText: "Eleven and Kali both inherit base class 'TestSubject' and add powers", rightId: "c", rightText: "Inheritance" },
            { leftId: "2", leftText: "attack() produces bite for Demogorgon, curse for Vecna", rightId: "d", rightText: "Polymorphism" },
            { leftId: "3", leftText: "Brenner's files accessed only via getters; internal raw data hidden", rightId: "b", rightText: "Encapsulation" },
            { leftId: "4", leftText: "Dustin tunes Cerebro with simple knobs without internal radio physics", rightId: "a", rightText: "Abstraction" },
          ],
        },
        options: [
          { id: "A", text: "1–Inheritance, 2–Polymorphism, 3–Encapsulation, 4–Abstraction" },
          { id: "B", text: "1–Abstraction, 2–Encapsulation, 3–Polymorphism, 4–Inheritance" },
          { id: "C", text: "1–Polymorphism, 2–Inheritance, 3–Abstraction, 4–Encapsulation" },
          { id: "D", text: "1–Coupling, 2–Cohesion, 3–Overloading, 4–Aggregation" },
        ],
        correctAnswerId: "A",
        hint: "Extending a parent is Inheritance; one method with different forms is Polymorphism; hiding internals is Abstraction.",
        docketTag: "OOP MATRIX",
      },
      {
        id: "ch2-q9",
        itemNumber: 9,
        stageType: "connection",
        subHeader: "CONNECTION 09 · HAWKINS OPERATING SYSTEM CONCEPTS",
        question: "Match each situation among the Hawkins kids to the operating system concurrency concept it exhibits.",
        connectionData: {
          pairs: [
            { leftId: "1", leftText: "Kids share one walkie, each getting it for 2 minutes in fixed rotation", rightId: "d", rightText: "Round Robin Scheduling" },
            { leftId: "2", leftText: "Mike holds compass waiting for walkie; Dustin holds walkie waiting for compass", rightId: "e", rightText: "Deadlock (Hold & Wait)" },
            { leftId: "3", leftText: "Only one person may press radio transmit button at a time", rightId: "b", rightText: "Mutual Exclusion (Mutex)" },
            { leftId: "4", leftText: "Nancy tracks monster while Jonathan searches town simultaneously", rightId: "c", rightText: "Multithreading" },
          ],
        },
        options: [
          { id: "A", text: "1–Round Robin, 2–Deadlock, 3–Mutual Exclusion (Mutex), 4–Multithreading" },
          { id: "B", text: "1–Paging, 2–Semaphore, 3–Deadlock, 4–Thrashing" },
          { id: "C", text: "1–Deadlock, 2–Round Robin, 3–Multithreading, 4–Mutex" },
          { id: "D", text: "1–Context Switch, 2–Virtual Memory, 3–Interrupt, 4–Daemon" },
        ],
        correctAnswerId: "A",
        hint: "Time slice rotation is Round Robin; circular mutual blocking is Deadlock; single access lock is Mutex.",
        docketTag: "OS PRINCIPLES",
      },
      {
        id: "ch2-q10",
        itemNumber: 10,
        stageType: "connection",
        subHeader: "CONNECTION 10 · DUSTIN'S MEMORY HIERARCHY",
        question: "Match Dustin's expedition equipment items to their counterparts in a computer's memory hierarchy.",
        connectionData: {
          pairs: [
            { leftId: "1", leftText: "Compass in hand: instant access, holding almost nothing", rightId: "c", rightText: "CPU Register" },
            { leftId: "2", leftText: "Belt pouch: very quick to reach, holding high-frequency items", rightId: "e", rightText: "CPU Cache (L1/L2)" },
            { leftId: "3", leftText: "Backpack: holds active mission assets, cleared when mission ends", rightId: "a", rightText: "RAM (Volatile Memory)" },
            { leftId: "4", leftText: "Lab basement archive: huge, permanent, slow to retrieve", rightId: "b", rightText: "Hard Disk / SSD Storage" },
          ],
        },
        options: [
          { id: "A", text: "1–Register, 2–Cache, 3–RAM, 4–Hard Disk / SSD" },
          { id: "B", text: "1–Cache, 2–Register, 3–Hard Disk, 4–RAM" },
          { id: "C", text: "1–RAM, 2–ROM, 3–Cache, 4–Registers" },
          { id: "D", text: "1–Virtual Memory, 2–Flash, 3–EEPROM, 4–Optical Disc" },
        ],
        correctAnswerId: "A",
        hint: "Fastest in-hand is Register; fast buffer is Cache; active temporary is RAM; bulk persistent is Hard Disk.",
        docketTag: "STORAGE TIERS",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // STAGE 3: REARRANGE QUESTIONS (WORDS, STATEMENTS, CODE & STEPS)
  // ─────────────────────────────────────────────────────────────────
  3: {
    chapterId: 3,
    stageName: "BYERS HOUSE",
    stageType: "rearrange",
    stageSubtitle: "SEQUENCE RECONSTRUCTION & SCRAMBLED DATA",
    docketNumber: "FORM HPD-03-83 // CLASSIFIED REARRANGE DOCKET",
    sectionHeader: "STAGE 03 — REARRANGE TOKENS // RECONSTRUCT SCRAMBLED ARTIFACTS",
    points: 50,
    questions: [
      {
        id: "ch3-q1",
        itemNumber: 1,
        stageType: "rearrange",
        subHeader: "REARRANGE 01 · SCRAMBLED WORD (ALGORITHM)",
        question: "Hawkins Lab decoder intercept received scrambled letters for a 'step-by-step procedure for solving a computational problem'. Arrange into the correct word.",
        rearrangeData: {
          category: "words",
          targetDescription: "Step-by-step problem-solving procedure",
          tokens: ["T", "L", "H", "I", "G", "R", "O", "M", "A"],
          correctOrder: ["A", "L", "G", "O", "R", "I", "T", "H", "M"],
        },
        options: [
          { id: "A", text: "A → L → G → O → R → I → T → H → M (ALGORITHM)" },
          { id: "B", text: "L → O → Garithm → A → R (LOGARITHM)" },
          { id: "C", text: "M → O → R → T → A → L → I → G → H (MORTALIGH)" },
          { id: "D", text: "T → E → L → E → G → R → A → M → S (TELEGRAMS)" },
        ],
        correctAnswerId: "A",
        hint: "Unscramble TLHIGROMA: It begins with A and defines every automated program.",
        docketTag: "CIPHER WORD",
      },
      {
        id: "ch3-q2",
        itemNumber: 2,
        stageType: "rearrange",
        subHeader: "REARRANGE 02 · SCRAMBLED WORD (RECURSION)",
        question: "Unscramble the letters describing the core programming technique where a function calls itself repeatedly until reaching a base condition.",
        rearrangeData: {
          category: "words",
          targetDescription: "Programming technique of self-calling functions",
          tokens: ["E", "C", "R", "O", "S", "N", "I", "R", "U"],
          correctOrder: ["R", "E", "C", "U", "R", "S", "I", "O", "N"],
        },
        options: [
          { id: "A", text: "R → E → C → U → R → S → I → O → N (RECURSION)" },
          { id: "B", text: "C → Uursion → R → E → S → O → N (CURSIONER)" },
          { id: "C", text: "S → U → C → C → E → S → S → I → O (SUCCESSION)" },
          { id: "D", text: "R → E → S → O → U → R → C → I → N (RESOURCING)" },
        ],
        correctAnswerId: "A",
        hint: "Unscramble ECROSNIRU: Like two mirrors facing each other in the Upside Down.",
        docketTag: "CIPHER WORD",
      },
      {
        id: "ch3-q3",
        itemNumber: 3,
        stageType: "rearrange",
        subHeader: "REARRANGE 03 · SCRAMBLED STATEMENT (PYTHON LOOP)",
        question: "Arrange the scrambled syntax tokens to construct a valid Python loop header that executes exactly 5 iterations.",
        rearrangeData: {
          category: "statement",
          targetDescription: "Python loop running 5 times",
          tokens: [":", ")", "5", "(", "for", "range", "i", "in"],
          correctOrder: ["for", "i", "in", "range", "(", "5", ")", ":"],
        },
        options: [
          { id: "A", text: "for → i → in → range → ( → 5 → ) → :" },
          { id: "B", text: "range → ( → 5 → ) → for → i → in → :" },
          { id: "C", text: "for → in → range → ( → 5 → ) → i → :" },
          { id: "D", text: ": → for → i → in → range → 5 → ( → )" },
        ],
        correctAnswerId: "A",
        hint: "Standard Python loop syntax: 'for <variable> in range(<count>):'",
        docketTag: "TOKEN SYNTAX",
      },
      {
        id: "ch3-q4",
        itemNumber: 4,
        stageType: "rearrange",
        subHeader: "REARRANGE 04 · SCRAMBLED STATEMENT (SQL QUERY)",
        question: "Arrange these SQL clauses in correct execution sequence to fetch names of characters with power above 5, sorted alphabetically.",
        rearrangeData: {
          category: "statement",
          targetDescription: "SQL query clause order",
          tokens: ["ORDER BY name;", "FROM characters", "WHERE power > 5", "SELECT name"],
          correctOrder: ["SELECT name", "FROM characters", "WHERE power > 5", "ORDER BY name;"],
        },
        options: [
          { id: "A", text: "SELECT name → FROM characters → WHERE power > 5 → ORDER BY name;" },
          { id: "B", text: "FROM characters → SELECT name → ORDER BY name; → WHERE power > 5" },
          { id: "C", text: "WHERE power > 5 → SELECT name → FROM characters → ORDER BY name;" },
          { id: "D", text: "ORDER BY name; → SELECT name → FROM characters → WHERE power > 5" },
        ],
        correctAnswerId: "A",
        hint: "Standard SQL clause order: SELECT ... FROM ... WHERE ... ORDER BY ...",
        docketTag: "DATABASE QUERY",
      },
      {
        id: "ch3-q5",
        itemNumber: 5,
        stageType: "rearrange",
        subHeader: "REARRANGE 05 · SCRAMBLED CODE (RECURSIVE FACTORIAL)",
        question: "The lines of this recursive factorial calculation function are jumbled. Arrange them in valid working order. (What does factorial(5) return?)",
        rearrangeData: {
          category: "code",
          targetDescription: "Recursive factorial function lines",
          tokens: [
            "A. return n * factorial(n - 1)",
            "B. def factorial(n):",
            "C.     if n == 0:",
            "D.         return 1",
          ],
          correctOrder: [
            "B. def factorial(n):",
            "C.     if n == 0:",
            "D.         return 1",
            "A. return n * factorial(n - 1)",
          ],
        },
        options: [
          { id: "A", text: "B → C → D → A (Returns 120)" },
          { id: "B", text: "A → B → C → D (Returns 0)" },
          { id: "C", text: "C → D → B → A (SyntaxError)" },
          { id: "D", text: "B → A → C → D (Infinite Recursion)" },
        ],
        correctAnswerId: "A",
        hint: "Function definition first (B), then base case condition (C) and base return (D), followed by recursive step (A).",
        docketTag: "PYTHON CODE",
      },
      {
        id: "ch3-q6",
        itemNumber: 6,
        stageType: "rearrange",
        subHeader: "REARRANGE 06 · SCRAMBLED CODE (STRING REVERSAL)",
        question: "Rearrange the lines to build a string-reversing function. (Calling it with 'NWOD' reveals a crucial Upside Down clue!)",
        rearrangeData: {
          category: "code",
          targetDescription: "String reversal algorithm",
          tokens: [
            "A.     return result",
            "B. def reverse(s):",
            "C.     for ch in s:",
            "D.         result = ''",
            "E.         result = ch + result",
          ],
          correctOrder: [
            "B. def reverse(s):",
            "D.     result = ''",
            "C.     for ch in s:",
            "E.         result = ch + result",
            "A.     return result",
          ],
        },
        options: [
          { id: "A", text: "B → D → C → E → A (reverse('NWOD') reveals 'DOWN')" },
          { id: "B", text: "B → C → D → E → A (UnboundLocalError)" },
          { id: "C", text: "D → B → E → C → A (NameError)" },
          { id: "D", text: "E → D → C → B → A (SyntaxError)" },
        ],
        correctAnswerId: "A",
        hint: "Initialize empty string accumulator before loop: B, then D, loop C, prepend E, return A.",
        docketTag: "PYTHON CODE",
      },
      {
        id: "ch3-q7",
        itemNumber: 7,
        stageType: "rearrange",
        subHeader: "REARRANGE 07 · SCRAMBLED CODE (SUM OF EVEN NUMBERS)",
        question: "Arrange the lines so the script calculates the sum of all even numbers from 1 to 10. What is the printed output?",
        rearrangeData: {
          category: "code",
          targetDescription: "Summing even numbers loop",
          tokens: [
            "A.         if i % 2 == 0:",
            "B. total = 0",
            "C. print(total)",
            "D.             total += i",
            "E. for i in range(1, 11):",
          ],
          correctOrder: [
            "B. total = 0",
            "E. for i in range(1, 11):",
            "A.         if i % 2 == 0:",
            "D.             total += i",
            "C. print(total)",
          ],
        },
        options: [
          { id: "A", text: "B → E → A → D → C (Output: 30)" },
          { id: "B", text: "E → B → A → D → C (Output: 20)" },
          { id: "C", text: "B → A → E → D → C (SyntaxError)" },
          { id: "D", text: "C → B → E → A → D (Output: 0)" },
        ],
        correctAnswerId: "A",
        hint: "Initialize accumulator B, iterate range E, check modulo A, accumulate D, print total C. 2+4+6+8+10 = 30.",
        docketTag: "PYTHON CODE",
      },
      {
        id: "ch3-q8",
        itemNumber: 8,
        stageType: "rearrange",
        subHeader: "REARRANGE 08 · SCRAMBLED CODE (HTML STRUCTURE)",
        question: "Arrange the jumbled HTML tags to form a valid document displaying heading 'Hawkins Lab'.",
        rearrangeData: {
          category: "code",
          targetDescription: "Valid HTML document structure",
          tokens: ["A. </html>", "B. <body>", "C. <html>", "D. </body>", "E. <h1>Hawkins Lab</h1>"],
          correctOrder: ["C. <html>", "B. <body>", "E. <h1>Hawkins Lab</h1>", "D. </body>", "A. </html>"],
        },
        options: [
          { id: "A", text: "C → B → E → D → A (<html> <body> <h1>...</h1> </body> </html>)" },
          { id: "B", text: "B → C → E → A → D (Mismatched tags)" },
          { id: "C", text: "E → C → B → D → A (Invalid root)" },
          { id: "D", text: "C → E → B → D → A (Heading outside body)" },
        ],
        correctAnswerId: "A",
        hint: "Document root <html> opens first, then <body>, content inside, then </body> and </html> close.",
        docketTag: "HTML MARKUP",
      },
      {
        id: "ch3-q9",
        itemNumber: 9,
        stageType: "rearrange",
        subHeader: "REARRANGE 09 · SCRAMBLED STEPS (GIT BUGFIX WORKFLOW)",
        question: "Put the professional Git workflow for creating a feature branch, committing fixes, and pushing in correct chronological order.",
        rearrangeData: {
          category: "steps",
          targetDescription: "Git bugfix branch workflow",
          tokens: [
            "A. git push origin fix-lights",
            "B. git add .",
            "C. git clone <repository-url>",
            "D. git commit -m 'Fix flickering lights'",
            "E. git checkout -b fix-lights",
          ],
          correctOrder: [
            "C. git clone <repository-url>",
            "E. git checkout -b fix-lights",
            "B. git add .",
            "D. git commit -m 'Fix flickering lights'",
            "A. git push origin fix-lights",
          ],
        },
        options: [
          { id: "A", text: "C → E → B → D → A (Clone → Branch → Stage → Commit → Push)" },
          { id: "B", text: "C → B → D → E → A (Commit on main before branch)" },
          { id: "C", text: "E → C → B → D → A (Branch before clone failure)" },
          { id: "D", text: "B → D → A → C → E (Push uninitialized repo)" },
        ],
        correctAnswerId: "A",
        hint: "First clone repo (C), make branch (E), stage modifications (B), commit message (D), push upstream (A).",
        docketTag: "DEV WORKFLOW",
      },
      {
        id: "ch3-q10",
        itemNumber: 10,
        stageType: "rearrange",
        subHeader: "REARRANGE 10 · SCRAMBLED STEPS (AUTHENTICATION FLOW)",
        question: "Arrange the chronological steps of a secure client-server user authentication protocol.",
        rearrangeData: {
          category: "steps",
          targetDescription: "Secure login authentication flow",
          tokens: [
            "A. Server generates JWT session token and returns it to client",
            "B. User submits username and password into form",
            "C. Server hashes provided password and verifies against database salt",
            "D. Browser transmits credentials securely over HTTPS to endpoint",
            "E. Client stores token and transitions user to authenticated dashboard",
          ],
          correctOrder: [
            "B. User submits username and password into form",
            "D. Browser transmits credentials securely over HTTPS to endpoint",
            "C. Server hashes provided password and verifies against database salt",
            "A. Server generates JWT session token and returns it to client",
            "E. Client stores token and transitions user to authenticated dashboard",
          ],
        },
        options: [
          { id: "A", text: "B → D → C → A → E (Submit → Transmit → Verify Hash → Issue Token → Access Granted)" },
          { id: "B", text: "D → B → C → A → E (Transmission before input)" },
          { id: "C", text: "B → C → D → A → E (Client-side database comparison)" },
          { id: "D", text: "A → B → D → C → E (Token generation before authentication)" },
        ],
        correctAnswerId: "A",
        hint: "User inputs (B), browser posts (D), backend hashes and checks (C), server issues token (A), client navigates (E).",
        docketTag: "SECURITY PROTOCOL",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // STAGE 4: CASE STUDY QUESTIONS (EVIDENCE & ANOMALY ANALYSIS)
  // ─────────────────────────────────────────────────────────────────
  4: {
    chapterId: 4,
    stageName: "CREEL HOUSE",
    stageType: "case_study",
    stageSubtitle: "INVESTIGATIVE INCIDENT REPORTS & EVIDENCE DOSSIERS",
    docketNumber: "FORM HPD-04-83 // CLASSIFIED CASE STUDY DOCKET",
    sectionHeader: "STAGE 04 — CASE STUDY INQUIRY // EVALUATE PHYSICAL EVIDENCE",
    points: 50,
    questions: [
      {
        id: "ch4-q1",
        itemNumber: 1,
        stageType: "case_study",
        subHeader: "CASE 01 · SUBSTATION SATURATION BREACH",
        question: "Analyze the incident evidence from Hawkins Power & Light Substation 03. What type of cyber attack caused the total terminal lockout?",
        caseStudyData: {
          caseTitle: "INCIDENT DOSSIER: SUBSTATION GATEWAY CRASH",
          caseDocket: "CASE #83-HPD-0104",
          incidentBrief: "At 02:14 EST, Roane County Substation 03 abruptly ceased dispatching telemetry to the municipal grid. Dispatchers experienced severe input lag followed by fatal connection termination.",
          evidence: [
            "Over 120,000 SYN connection packets flooded port 443 within a 4-second burst window.",
            "Zero cryptographic authentication attempts logged; source IP packets exhibited spoofed distributed origins across national subnets.",
            "CPU utilization spiked to 100%, exhausting connection pool sockets and leaving valid lineman terminals completely starved of bandwidth.",
          ],
        },
        options: [
          { id: "A", text: "Distributed Denial of Service (DDoS) Attack" },
          { id: "B", text: "SQL Injection Database Exfiltration" },
          { id: "C", text: "Cross-Site Scripting (XSS) Session Hijack" },
          { id: "D", text: "Ransomware Cryptographic Drive Encryption" },
        ],
        correctAnswerId: "A",
        hint: "Mass distributed connection flooding that exhausts service resources without attempting authentication is a classic DDoS attack.",
        docketTag: "INCIDENT REPORT",
      },
      {
        id: "ch4-q2",
        itemNumber: 2,
        stageType: "case_study",
        subHeader: "CASE 02 · ARCADE LEADERBOARD CORRUPTION",
        question: "Review the database diagnostic dump from the Palace Arcade mainframe. What database integrity constraint was violated?",
        caseStudyData: {
          caseTitle: "ARCADE LEADERBOARD TELEMETRY FAILURE",
          caseDocket: "CASE #84-ARC-7721",
          incidentBrief: "During the November high-score update on the Dig Dug machine, attempts to write Max's score '751,300' caused the arcade relational database engine to throw a fatal execution rollback.",
          evidence: [
            "Table schema specifies: `CREATE TABLE high_scores (player_id INT PRIMARY KEY, initials VARCHAR(6), score INT);`",
            "Dustin's record exists at `player_id = 101` with initials 'DUSTIN'.",
            "The update transaction attempted: `INSERT INTO high_scores VALUES (101, 'MADMAX', 751300);`",
          ],
        },
        options: [
          { id: "A", text: "Duplicate Key / Uniqueness Constraint Violation on PRIMARY KEY" },
          { id: "B", text: "Foreign Key Referential Cascade Failure" },
          { id: "C", text: "Table Schema Drop Cascade Lockout" },
          { id: "D", text: "Null Pointer Dereference Exception" },
        ],
        correctAnswerId: "A",
        hint: "A PRIMARY KEY column strictly enforces uniqueness; inserting an existing key (101) triggers a uniqueness violation.",
        docketTag: "DATABASE AUDIT",
      },
      {
        id: "ch4-q3",
        itemNumber: 3,
        stageType: "case_study",
        subHeader: "CASE 03 · BYERS WALL CIRCUIT RECONSTRUCTION",
        question: "Inspect Joyce Byers' living room light grid evidence. What message is being transmitted across the dimensional boundary?",
        caseStudyData: {
          caseTitle: "ELECTROMAGNETIC BULB INTERFERENCE ANALYSIS",
          caseDocket: "CASE #83-BYR-1106",
          incidentBrief: "Twenty-six incandescent bulbs were labeled A through Z. During an intense electromagnetic manifestation, three bulbs pulsed in steady sequence: U, then X, then Q.",
          evidence: [
            "AV Club frequency analysis revealed a consistent Caesar cipher shift of +3 introduced by dimensional refraction.",
            "Transformation formula: Ciphertext Letter Index minus 3 equals True Decoded Character.",
            "U (index 21 - 3 = 18 -> R); X (index 24 - 3 = 21 -> U); Q (index 17 - 3 = 14 -> N).",
          ],
        },
        options: [
          { id: "A", text: "\"RUN\" (Warning of imminent Demogorgon wall breach)" },
          { id: "B", text: "\"WAR\" (Military alert)" },
          { id: "C", text: "\"HURT\" (Eleven status indicator)" },
          { id: "D", text: "\"GATE\" (Sublevel 04 coordinate)" },
        ],
        correctAnswerId: "A",
        hint: "Shift each letter backward by 3 in the alphabet: U->R, X->U, Q->N. The lights spell 'RUN'.",
        docketTag: "SIGNAL CIPHER",
      },
      {
        id: "ch4-q4",
        itemNumber: 4,
        stageType: "case_study",
        subHeader: "CASE 04 · MUNICIPAL POWER INFRASTRUCTURE COLLAPSE",
        question: "Based on engineering topology documents, what critical system architecture vulnerability caused the total town blackout?",
        caseStudyData: {
          caseTitle: "HAWKINS POWER & LIGHT ARCHITECTURAL AUDIT",
          caseDocket: "CASE #83-HPL-4402",
          incidentBrief: "When lightning struck a single central transformer station outside Hawkins Lab, power failed simultaneously across the hospital, police station, schools, and residential quarters.",
          evidence: [
            "All secondary distribution feeders depend entirely on Master Transformer Substation Alpha.",
            "No dual-redundancy paths, backup failover circuits, or isolated microgrids exist in the municipal topology.",
            "Failure of this single centralized node brought down 100% of the dependent infrastructure.",
          ],
        },
        options: [
          { id: "A", text: "Single Point of Failure (SPOF) Architecture" },
          { id: "B", text: "Asynchronous Deadlock Livelock" },
          { id: "C", text: "Unbounded Memory Thrashing" },
          { id: "D", text: "Byzantine General Consensus Failure" },
        ],
        correctAnswerId: "A",
        hint: "A system where a single component's failure brings down the entire network suffers from a Single Point of Failure (SPOF).",
        docketTag: "SYSTEM ARCHITECTURE",
      },
      {
        id: "ch4-q5",
        itemNumber: 5,
        stageType: "case_study",
        subHeader: "CASE 05 · WILL'S TELEMETRY CONCURRENT LINK",
        question: "Evaluate the Season 2 hospital telemetry logs. What physiological countermeasure severed the Mind Flayer's shared vision?",
        caseStudyData: {
          caseTitle: "NEURAL TELEMETRY SYNCHRONIZATION INCIDENT",
          caseDocket: "CASE #84-HPD-HOSP-02",
          incidentBrief: "While hospitalized at Hawkins Lab, Will Byers exhibited simultaneous sensory coupling with the underground shadow entity. Whatever Will saw, the hive mind perceived in real time.",
          evidence: [
            "When security teams prepared ambushes in the pumpkin patch tunnels, the Mind Flayer anticipated their movements via Will's optical feed.",
            "Mike Wheeler observed that the entity was using Will as a biological spy webcam.",
            "Closing or blindfolding Will's eyes eliminated visual sensory telemetry, disorienting the hive mind's surveillance.",
          ],
        },
        options: [
          { id: "A", text: "Blindfolding Will and closing his eyes to sever the optical reconnaissance link" },
          { id: "B", text: "Administering full-spectrum sedative paralysis" },
          { id: "C", text: "Broadcasting high-decibel acoustic interference" },
          { id: "D", text: "Lowering room temperature to freezing levels" },
        ],
        correctAnswerId: "A",
        hint: "Mike realized: 'He's a spy! He can see where they are!' and yelled for everyone to close Will's eyes.",
        docketTag: "MEDICAL TELEMETRY",
      },
      {
        id: "ch4-q6",
        itemNumber: 6,
        stageType: "case_study",
        subHeader: "CASE 06 · CREEL HOUSE PSYCHIC CURSE ANCHOR",
        question: "Examine the psychological dossiers of Vecna's victims. What acoustic mechanism allows a captive to escape Vecna's mind lair?",
        caseStudyData: {
          caseTitle: "TEMPORAL TRANSE TETHERING EXPERIMENT",
          caseDocket: "CASE #86-VEC-0044",
          incidentBrief: "Victims subjected to Henry Creel's psychic tether experience hallucinations of a chiming grandfather clock, followed by sensory dissociation into the red Mind Lair.",
          evidence: [
            "Victor Creel survived the 1959 attack because Ella Fitzgerald's 'Dream a Little Dream of Me' played on the radio, tethering his subconscious.",
            "Robin and Nancy corroborated that music stimulates deep bilateral neural pathways that supernatural trauma cannot fully isolate.",
            "Feeding Max Mayfield's favorite song ('Running Up That Hill') via Walkman created an illuminated acoustic portal back to physical reality.",
          ],
        },
        options: [
          { id: "A", text: "Acoustic resonance of favorite personal music via headphones anchoring reality" },
          { id: "B", text: "Direct electrical shock to the cerebral cortex" },
          { id: "C", text: "Administering high-potency epinephrine injections" },
          { id: "D", text: "Reflecting visual laser beams into the pupils" },
        ],
        correctAnswerId: "A",
        hint: "Favorite music acts as a lifeline, reconnecting the victim's emotional memory to physical reality.",
        docketTag: "PSYCHIC PHENOMENON",
      },
      {
        id: "ch4-q7",
        itemNumber: 7,
        stageType: "case_study",
        subHeader: "CASE 07 · SUBLEVEL 04 EMERGENCY AIRLOCK",
        question: "Analyze the boolean sensor telemetry for Hawkins Lab Airlock Door 04. What is the current door status?",
        caseStudyData: {
          caseTitle: "AIRLOCK DIGITAL LOGIC VERIFICATION",
          caseDocket: "CASE #83-DOE-SUB4",
          incidentBrief: "The subterranean airlock circuit evaluates the boolean expression: `Door = (Power = ON AND Key = INSERTED) OR (Override = ON)`.",
          evidence: [
            "Sensor reading A (Power): ON (True / 1).",
            "Sensor reading B (Physical Key): NOT INSERTED (False / 0).",
            "Sensor reading C (Emergency Manual Override): ON (True / 1).",
            "Boolean evaluation: (1 AND 0) OR 1 = 0 OR 1 = 1 (True / Door OPEN).",
          ],
        },
        options: [
          { id: "A", text: "Door is OPEN (The manual override evaluates the OR condition to True)" },
          { id: "B", text: "Door is LOCKED (Missing physical key causes total circuit short)" },
          { id: "C", text: "Door is UNPOWERED (Incompatible voltage detected)" },
          { id: "D", text: "Door is DESTROYED (Thermal overload triggered)" },
        ],
        correctAnswerId: "A",
        hint: "In boolean logic, (True AND False) is False, but False OR True evaluates to True. The door unlocks.",
        docketTag: "CIRCUIT LOGIC",
      },
      {
        id: "ch4-q8",
        itemNumber: 8,
        stageType: "case_study",
        subHeader: "CASE 08 · STARCOURT SUBTERRANEAN LOGISTICS",
        question: "Investigate delivery manifest records for Starcourt Mall. What disguised mechanism facilitated Soviet subterranean expansion?",
        caseStudyData: {
          caseTitle: "STARCOURT MALL FREIGHT ELEVATOR INQUIRY",
          caseDocket: "CASE #85-STR-0914",
          incidentBrief: "Reconnaissance by Steve, Dustin, and Robin noted that heavy industrial canisters of green chemical element (Promethium/laser fuel) entered the mall but never appeared in store inventories.",
          evidence: [
            "Delivery trucks from Lynx Transportation unloaded containers into stockroom 4 behind Imperial Panda.",
            "Linemen noticed a 45-foot subterranean shaft equipped with heavy hydraulic counterweights.",
            "An industrial high-speed freight elevator was engineered behind a false maintenance wall, dropping 30 stories beneath Hawkins bedrock.",
          ],
        },
        options: [
          { id: "A", text: "A disguised deep-shaft hydraulic freight elevator behind mall stockrooms" },
          { id: "B", text: "An abandoned coal rail tunnel connected to Cornwallis Quarry" },
          { id: "C", text: "A subterranean pneumatic tube canister conduit system" },
          { id: "D", text: "A fleet of covert municipal sewage vacuum tankers" },
        ],
        correctAnswerId: "A",
        hint: "The Scoops Ahoy crew got trapped inside the secret freight elevator as it plummeted deep beneath the mall.",
        docketTag: "LOGISTICS INQUIRY",
      },
      {
        id: "ch4-q9",
        itemNumber: 9,
        stageType: "case_study",
        subHeader: "CASE 09 · ANOMALY SIGHTING DISTRIBUTION ANALYSIS",
        question: "Examine the geographic field records of 50 documented paranormal encounters. Which location represents the primary epicenter, and at what percentage?",
        caseStudyData: {
          caseTitle: "HAWKINS ANOMALY DISTRIBUTION TELEMETRY",
          caseDocket: "CASE #84-ENV-5001",
          incidentBrief: "Field deputies cataloged exactly 50 validated paranormal thermal spikes across four designated quadrants surrounding Hawkins Lab.",
          evidence: [
            "Mirkwood Forest Quadrant: 20 sightings.",
            "Hawkins National Laboratory Perimeter: 15 sightings.",
            "Starcourt Mall & Commercial District: 10 sightings.",
            "Hawkins Middle & High School Grounds: 5 sightings.",
            "Calculation: 20 sightings out of 50 total equals (20 / 50) × 100% = 40%.",
          ],
        },
        options: [
          { id: "A", text: "Mirkwood Forest at 40% (Primary epicenter of entity incursions)" },
          { id: "B", text: "Hawkins National Laboratory at 30%" },
          { id: "C", text: "Starcourt Mall at 20%" },
          { id: "D", text: "Hawkins High School at 10%" },
        ],
        correctAnswerId: "A",
        hint: "20 out of 50 total sightings is exactly 40%, placing Mirkwood Forest as the heaviest concentration.",
        docketTag: "STATISTICAL AUDIT",
      },
      {
        id: "ch4-q10",
        itemNumber: 10,
        stageType: "case_study",
        subHeader: "CASE 10 · PROJECT NINA SYNAPTIC RESTORATION",
        question: "Review Dr. Martin Brenner's neurological research dossier. How did Project Nina successfully restore Eleven's lost abilities?",
        caseStudyData: {
          caseTitle: "PROJECT NINA NEURAL RESTORATION PROTOCOL",
          caseDocket: "CASE #86-NINA-0011",
          incidentBrief: "Following the Battle of Starcourt, Eleven suffered severe psychosomatic apraxia, completely losing her telekinetic output.",
          evidence: [
            "Brain scans proved her physical motor and brain tissues were unharmed; her memory pathways were suppressed by trauma.",
            "Dr. Brenner and Dr. Owens engineered an isolation immersion tank coupled with an EEG tape deck system playing 1979 Hawkins Lab recordings.",
            "Confronting repressed memories of Henry Creel and the 1979 massacre unlocked the original synaptic pathways governing her psychokinesis.",
          ],
        },
        options: [
          { id: "A", text: "Sensory deprivation immersion paired with neuro-playback confronting repressed 1979 trauma" },
          { id: "B", text: "Direct surgical implantation of an artificial psychokinetic transceiver" },
          { id: "C", text: "High-voltage electroconvulsive therapy sessions" },
          { id: "D", text: "Synthetic adrenal hormone infusions" },
        ],
        correctAnswerId: "A",
        hint: "Project Nina was named after the opera: re-experiencing buried memories in the sensory tank re-ignited her neural circuits.",
        docketTag: "MEDICAL REPORT",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // STAGE 5: AS-IS (PRESERVED FROM CHAPTER 5)
  // ─────────────────────────────────────────────────────────────────
  5: {
    chapterId: 5,
    stageName: "THE FOREST",
    stageType: "standard",
    stageSubtitle: "DEEP WOODS RUNIC VECTORS",
    docketNumber: "FORM HPD-05-83 // CLASSIFIED FOREST RECON DOCKET",
    sectionHeader: "STAGE 05 — FORMAL INQUIRY // DEEP WOODS RUNIC VECTORS",
    points: 50,
    questions: [
      {
        id: "ch5-q1",
        itemNumber: 1,
        subHeader: "DEMO Q1 · ITEM 01: TREE PORTAL ANOMALY",
        question: "What tree landmark in Mirkwood concealed an organic portal into the Upside Down discovered by Nancy Wheeler?",
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
        subHeader: "DEMO Q2 · ITEM 02: PREDATOR SCENT VECTOR",
        question: "What behavioral vulnerability was observed when tracking Demogorgon scent signatures through the forest?",
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
        subHeader: "DEMO Q3 · ITEM 03: RUNIC VECTOR TRIANGULATION",
        question: "What runic vector pattern was marked on the three perimeter surveillance trees along Trail 7?",
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
        subHeader: "DEMO Q4 · ITEM 04: TRAP COUNTERMEASURES",
        question: "What makeshift countermeasures did Nancy Wheeler and Jonathan Byers prepare at the Byers house to trap the predator?",
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
      {
        id: "ch5-q5",
        itemNumber: 5,
        subHeader: "DEMO Q5 · ITEM 05: D&D ANALOG BEAST",
        question: "In Mike Wheeler's Dungeons & Dragons campaign, which two-headed monster piece was knocked over by Will's failed fireball roll?",
        options: [
          { id: "A", text: "The Demogorgon (Prince of Demons)" },
          { id: "B", text: "The Thessalhydra with Eight Maw Heads" },
          { id: "C", text: "The Beholder with Eye Rays" },
          { id: "D", text: "The Mind Flayer Illithid" },
        ],
        correctAnswerId: "A",
        hint: "Will rolled a 7 on his twenty-sided die, failing to cast fireball.",
        docketTag: "LORE ANALOG",
      },
      {
        id: "ch5-q6",
        itemNumber: 6,
        subHeader: "DEMO Q6 · ITEM 06: MIRKWOOD INTERSECTION ROAD SIGN",
        question: "What two rural roads cross at the infamous Mirkwood intersection near the lab fence line?",
        options: [
          { id: "A", text: "Cornwallis Road & Kerley Lane" },
          { id: "B", text: "Maple Street & Elm Avenue" },
          { id: "C", text: "Cherry Lane & Sattler Way" },
          { id: "D", text: "Lover's Lake Road & Highway 27" },
        ],
        correctAnswerId: "A",
        hint: "The boys nicknamed the desolate dark corner 'Mirkwood' from Tolkien's books.",
        docketTag: "GEOGRAPHY",
      },
      {
        id: "ch5-q7",
        itemNumber: 7,
        subHeader: "DEMO Q7 · ITEM 07: FLASHLIGHT AMBER SPORE EFFECT",
        question: "What floating phenomenon was visible in flashlight beams near the forest portal site?",
        options: [
          { id: "A", text: "Bioluminescent Amber Spores Drifting Slowly in Mid-Air" },
          { id: "B", text: "Black Ash Flakes Emitting Electrostatic Shocks" },
          { id: "C", text: "Green Iridescent Insects Swarming in Circles" },
          { id: "D", text: "Tiny Freezing Ice Needles Suspended Against Gravity" },
        ],
        correctAnswerId: "A",
        hint: "Particles suspended like underwater snow drifted outward through the portal opening.",
        docketTag: "AIR MONITORING",
      },
      {
        id: "ch5-q8",
        itemNumber: 8,
        subHeader: "DEMO Q8 · ITEM 08: STEVE'S MODIFIED WEAPON",
        question: "What weapon modification did Jonathan construct on the Louisville Slugger baseball bat?",
        options: [
          { id: "A", text: "Hammered Rows of 2-Inch Steel Carpenter Nails" },
          { id: "B", text: "Wrapped Barbed Razor Wire Around the Barrel" },
          { id: "C", text: "Bolted Serrated Lawnmower Blades Along the Tip" },
          { id: "D", text: "Soaked Heavy Burlap in Gasoline for a Torch Bat" },
        ],
        correctAnswerId: "A",
        hint: "Steve swung the nail-studded bat in the living room to drive back the creature.",
        docketTag: "IMPROVISED WEAPON",
      },
      {
        id: "ch5-q9",
        itemNumber: 9,
        subHeader: "DEMO Q9 · ITEM 09: TRAIL 7 COMPASS ROTATION",
        question: "How did the boys recognize they were approaching the laboratory's perimeter fence on Trail 7?",
        options: [
          { id: "A", text: "All Compass Needles Began Slowly Rotating Counter-Clockwise" },
          { id: "B", text: "Their Walkie-Talkies Emitted Static Morbid Whispers" },
          { id: "C", text: "The Pine Trees Lost All Needles and Turned Black" },
          { id: "D", text: "Ground Temperatures Dropped Below Zero Degrees" },
        ],
        correctAnswerId: "A",
        hint: "Dustin realized they were following a magnetic deviation towards the lab.",
        docketTag: "ANOMALOUS FLUX",
      },
      {
        id: "ch5-q10",
        itemNumber: 10,
        subHeader: "DEMO Q10 · ITEM 10: WOUNDED DEER TRACKING",
        question: "What prey animal was dragged into the Sycamore tree portal right before Nancy climbed in?",
        options: [
          { id: "A", text: "A Wounded Forest Deer Shot by Local Hunters" },
          { id: "B", text: "A Stray Red Fox with a Injured Leg" },
          { id: "C", text: "A Raccoon from Benny's Dumpster" },
          { id: "D", text: "A Golden Retriever Hunting Dog" },
        ],
        correctAnswerId: "A",
        hint: "Nancy and Jonathan tracked blood droplets from a deer until it vanished inside the tree.",
        docketTag: "PREDATOR TRACKS",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // STAGE 6: RADIO TRANSMISSION (DECIPHERS, CIPHERS, MORSE, SIGNALS)
  // ─────────────────────────────────────────────────────────────────
  6: {
    chapterId: 6,
    stageName: "THE TOWER",
    stageType: "radio",
    stageSubtitle: "RADIO TRANSMISSION INTERCEPTS & CIPHER DECODING",
    docketNumber: "FORM HPD-06-83 // CLASSIFIED RADIO INTERCEPT DOCKET",
    sectionHeader: "STAGE 06 — RADIO TRANSMISSION // DECODE AIRWAVE CIPHERS",
    points: 50,
    questions: [
      {
        id: "ch6-q1",
        itemNumber: 1,
        stageType: "radio",
        subHeader: "SIGNAL 01 · CAESAR CIPHER BROADCAST",
        question: "A high-frequency radio signal pulses encrypted sequence 'UXQ'. Intelligence reports confirm a Caesar cipher with key +3. Decode the carrier message.",
        radioData: {
          frequency: "14.175 MHz",
          callsign: "CEREBRO-EAST",
          signalType: "cipher",
          rawSignal: "U · X · Q [SHIFT +3]",
          cipherHint: "Subtract 3 positions from each letter in the standard Latin alphabet.",
        },
        options: [
          { id: "A", text: "\"RUN\" (Decoded: U - 3 = R, X - 3 = U, Q - 3 = N)" },
          { id: "B", text: "\"WAR\" (Decoded offset +2)" },
          { id: "C", text: "\"SOS\" (Decoded frequency)" },
          { id: "D", text: "\"BOY\" (Decoded inverted alphabet)" },
        ],
        correctAnswerId: "A",
        hint: "U becomes R, X becomes U, Q becomes N. The decoded signal is 'RUN'.",
        docketTag: "RADIO INTERCEPT",
      },
      {
        id: "ch6-q2",
        itemNumber: 2,
        stageType: "radio",
        subHeader: "SIGNAL 02 · 8-BIT BINARY TELEMETRY",
        question: "Eleven taps a rhythmic electrical transmission into the Supercom microphone: binary code 01010010. Which ASCII character does this encode?",
        radioData: {
          frequency: "27.185 MHz (CB CH 19)",
          callsign: "MAGE-011",
          signalType: "binary",
          rawSignal: "0 1 0 1 0 0 1 0 [8-BIT BINARY]",
          cipherHint: "Calculate decimal value: 64 + 16 + 2 = 82. Map 82 to standard ASCII table.",
        },
        options: [
          { id: "A", text: "'R' (01010010₂ = 64 + 16 + 2 = 82 = ASCII 'R')" },
          { id: "B", text: "'E' (01000101₂ = 69 = ASCII 'E')" },
          { id: "C", text: "'L' (01001100₂ = 76 = ASCII 'L')" },
          { id: "D", text: "'Z' (01011010₂ = 90 = ASCII 'Z')" },
        ],
        correctAnswerId: "A",
        hint: "Binary 01010010 = 2^6 + 2^4 + 2^1 = 64 + 16 + 2 = 82. ASCII 82 is uppercase 'R'.",
        docketTag: "BINARY STREAM",
      },
      {
        id: "ch6-q3",
        itemNumber: 3,
        stageType: "radio",
        subHeader: "SIGNAL 03 · RUSSIAN ENCRYPTED BROADCAST",
        question: "Dustin intercepts a looping Russian radio transmission beneath Starcourt Mall. What is the verified English translation of the cipher?",
        radioData: {
          frequency: "433.920 MHz",
          callsign: "VOLKHOV-GROUND",
          signalType: "intercept",
          rawSignal: "\"Dlinnaya nedelya... Kitayskaya poezdka... Serebryany kot est...\"",
          cipherHint: "Monitored tape playback translated word-by-word with Robin's Russian dictionary.",
        },
        options: [
          { id: "A", text: "\"The week is long. A trip to China sounds nice. If you tread lightly. The silver cat feeds when blue and yellow meet in the West.\"" },
          { id: "B", text: "\"The night is cold. The winter in Moscow is harsh. The iron bear roars when fire burns in the North.\"" },
          { id: "C", text: "\"Comrades report to the silo. Open the vault at midnight when the red star rises in the East.\"" },
          { id: "D", text: "\"Operation Key is underway. Evacuate all personnel before the American police arrive.\"" },
        ],
        correctAnswerId: "A",
        hint: "The message decoded by Robin, Steve, and Dustin talks about the silver cat and blue and yellow hands.",
        docketTag: "RUSSIAN CIPHER",
      },
      {
        id: "ch6-q4",
        itemNumber: 4,
        stageType: "radio",
        subHeader: "SIGNAL 04 · MORSE CODE DISTRESS BEACON",
        question: "A high-frequency buzzer emits rhythmic Morse code pulses: `... --- ...`. What universal distress priority does this broadcast?",
        radioData: {
          frequency: "3.550 MHz (CW BAND)",
          callsign: "HAWKINS-BEACON",
          signalType: "morse",
          rawSignal: "· · ·   — — —   · · ·",
          cipherHint: "Three short dots (S), three long dashes (O), three short dots (S).",
        },
        options: [
          { id: "A", text: "\"SOS\" (Universal maritime & telegraphic distress code)" },
          { id: "B", text: "\"HELP\" (Emergency tactical ping)" },
          { id: "C", text: "\"RUN\" (Immediate evacuation warning)" },
          { id: "D", text: "\"DIE\" (Subspace anomalous whisper)" },
        ],
        correctAnswerId: "A",
        hint: "... is S, --- is O, ... is S. It spells SOS.",
        docketTag: "MORSE LOG",
      },
      {
        id: "ch6-q5",
        itemNumber: 5,
        stageType: "radio",
        subHeader: "SIGNAL 05 · REVERSE AUDIO PHONOGRAM",
        question: "Joyce Byers tunes the radio receiver to an analog static channel, capturing a reversed audio whisper. What message is Will communicating?",
        radioData: {
          frequency: "102.5 MHz FM",
          callsign: "BYERS-SHADOW",
          signalType: "audio",
          rawSignal: "\"EREH THGIR... EREH THGIR...\" [REVERSED SPEECH PHONOGRAM]",
          cipherHint: "Play the tape in reverse to restore normal English syntax.",
        },
        options: [
          { id: "A", text: "\"RIGHT HERE\" (Will indicating he is in the Upside Down copy of his house)" },
          { id: "B", text: "\"GET OUT\" (Warning of Demogorgon advance)" },
          { id: "C", text: "\"IT'S COLD\" (Environmental description of the shadow plane)" },
          { id: "D", text: "\"HELP ME\" (General distress plea)" },
        ],
        correctAnswerId: "A",
        hint: "Reversing 'EREH THGIR' yields 'RIGHT HERE'.",
        docketTag: "AUDIO PHONOGRAM",
      },
      {
        id: "ch6-q6",
        itemNumber: 6,
        stageType: "radio",
        subHeader: "SIGNAL 06 · HEATHKIT HAM RADIO TRANSCEIVER",
        question: "Which amateur radio frequency did the boys tune their Heathkit transceiver to when communicating with Mr. Clarke?",
        radioData: {
          frequency: "14.175 MHz",
          callsign: "AV-CLUB-HAWKINS",
          signalType: "intercept",
          rawSignal: "\"Calling Mr. Clarke... do you copy? Over.\"",
          cipherHint: "Standard 20-meter amateur radio voice band allocation.",
        },
        options: [
          { id: "A", text: "Heathkit 14.175 MHz (20-Meter Amateur Band)" },
          { id: "B", text: "Commercial Broadcast 104.3 MHz" },
          { id: "C", text: "Aviation Airband 121.5 MHz" },
          { id: "D", text: "Marine VHF Channel 16 (156.8 MHz)" },
        ],
        correctAnswerId: "A",
        hint: "The Heathkit SB-220 was calibrated to the 14.175 MHz ham radio band.",
        docketTag: "HAM RADIO",
      },
      {
        id: "ch6-q7",
        itemNumber: 6,
        stageType: "radio",
        subHeader: "SIGNAL 07 · CEREBRO REPEATER TELEMETRY",
        question: "What radio communication device did Dustin Henderson assemble on Weathertop to reach his girlfriend Suzie in Utah?",
        radioData: {
          frequency: "27.500 MHz HIGH-GAIN",
          callsign: "SUZIE-POO",
          signalType: "intercept",
          rawSignal: "\"Dusty-bun, do you copy? Repeat transmission over Cerebro.\"",
          cipherHint: "Custom ham radio station with massive telescoping directional antenna.",
        },
        options: [
          { id: "A", text: "Cerebro (High-powered ham radio tower named after X-Men)" },
          { id: "B", text: "Supercom Walkie-Talkie Mark IV" },
          { id: "C", text: "Motorola Squad Radio Transceiver" },
          { id: "D", text: "Hawkins Lab Sublevel Repeater" },
        ],
        correctAnswerId: "A",
        hint: "Dustin hauled Cerebro up the highest hill in Hawkins to get long-range radio line-of-sight.",
        docketTag: "CEREBRO LOG",
      },
      {
        id: "ch6-q8",
        itemNumber: 8,
        stageType: "radio",
        subHeader: "SIGNAL 08 · STARCOURT VAULT ACCESS CIPHER",
        question: "Suzie transmits the mathematical constant needed as the cryptographic password for the Russian laser vault. What value does she broadcast?",
        radioData: {
          frequency: "CEREBRO FREQ 27.5 MHz",
          callsign: "PLANCK-STATION",
          signalType: "cipher",
          rawSignal: "\"Planck's Constant: 6 . 6 2 6 0 7 0 × 1 0 ⁻ ³ ⁴\"",
          cipherHint: "Fundamental physical constant relating photon energy to frequency.",
        },
        options: [
          { id: "A", text: "6.626070 × 10⁻³⁴ J·s" },
          { id: "B", text: "6.626176 × 10⁻³⁴ J·s" },
          { id: "C", text: "3.141592 × 10⁰" },
          { id: "D", text: "2.997924 × 10⁸ m/s" },
        ],
        correctAnswerId: "A",
        hint: "Suzie insisted Dustin sing 'Never Ending Story' before providing the exact Planck's constant: 6.626070 × 10⁻³⁴.",
        docketTag: "VAULT CIPHER",
      },
      {
        id: "ch6-q9",
        itemNumber: 9,
        stageType: "radio",
        subHeader: "SIGNAL 09 · ELECTROMAGNETIC VECTOR ANOMALY",
        question: "A compass placed near the radio tower deflects erratically. What physical force causes magnetic needles to stray from true North?",
        radioData: {
          frequency: "ANOMALOUS FLUX 0.05 Hz",
          callsign: "MAGNETO-VECTOR",
          signalType: "intercept",
          rawSignal: "\"Needle deflection: 32° East of Magnetic North toward Hawkins Lab.\"",
          cipherHint: "High-energy electrical currents opening a dimensional tear emit immense magnetic flux.",
        },
        options: [
          { id: "A", text: "Immense artificial electromagnetic field created by the gate opening" },
          { id: "B", text: "Dead batteries inside the compass housing" },
          { id: "C", text: "Atmospheric solar storm in the upper ionosphere" },
          { id: "D", text: "Underground iron ore deposit beneath Mirkwood" },
        ],
        correctAnswerId: "A",
        hint: "Dustin explains: 'The compass doesn't point to true North; it points to a stronger local magnetic field.'",
        docketTag: "FLUX TELEMETRY",
      },
      {
        id: "ch6-q10",
        itemNumber: 10,
        stageType: "radio",
        subHeader: "SIGNAL 10 · SUB-BASIN GATE CONVERGENCE",
        question: "At the end of Season 4, sub-audible seismic pulses broadcast across municipal radio channels. What catastrophic event do they announce?",
        radioData: {
          frequency: "0.1 Hz INFRASOUND",
          callsign: "VECNA-NEXUS",
          signalType: "intercept",
          rawSignal: "\"4 fault lines converge at town center. Mega-rift opening.\"",
          cipherHint: "Four ritual victims slain at four distinct compass points across Hawkins.",
        },
        options: [
          { id: "A", text: "Four gates converge simultaneously, opening a massive rift across Hawkins" },
          { id: "B", text: "A localized natural earthquake along the Wabash fault" },
          { id: "C", text: "Starcourt Mall basement explosion" },
          { id: "D", text: "Hawkins National Laboratory self-destruct countdown" },
        ],
        correctAnswerId: "A",
        hint: "Vecna's plan was four kills to open four gates that tear open Hawkins in a cross shape.",
        docketTag: "SEISMIC SIGNAL",
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // STAGE 7: LAB-TYPE TASKS (TECHNICAL INTERACTIVE CHALLENGES)
  // ─────────────────────────────────────────────────────────────────
  7: {
    chapterId: 7,
    stageName: "THE UPSIDE DOWN",
    stageType: "lab_task",
    stageSubtitle: "TECHNICAL SIMULATIONS & LAB OPERATIONS",
    docketNumber: "FORM HPD-07-83 // CLASSIFIED LAB TASK DOCKET",
    sectionHeader: "STAGE 07 — LAB-TYPE TASKS // SYSTEM REPAIR & SIMULATION",
    points: 50,
    questions: [
      {
        id: "ch7-q1",
        itemNumber: 1,
        stageType: "lab_task",
        subHeader: "LAB TASK 01 · LOGICAL SEQUENCE (EXPERIMENT IDS)",
        question: "Hawkins Lab experiment subject IDs run in sequence: 2, 6, 12, 20, 30, ... What is the next experiment ID in this progression?",
        labTaskData: {
          labCategory: "sequence",
          terminalPrompt: "DOE_MATH_KERNEL:> compute_next_id([2, 6, 12, 20, 30])",
          labHint: "Analyze differences: 6-2 = +4; 12-6 = +6; 20-12 = +8; 30-20 = +10. Next gap is +12. Formula: n × (n + 1).",
        },
        options: [
          { id: "A", text: "42 (30 + 12 = 42; formula 6 × 7 = 42)" },
          { id: "B", text: "40 (Linear step +10)" },
          { id: "C", text: "38 (Decaying rate)" },
          { id: "D", text: "48 (Exponential doubling)" },
        ],
        correctAnswerId: "A",
        hint: "The intervals between numbers increase by 2 each step (+4, +6, +8, +10, +12). 30 + 12 = 42.",
        docketTag: "LAB SEQUENCE",
      },
      {
        id: "ch7-q2",
        itemNumber: 2,
        stageType: "lab_task",
        subHeader: "LAB TASK 02 · BOOLEAN LOGIC CIRCUIT EVALUATION",
        question: "The Sublevel 04 security gate opens if `(Power = ON AND Key = INSERTED) OR Override = ON`. Power is ON, Key is NOT inserted, Override is ON. Does the gate open?",
        labTaskData: {
          labCategory: "sequence",
          terminalPrompt: "GATE_CIRCUIT_MONITOR:> eval((True && False) || True)",
          labHint: "(ON AND NOT_INSERTED) = False. Then (False OR Override=ON) = True.",
        },
        options: [
          { id: "A", text: "Yes (The expression evaluates to TRUE via the active Override switch)" },
          { id: "B", text: "No (The missing key aborts the circuit)" },
          { id: "C", text: "Error (Conflicting inputs short-circuit the gate)" },
          { id: "D", text: "Undefined (Insufficient voltage detected)" },
        ],
        correctAnswerId: "A",
        hint: "(True AND False) is False. However, False OR True evaluates to True. The gate opens.",
        docketTag: "GATE LOGIC",
      },
      {
        id: "ch7-q3",
        itemNumber: 3,
        stageType: "lab_task",
        subHeader: "LAB TASK 03 · SYSTEM OPERATIONS (KILL ROGUE PID)",
        question: "A rogue daemon process with PID 1983 is locking the Hawkins Lab security server. Which UNIX terminal command force-terminates it immediately?",
        labTaskData: {
          labCategory: "system",
          terminalPrompt: "root@hawkins-lab-server:~# _",
          labHint: "SIGKILL signal is -9. Command format: kill -9 <PID>.",
        },
        options: [
          { id: "A", text: "kill -9 1983 (Sends SIGKILL signal to forcibly terminate process 1983)" },
          { id: "B", text: "stop process 1983" },
          { id: "C", text: "delete pid 1983" },
          { id: "D", text: "systemctl freeze 1983" },
        ],
        correctAnswerId: "A",
        hint: "In UNIX systems, 'kill -9 <PID>' issues the non-catchable SIGKILL signal to immediately stop a rogue process.",
        docketTag: "UNIX TERMINAL",
      },
      {
        id: "ch7-q4",
        itemNumber: 4,
        stageType: "lab_task",
        subHeader: "LAB TASK 04 · SYSTEM OPERATIONS (POWER RESTORATION ORDER)",
        question: "Place the Hawkins Lab power recovery protocol steps in correct operational sequence: (a) turn on lab lights, (b) start backup generator, (c) reset control panel, (d) close main breaker.",
        labTaskData: {
          labCategory: "system",
          terminalPrompt: "DOE_POWER_GRID:> init_restoration_sequence()",
          labHint: "Power source first (generator), connect circuit (breaker), initialize controller, then power consumer loads (lights).",
        },
        options: [
          { id: "A", text: "b → d → c → a (Generator → Main Breaker → Control Panel → Lights)" },
          { id: "B", text: "a → b → c → d (Lights first is impossible without power)" },
          { id: "C", text: "c → a → b → d (Control panel cannot boot without generator)" },
          { id: "D", text: "d → b → a → c (Breaker closed before source risks surge)" },
        ],
        correctAnswerId: "A",
        hint: "Each step depends on power supplied by the step before it: Generator (b) -> Breaker (d) -> Panel (c) -> Lights (a).",
        docketTag: "POWER SEQUENCE",
      },
      {
        id: "ch7-q5",
        itemNumber: 5,
        stageType: "lab_task",
        subHeader: "LAB TASK 05 · FUNCTION RESTORATION (BUGGY SIGHTING COUNTER)",
        question: "This telemetry script gives an incorrect count for Demogorgon sightings. Diagnose the bug and select the proper repair.",
        labTaskData: {
          labCategory: "function",
          codeSnippet: "def total_sightings(sightings):\\n    total = 0\\n    for i in range(1, len(sightings)):\\n        total += sightings[i]\\n    return total",
          labHint: "Look at the starting index of range(1, len(sightings)). In Python, array indices are 0-based.",
        },
        options: [
          { id: "A", text: "The loop starts at index 1 and skips element 0. Fix: use range(len(sightings)) or sum(sightings)" },
          { id: "B", text: "The 'total' variable should be initialized to -1" },
          { id: "C", text: "The return statement must be placed inside the for loop" },
          { id: "D", text: "Python requires while loops for array traversal" },
        ],
        correctAnswerId: "A",
        hint: "range(1, len(sightings)) starts at index 1, completely ignoring the first sighting at index 0.",
        docketTag: "PYTHON DEBUG",
      },
      {
        id: "ch7-q6",
        itemNumber: 6,
        stageType: "lab_task",
        subHeader: "LAB TASK 06 · FUNCTION RESTORATION (INFINITE RECURSION)",
        question: "Why does this recursive function crash the Hawkins Lab simulation console with a RecursionError?",
        labTaskData: {
          labCategory: "function",
          codeSnippet: "def fact(n):\\n    return n * fact(n - 1)",
          labHint: "A recursive function must have a terminating condition (base case) where it stops calling itself.",
        },
        options: [
          { id: "A", text: "Missing base case! Add 'if n <= 1: return 1' before the recursive return" },
          { id: "B", text: "Python cannot perform multiplication inside a return statement" },
          { id: "C", text: "The function parameter name must be uppercase" },
          { id: "D", text: "The function needs an external global variable" },
        ],
        correctAnswerId: "A",
        hint: "Without a base condition (like if n <= 1: return 1), fact(n) recurses forever until stack overflow.",
        docketTag: "RECURSION BUG",
      },
      {
        id: "ch7-q7",
        itemNumber: 7,
        stageType: "lab_task",
        subHeader: "LAB TASK 07 · DATA ANALYSIS (LIGHT FLICKER METRICS)",
        question: "Substation bulb flickers recorded Monday to Friday: 3, 5, 4, 12, 6. Compute the Mean, Median, and identify the statistical Outlier.",
        labTaskData: {
          labCategory: "data",
          terminalPrompt: "DOE_STATS:> analyze_dataset([3, 5, 4, 12, 6])",
          labHint: "Sum = 30; count = 5. Mean = 30/5 = 6. Sorted: [3, 4, 5, 6, 12]. Median = 5. Outlier is 12.",
        },
        options: [
          { id: "A", text: "Mean = 6, Median = 5, Outlier = 12 (Thursday surge)" },
          { id: "B", text: "Mean = 5, Median = 6, Outlier = 3" },
          { id: "C", text: "Mean = 7.5, Median = 4, Outlier = 6" },
          { id: "D", text: "Mean = 8, Median = 5.5, Outlier = 4" },
        ],
        correctAnswerId: "A",
        hint: "Sum is 30 / 5 = 6 (mean). In sorted order [3, 4, 5, 6, 12], middle element is 5 (median). 12 is the outlier.",
        docketTag: "STATISTICS",
      },
      {
        id: "ch7-q8",
        itemNumber: 8,
        stageType: "lab_task",
        subHeader: "LAB TASK 08 · DATA ANALYSIS (ZONE PERCENTAGE CONCENTRATION)",
        question: "Out of 50 total confirmed entity sightings: Forest 20, Lab 15, Mall 10, School 5. Which location has the highest concentration and what percentage?",
        labTaskData: {
          labCategory: "data",
          terminalPrompt: "HAWKINS_GIS:> compute_zone_density({Forest: 20, Lab: 15, Mall: 10, School: 5})",
          labHint: "Calculate: 20 / 50 = 0.40 = 40%.",
        },
        options: [
          { id: "A", text: "The Forest at 40% (20 out of 50 total events)" },
          { id: "B", text: "The Lab at 35%" },
          { id: "C", text: "Starcourt Mall at 25%" },
          { id: "D", text: "Hawkins School at 15%" },
        ],
        correctAnswerId: "A",
        hint: "Forest has 20 out of 50 total sightings. (20 / 50) * 100 = 40%.",
        docketTag: "ZONE ANALYSIS",
      },
      {
        id: "ch7-q9",
        itemNumber: 9,
        stageType: "lab_task",
        subHeader: "LAB TASK 09 · SIMULATED EXPERIMENT (TEMPERATURE CORRELATION)",
        question: "Experimental data records ambient temperature vs. flickers per hour: (20°C: 0), (15°C: 2), (10°C: 5), (5°C: 9). Identify the independent variable, dependent variable, and scientific conclusion.",
        labTaskData: {
          labCategory: "simulation",
          terminalPrompt: "EXPERIMENT_CORRELATION:> analyze({temp: [20, 15, 10, 5], flickers: [0, 2, 5, 9]})",
          labHint: "Independent variable is manipulated (Temperature). Dependent variable is measured (Flickers).",
        },
        options: [
          { id: "A", text: "Independent: Temperature; Dependent: Flicker Count; Conclusion: Negative correlation (colder air increases flickers)" },
          { id: "B", text: "Independent: Flicker Count; Dependent: Temperature; Conclusion: Flickering lights freeze the room" },
          { id: "C", text: "Independent: Time; Dependent: Electricity; Conclusion: Random fluctuations" },
          { id: "D", text: "Independent: Pressure; Dependent: Voltage; Conclusion: Direct positive correlation" },
        ],
        correctAnswerId: "A",
        hint: "We control Temperature (independent variable), which alters Flicker frequency (dependent variable). As temp drops, flickers rise (negative correlation).",
        docketTag: "EXPERIMENT LOG",
      },
      {
        id: "ch7-q10",
        itemNumber: 10,
        stageType: "lab_task",
        subHeader: "LAB TASK 10 · SIMULATED EXPERIMENT (GATE EXPONENTIAL DOUBLING)",
        question: "Gate energy starts at 2 units at 1:00 AM and doubles every hour (2, 4, 8, 16, 32, ...). At what time does it first exceed 100 energy units?",
        labTaskData: {
          labCategory: "simulation",
          terminalPrompt: "GATE_ENERGY_SIM:> simulate_doubling(start=2, time='01:00')",
          labHint: "1:00=2, 2:00=4, 3:00=8, 4:00=16, 5:00=32, 6:00=64, 7:00=128.",
        },
        options: [
          { id: "A", text: "7:00 AM (Energy reaches 128 units, surpassing 100)" },
          { id: "B", text: "6:00 AM (Energy is 64 units)" },
          { id: "C", text: "8:00 AM (Energy is 256 units)" },
          { id: "D", text: "5:00 AM (Energy is 32 units)" },
        ],
        correctAnswerId: "A",
        hint: "Sequence: 1:00=2, 2:00=4, 3:00=8, 4:00=16, 5:00=32, 6:00=64, 7:00=128. It first exceeds 100 at 7:00 AM.",
        docketTag: "ENERGY GROWTH",
      },
    ],
  },
};
'''

with open("/Users/chinmayb/Desktop/StrangerThinks/lib/chapterQuestions.ts", "w") as f:
    f.write(code)

print("Successfully generated lib/chapterQuestions.ts with all 7 Stages!")
