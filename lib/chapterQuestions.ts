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

/**
 * Default Canonical Chapter Quiz Configs (12 Normal Coding Questions distributed across Chapters 1-7)
 */
export const STAGE_QUIZ_CONFIGS: Record<number, StageQuizConfig> = {
  1: {
    chapterId: 1,
    stageName: "HAWKINS TOWN",
    docketNumber: "FORM HPD-01-83 // CLASSIFIED TELEMETRY DOCKET",
    sectionHeader: "SECTION 01 — FORMAL INQUIRY // HAWKINS TOWN TELEMETRY",
    points: 100,
    questions: [
      {
        id: "Q1",
        itemNumber: 1,
        subHeader: "ITEM 01: HAWKINS BY THE NUMBERS",
        docketTag: "NUMBER CONVERSIONS",
        question:
          "Hawkins Lab labelled its subjects with numbers. Convert each Stranger Things number in Column A to its matching value in Column B:\n\nCOLUMN A:\n[1] Eleven's subject number (decimal 11)\n[2] Eight's number + One's number (8 + 1 = 9)\n[3] The year Season 1 is set (1983)\n[4] Eight's number × Eleven's number (8 × 11 = 88)\n\nCOLUMN B:\n[a] 58 (hexadecimal)\n[b] 1011 (binary)\n[c] 7BF (hexadecimal)\n[d] 1001 (binary)",
        options: [
          { id: "A", text: "1-b, 2-d, 3-c, 4-a" },
          { id: "B", text: "1-d, 2-b, 3-a, 4-c" },
          { id: "C", text: "1-a, 2-c, 3-b, 4-d" },
          { id: "D", text: "1-c, 2-a, 3-d, 4-b" },
        ],
        correctAnswerId: "A",
        hint: "11 = 1011 in binary; 9 = 1001 in binary; 1983 = 7BF in hex; 88 = 58 in hex.",
      },
      {
        id: "Q5",
        itemNumber: 2,
        subHeader: "ITEM 02: MIND FLAYER VS CYBERSECURITY",
        docketTag: "CYBER ATTACK VECTORS",
        question:
          "Match each Hawkins threat to the cyber attack it resembles:\n\nCOLUMN A:\n[1] One Mind Flayer remotely controls hundreds of townspeople, who all act on its orders.\n[2] Demodogs swarm Hawkins in such numbers that the town's resources collapse.\n[3] A secret Russian base is hidden beneath what looks like an ordinary shopping mall.\n[4] Vecna silently reads a victim's memories and fears without them realising.\n\nCOLUMN B:\n[a] Ransomware\n[b] Spyware\n[c] Botnet\n[d] Trojan horse\n[e] DDoS attack",
        options: [
          { id: "A", text: "1-c, 2-e, 3-d, 4-b" },
          { id: "B", text: "1-d, 2-c, 3-e, 4-b" },
          { id: "C", text: "1-c, 2-a, 3-d, 4-e" },
          { id: "D", text: "1-e, 2-c, 3-b, 4-d" },
        ],
        correctAnswerId: "A",
        hint: "Remote zombie host control = Botnet; resource swarm exhaustion = DDoS; malicious payload inside normal front = Trojan; silent covert surveillance = Spyware.",
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
        id: "Q6",
        itemNumber: 1,
        subHeader: "ITEM 01: HAWKINS VERSION CONTROL",
        docketTag: "GIT WORKFLOW",
        question:
          "Treat Hawkins as a Git repository. Match each event to the Git command that does the same thing:\n\nCOLUMN A:\n[1] The Upside Down: a parallel version of Hawkins that evolves separately.\n[2] Bringing the parallel world's changes back into the main timeline.\n[3] Saving a snapshot of Hawkins as it is right now, with a note describing it.\n[4] Undoing the last disaster by adding a new change that reverses it, while keeping the history.\n\nCOLUMN B:\n[a] git commit\n[b] git clone\n[c] git revert\n[d] git branch\n[e] git merge",
        options: [
          { id: "A", text: "1-d, 2-e, 3-a, 4-c" },
          { id: "B", text: "1-d, 2-a, 3-e, 4-c" },
          { id: "C", text: "1-e, 2-d, 3-a, 4-b" },
          { id: "D", text: "1-a, 2-e, 3-c, 4-d" },
        ],
        correctAnswerId: "A",
        hint: "Isolated branch = git branch; reconciling branches = git merge; snapshot = commit; history-preserving undo = git revert.",
      },
      {
        id: "Q7",
        itemNumber: 2,
        subHeader: "ITEM 02: DECODE THE HELLFIRE CLUB",
        docketTag: "PYTHON STRING SLICING",
        question:
          "Dustin wrote Python snippets in his notebook. Match each snippet to the output it prints:\n\nCOLUMN A:\n[1] print(\"STRANGERTHINGS\"[::3])\n[2] print(\"VECNA\"[1:4])\n[3] print(\"MINDFLAYER\"[-5:])\n[4] print(\"ELEVEN\".count(\"E\"))\n\nCOLUMN B:\n[a] 3\n[b] ECN\n[c] SAEHG\n[d] LAYER",
        options: [
          { id: "A", text: "1-c, 2-b, 3-d, 4-a" },
          { id: "B", text: "1-b, 2-c, 3-a, 4-d" },
          { id: "C", text: "1-c, 2-d, 3-b, 4-a" },
          { id: "D", text: "1-d, 2-b, 3-c, 4-a" },
        ],
        correctAnswerId: "A",
        hint: "[::3] step 3 gives SAEHG; [1:4] slice gives ECN; [-5:] last 5 chars gives LAYER; count of 'E' is 3.",
      },
    ],
  },
  3: {
    chapterId: 3,
    stageName: "BYERS HOUSE",
    docketNumber: "FORM HPD-03-83 // CHRISTMAS LIGHTS ENCODING DOCKET",
    sectionHeader: "SECTION 03 — FORMAL INQUIRY // BYERS RESIDENCE HARMONICS",
    points: 150,
    questions: [
      {
        id: "Q9",
        itemNumber: 1,
        subHeader: "ITEM 01: HAWKINS OPERATING SYSTEM",
        docketTag: "OS CONCURRENCY",
        question:
          "Match each Hawkins scenario to the operating system concept it illustrates:\n\nCOLUMN A:\n[1] Mike, Dustin and Lucas share one walkie-talkie, each getting it for exactly 2 minutes in a fixed rotation.\n[2] Mike holds the compass and waits for Dustin's walkie. Dustin holds the walkie and waits for Mike's compass. Neither lets go.\n[3] Only one kid may press the transmit button on the shared radio at a time. The others must wait until it is released.\n[4] Nancy tracks the monster while Jonathan searches elsewhere, both sharing the same information at the same time.\n\nCOLUMN B:\n[a] Paging\n[b] Mutual exclusion (mutex)\n[c] Multithreading\n[d] Round Robin scheduling\n[e] Deadlock",
        options: [
          { id: "A", text: "1-d, 2-e, 3-b, 4-c" },
          { id: "B", text: "1-e, 2-d, 3-c, 4-b" },
          { id: "C", text: "1-d, 2-b, 3-e, 4-c" },
          { id: "D", text: "1-b, 2-e, 3-d, 4-a" },
        ],
        correctAnswerId: "A",
        hint: "Fixed time slice = Round Robin; circular wait where neither proceeds = Deadlock; exclusive resource lock = Mutex; parallel tasks sharing memory = Multithreading.",
      },
      {
        id: "Q11",
        itemNumber: 2,
        subHeader: "ITEM 02: THE SEARCH FOR WILL",
        docketTag: "SEARCH ALGORITHMS",
        question:
          "Match each search strategy used in Hawkins to the algorithm it represents:\n\nCOLUMN A:\n[1] Hopper checks every house on his list, one after another, from the first.\n[2] Joyce has an alphabetically sorted list of residents. She opens it in the middle and discards the half that cannot contain the name, again and again.\n[3] Dustin enters a tunnel and keeps going as deep as possible before backing up to try another path.\n[4] A search party spreads outward from the Lab in expanding rings, covering everything at one distance before moving further.\n\nCOLUMN B:\n[a] Breadth-First Search (BFS)\n[b] Depth-First Search (DFS)\n[c] Binary Search\n[d] Linear Search",
        options: [
          { id: "A", text: "1-d, 2-c, 3-b, 4-a" },
          { id: "B", text: "1-c, 2-d, 3-a, 4-b" },
          { id: "C", text: "1-d, 2-b, 3-c, 4-a" },
          { id: "D", text: "1-a, 2-c, 3-b, 4-d" },
        ],
        correctAnswerId: "A",
        hint: "One by one = Linear Search; halve sorted data = Binary Search; dive down branch before backtrack = DFS; expanding level rings = BFS.",
      },
    ],
  },
  4: {
    chapterId: 4,
    stageName: "HAWKINS LAB",
    docketNumber: "FORM HPD-04-83 // SUBLEVEL 03 MAINFRAME DOCKET",
    sectionHeader: "SECTION 04 — FORMAL INQUIRY // HAWKINS LAB MAINFRAME",
    points: 200,
    questions: [
      {
        id: "Q12",
        itemNumber: 1,
        subHeader: "ITEM 01: HOW FAST IS HAWKINS?",
        docketTag: "TIME COMPLEXITY (BIG-O)",
        question:
          "Match each Hawkins task to its time complexity:\n\nCOLUMN A:\n[1] Taking the top card from the Hellfire Club's deck.\n[2] Reading each of n pages in a notebook exactly once to find a clue.\n[3] Sorting all n of Dustin's trading cards using merge sort.\n[4] Every one of n party members compares notes with every other member.\n\nCOLUMN B:\n[a] O(n²)\n[b] O(2ⁿ)\n[c] O(n log n)\n[d] O(1)\n[e] O(n)",
        options: [
          { id: "A", text: "1-d, 2-e, 3-c, 4-a" },
          { id: "B", text: "1-e, 2-d, 3-a, 4-c" },
          { id: "C", text: "1-d, 2-c, 3-e, 4-a" },
          { id: "D", text: "1-a, 2-e, 3-c, 4-d" },
        ],
        correctAnswerId: "A",
        hint: "Top card pop = O(1); single pass = O(n); merge sort = O(n log n); pairwise comparisons = O(n²).",
      },
      {
        id: "Q13",
        itemNumber: 2,
        subHeader: "ITEM 02: CLASSES OF HAWKINS",
        docketTag: "OOP CONCEPTS",
        question:
          "Match each Hawkins situation to the Object-Oriented Programming concept it shows:\n\nCOLUMN A:\n[1] Eleven and Kali both have the abilities of the base class 'Test Subject' and add their own.\n[2] The same command attack() produces different results: the Demogorgon bites, the Mind Flayer controls, Vecna curses.\n[3] Dr. Brenner's files can only be reached through authorised channels. The raw data is hidden.\n[4] Dustin tunes Cerebro using a few knobs without knowing how radio waves work inside.\n\nCOLUMN B:\n[a] Abstraction\n[b] Encapsulation\n[c] Inheritance\n[d] Polymorphism",
        options: [
          { id: "A", text: "1-c, 2-d, 3-b, 4-a" },
          { id: "B", text: "1-d, 2-c, 3-a, 4-b" },
          { id: "C", text: "1-c, 2-b, 3-d, 4-a" },
          { id: "D", text: "1-a, 2-d, 3-b, 4-c" },
        ],
        correctAnswerId: "A",
        hint: "Subclasses extending base = Inheritance; same method polymorphic dispatch = Polymorphism; restricting direct access = Encapsulation; exposing interface while hiding complexity = Abstraction.",
      },
    ],
  },
  5: {
    chapterId: 5,
    stageName: "ROANE COUNTY WOODS",
    docketNumber: "FORM HPD-05-83 // TRAIL 7 COORDINATE CIPHER DOCKET",
    sectionHeader: "SECTION 05 — FORMAL INQUIRY // ROANE COUNTY WOODS",
    points: 200,
    questions: [
      {
        id: "Q14",
        itemNumber: 1,
        subHeader: "ITEM 01: WHEN EVERYTHING GOES DARK",
        docketTag: "SYSTEM ARCHITECTURE",
        question:
          "Name the system-design concept that connects all four clues:\n\n1. Every infected townsperson depends on one central Mind Flayer. If it is disrupted, they all lose control.\n2. If Hawkins Power & Light fails, the entire town goes dark.\n3. A website goes offline because its only server crashed.\n4. A network where every computer connects through one central hub; if the hub fails, nobody can communicate.",
        options: [
          { id: "A", text: "Single Point of Failure (SPOF)" },
          { id: "B", text: "Distributed Hash Consensus" },
          { id: "C", text: "Load Balanced Proxy Sharding" },
          { id: "D", text: "Split-Brain Quorum Isolation" },
        ],
        correctAnswerId: "A",
        hint: "One single bottleneck whose failure collapses the entire dependent architecture.",
      },
    ],
  },
  6: {
    chapterId: 6,
    stageName: "RADIO TOWER",
    docketNumber: "FORM HPD-06-83 // 5-PIN HARMONIC RESONANCE DOCKET",
    sectionHeader: "SECTION 06 — FORMAL INQUIRY // EAST HILL RADIO TOWER",
    points: 300,
    questions: [
      {
        id: "Q15",
        itemNumber: 1,
        subHeader: "ITEM 01: THE LAB DOOR CIRCUIT",
        docketTag: "DIGITAL LOGIC",
        question:
          "The Hawkins Lab door is controlled by expression: Door = (A AND B) OR ((NOT B) AND C). Where A = keycard valid, B = fingerprint valid, C = emergency override. Name the standard circuit that executes this logic.",
        options: [
          { id: "A", text: "2-to-1 Multiplexer (Select Line: B)" },
          { id: "B", text: "Full Adder Circuit with Carry Flag" },
          { id: "C", text: "SR Latch Bistable Multivibrator" },
          { id: "D", text: "3-to-8 Binary Line Decoder" },
        ],
        correctAnswerId: "A",
        hint: "If B = 1 output is A; if B = 0 output is C. B selects between inputs A and C.",
      },
      {
        id: "Q18",
        itemNumber: 2,
        subHeader: "ITEM 02: DUSTIN TESTS PYTHON",
        docketTag: "PYTHON TYPE EVALUATION",
        question:
          "Dustin tests expressions in Python. Match each expression to the data type it returns:\n\nCOLUMN A:\n[1] type(11 / 2)\n[2] type(11 // 2)\n[3] type(\"11\" + \"2\")\n[4] type(11 > 2)\n\nCOLUMN B:\n[a] bool\n[b] float\n[c] str\n[d] int\n[e] list",
        options: [
          { id: "A", text: "1-b, 2-d, 3-c, 4-a" },
          { id: "B", text: "1-d, 2-b, 3-c, 4-a" },
          { id: "C", text: "1-b, 2-d, 3-a, 4-c" },
          { id: "D", text: "1-a, 2-d, 3-c, 4-b" },
        ],
        correctAnswerId: "A",
        hint: "Division / yields float (5.5); floor // yields int (5); string concat yields str ('112'); comparison yields bool (True).",
      },
    ],
  },
  7: {
    chapterId: 7,
    stageName: "THE UPSIDE DOWN",
    docketNumber: "FORM HPD-07-83 // SUBJECT 001 CLASSIFIED DOSSIER",
    sectionHeader: "SECTION 07 — FINAL INQUIRY // THE UPSIDE DOWN DIMENSION",
    points: 500,
    questions: [
      {
        id: "Q20",
        itemNumber: 1,
        subHeader: "ITEM 01: DEBUGGING THE LAB",
        docketTag: "DEBUGGING & ERROR TYPES",
        question:
          "Match each Python snippet to the error or bug it produces. Assume Eleven has not been defined anywhere:\n\nCOLUMN A:\n[1] print(\"Hawkins\n[2] print(10 / 0)\n[3] print(3 + 5) # area of a 3 x 5 rectangle\n[4] print(Eleven)\n\nCOLUMN B:\n[a] NameError\n[b] Logic error\n[c] SyntaxError\n[d] TypeError\n[e] ZeroDivisionError",
        options: [
          { id: "A", text: "1-c, 2-e, 3-b, 4-a" },
          { id: "B", text: "1-c, 2-e, 3-a, 4-b" },
          { id: "C", text: "1-e, 2-c, 3-b, 4-a" },
          { id: "D", text: "1-b, 2-a, 3-c, 4-e" },
        ],
        correctAnswerId: "A",
        hint: "Unclosed string quote = SyntaxError; dividing by zero = ZeroDivisionError; calculating 3+5 instead of 3*5 = Logic error; undefined variable = NameError.",
      },
    ],
  },
};
const CQ_STAGE_POSITIONS: Record<string, { chapter: number; itemIndex: number }> = {
  CQ_01: { chapter: 1, itemIndex: 0 },
  Q1: { chapter: 1, itemIndex: 0 },
  CQ_05: { chapter: 1, itemIndex: 1 },
  Q5: { chapter: 1, itemIndex: 1 },
  CQ_06: { chapter: 2, itemIndex: 0 },
  Q6: { chapter: 2, itemIndex: 0 },
  CQ_07: { chapter: 2, itemIndex: 1 },
  Q7: { chapter: 2, itemIndex: 1 },
  CQ_09: { chapter: 3, itemIndex: 0 },
  Q9: { chapter: 3, itemIndex: 0 },
  CQ_11: { chapter: 3, itemIndex: 1 },
  Q11: { chapter: 3, itemIndex: 1 },
  CQ_12: { chapter: 4, itemIndex: 0 },
  Q12: { chapter: 4, itemIndex: 0 },
  CQ_13: { chapter: 4, itemIndex: 1 },
  Q13: { chapter: 4, itemIndex: 1 },
  CQ_14: { chapter: 5, itemIndex: 0 },
  Q14: { chapter: 5, itemIndex: 0 },
  CQ_15: { chapter: 6, itemIndex: 0 },
  Q15: { chapter: 6, itemIndex: 0 },
  CQ_18: { chapter: 6, itemIndex: 1 },
  Q18: { chapter: 6, itemIndex: 1 },
  CQ_20: { chapter: 7, itemIndex: 0 },
  Q20: { chapter: 7, itemIndex: 0 },
};

/**
 * Dynamically assign fetched questions into StageQuizConfig structure for Chapters 1-7.
 * Guarantees that each question retains its matching prompt, columns, and multiple-choice options.
 */
export function buildStageQuizConfigsFromQuestions(
  fetchedQuestions: any[]
): Record<number, StageQuizConfig> {
  if (!fetchedQuestions || fetchedQuestions.length === 0) {
    return STAGE_QUIZ_CONFIGS;
  }

  // Clone canonical stage configs as the stable foundation
  const result: Record<number, StageQuizConfig> = JSON.parse(JSON.stringify(STAGE_QUIZ_CONFIGS));

  // Overlay fetched question data onto the matching chapter and item slot
  fetchedQuestions.forEach((item, idx) => {
    const rawId = String(item.id || item.question_id || "").toUpperCase();
    const pos = CQ_STAGE_POSITIONS[rawId];

    const ch = pos ? pos.chapter : Math.min(7, Math.floor(idx / 2) + 1);
    const itemIdx = pos ? pos.itemIndex : idx % 2;

    if (!result[ch] || !result[ch].questions[itemIdx]) {
      return;
    }

    const defaultQ = result[ch].questions[itemIdx];

    // Parse options if provided
    let optionsList: QuizOption[] = [];
    if (Array.isArray(item.options) && item.options.length > 0) {
      optionsList = item.options
        .map((opt: any, oIdx: number) => {
          if (typeof opt === "string") {
            const match = opt.match(/^([A-D])[\).\s]+(.*)$/i);
            return match
              ? { id: match[1].toUpperCase(), text: match[2] }
              : { id: String.fromCharCode(65 + oIdx), text: opt };
          }
          if (opt && typeof opt === "object" && opt.text && !opt.text.includes("Clues provided")) {
            return {
              id: String(opt.id || String.fromCharCode(65 + oIdx)).toUpperCase(),
              text: String(opt.text || ""),
            };
          }
          return null;
        })
        .filter(Boolean) as QuizOption[];
    }

    // Ensure we have 4 valid multiple-choice options for this question
    const finalOptions =
      optionsList.length >= 4
        ? optionsList
        : defaultQ.options;

    // Use full canonical prompt or clean DB prompt
    let promptText = defaultQ.question;
    if (item.prompt && item.prompt.includes("COLUMN A")) {
      promptText = item.prompt;
    }

    result[ch].questions[itemIdx] = {
      ...defaultQ,
      id: rawId || defaultQ.id,
      subHeader: item.title ? `ITEM 0${itemIdx + 1}: ${String(item.title).toUpperCase()}` : defaultQ.subHeader,
      question: promptText,
      options: finalOptions,
      correctAnswerId: item.correct_answer === "A" || item.correct_answer === "B" || item.correct_answer === "C" || item.correct_answer === "D"
        ? item.correct_answer
        : defaultQ.correctAnswerId,
      hint: item.hint || defaultQ.hint,
    };
  });

  return result;
}

/**
 * 13 Vecna Lore Questions as StageQuizConfig for Vecna Screen Chapters/Trials
 */
export const VECNA_STAGE_QUIZ_CONFIGS: Record<number, StageQuizConfig> = {
  1: {
    chapterId: 1,
    stageName: "COUNSELOR ARCHIVE",
    docketNumber: "VECNA TRIAL 01 // PSYCHOLOGICAL PROFILER",
    sectionHeader: "INQUIRY 01 — VECNA VICTIMS // HIGH SCHOOL COUNSELOR",
    points: 100,
    questions: [
      {
        id: "V1",
        itemNumber: 1,
        subHeader: "ITEM 01: COUNSELOR DESIGNATION",
        question: "What was the name of the counselor who studied the psychological condition of several Vecna victims?",
        options: [
          { id: "A", text: "Ms. Kelley" },
          { id: "B", text: "Ms. Holland" },
          { id: "C", text: "Ms. Cunningham" },
          { id: "D", text: "Ms. Owens" },
        ],
        correctAnswerId: "A",
        hint: "Max and Chrissy both had confidential sessions in her office.",
      },
    ],
  },
  2: {
    chapterId: 2,
    stageName: "SOVIET INFILTRATION",
    docketNumber: "VECNA TRIAL 02 // CHERRY SLURPEE CYPHER",
    sectionHeader: "INQUIRY 02 — RUSSIAN KEY // UNDERGROUND DRILL FACILITY",
    points: 100,
    questions: [
      {
        id: "V2",
        itemNumber: 1,
        subHeader: "ITEM 01: RUSSIAN SCIENTIST",
        question: "What was the name of the Russian scientist who loved cherry Slurpees?",
        options: [
          { id: "A", text: "Yuri" },
          { id: "B", text: "Alexei" },
          { id: "C", text: "Grigori" },
          { id: "D", text: "Dmitri" },
        ],
        correctAnswerId: "B",
        hint: "He defected with Hopper and Joyce before the carnival.",
      },
    ],
  },
  3: {
    chapterId: 3,
    stageName: "PALACE ARCADE",
    docketNumber: "VECNA TRIAL 03 // ARCADE TELEMETRY",
    sectionHeader: "INQUIRY 03 — HIGH SCORE BREACH // MADMAX INCIDENT",
    points: 120,
    questions: [
      {
        id: "V3",
        itemNumber: 1,
        subHeader: "ITEM 01: ARCADE GAME",
        question: "Which arcade game was Dustin playing when he discovered that someone had beaten his high score?",
        options: [
          { id: "A", text: "Dig Dug" },
          { id: "B", text: "Dragon's Lair" },
          { id: "C", text: "Centipede" },
          { id: "D", text: "Galaga" },
        ],
        correctAnswerId: "A",
        hint: "Max took the #1 spot on the leaderboard in this game.",
      },
    ],
  },
  4: {
    chapterId: 4,
    stageName: "CHICAGO VIGILANTES",
    docketNumber: "VECNA TRIAL 04 // SUBJECT 008 CREW",
    sectionHeader: "INQUIRY 04 — OUTCAST PREDATORS // ILLUSION CREW",
    points: 120,
    questions: [
      {
        id: "V4",
        itemNumber: 1,
        subHeader: "ITEM 01: GANG LEADER",
        question: "What was the name of Kali's gang leader?",
        options: [
          { id: "A", text: "Axel" },
          { id: "B", text: "Funshine" },
          { id: "C", text: "Mick" },
          { id: "D", text: "Dottie" },
        ],
        correctAnswerId: "A",
        hint: "The aggressive punk with the spider face mask.",
      },
    ],
  },
  5: {
    chapterId: 5,
    stageName: "HAWKINS MIDDLE",
    docketNumber: "VECNA TRIAL 05 // SCIENCE MENTOR",
    sectionHeader: "INQUIRY 05 — THEORETICAL PHYSICS // THE CURIOUS FELLOW",
    points: 140,
    questions: [
      {
        id: "V5",
        itemNumber: 1,
        subHeader: "ITEM 01: SCIENCE TEACHER",
        question: "What is the name of the teacher who helps the kids understand the science behind the Upside Down?",
        options: [
          { id: "A", text: "Scott Clarke" },
          { id: "B", text: "Sam Owens" },
          { id: "C", text: "Martin Brenner" },
          { id: "D", text: "Bob Newby" },
        ],
        correctAnswerId: "A",
        hint: "He runs the AV Club and builds the Heathkit radio.",
      },
    ],
  },
  6: {
    chapterId: 6,
    stageName: "THE TIGHTROPE",
    docketNumber: "VECNA TRIAL 06 // DIMENSIONAL PHYSICS",
    sectionHeader: "INQUIRY 06 — THE FLEA AND THE ACROBAT // PARALLEL REALMS",
    points: 150,
    questions: [
      {
        id: "V6",
        itemNumber: 1,
        subHeader: "ITEM 01: ANALOGY CONCEPT",
        question: "Which scientific concept does Mr. Clarke use to explain how the Upside Down might be accessed?",
        options: [
          { id: "A", text: "The Flea and the Acrobat" },
          { id: "B", text: "Quantum Entanglement" },
          { id: "C", text: "The Butterfly Effect" },
          { id: "D", text: "String Theory" },
        ],
        correctAnswerId: "A",
        hint: "A tightrope walker is bound to 1D, but a flea walks on the underside.",
      },
    ],
  },
  7: {
    chapterId: 7,
    stageName: "RUSSIAN CIPHER",
    docketNumber: "VECNA TRIAL 07 // STARCOURT TRANSMISSION",
    sectionHeader: "INQUIRY 07 — SCOOPS TROOP // CODE TRANSLATION",
    points: 180,
    questions: [
      {
        id: "V7",
        itemNumber: 1,
        subHeader: "ITEM 01: STEVE'S MISUNDERSTANDING",
        question: "What does Steve Harrington initially think Robin is trying to tell him when she translates the Russian message?",
        options: [
          { id: "A", text: "That she likes him" },
          { id: "B", text: "That the Russians are watching them" },
          { id: "C", text: "That the mall is closing" },
          { id: "D", text: "That Dustin is in danger" },
        ],
        correctAnswerId: "A",
        hint: "Steve misreads the conversation in the back of Scoops Ahoy.",
      },
    ],
  },
  8: {
    chapterId: 8,
    stageName: "LOVER'S LAKE",
    docketNumber: "VECNA TRIAL 08 // WATER GATE ABYSS",
    sectionHeader: "INQUIRY 08 — AQUATIC RIFT // WATER GATE EXPLORATION",
    points: 180,
    questions: [
      {
        id: "V8",
        itemNumber: 1,
        subHeader: "ITEM 01: GATE DISCOVERY",
        question: "Which character discovers the underwater entrance to the Upside Down at Lover's Lake?",
        options: [
          { id: "A", text: "Steve Harrington" },
          { id: "B", text: "Eddie Munson" },
          { id: "C", text: "Dustin Henderson" },
          { id: "D", text: "Nancy Wheeler" },
        ],
        correctAnswerId: "A",
        hint: "He dives in with a flashlight and gets pulled through the gate.",
      },
    ],
  },
  9: {
    chapterId: 9,
    stageName: "HAWKINS LAB",
    docketNumber: "VECNA TRIAL 09 // MKULTRA PATIENT ZERO",
    sectionHeader: "INQUIRY 09 — TERRY IVES DOSSIER // DOE PSYCHOTROPIC LAB",
    points: 200,
    questions: [
      {
        id: "V9",
        itemNumber: 1,
        subHeader: "ITEM 01: FACILITY IDENTIFIER",
        question: "What is the exact name of the facility where Eleven's mother, Terry Ives, was subjected to experiments?",
        options: [
          { id: "A", text: "Hawkins National Laboratory" },
          { id: "B", text: "Hawkins Research Center" },
          { id: "C", text: "Hawkins Energy Facility" },
          { id: "D", text: "Indiana National Laboratory" },
        ],
        correctAnswerId: "A",
        hint: "The DOE headquarters outside Hawkins.",
      },
    ],
  },
  10: {
    chapterId: 10,
    stageName: "SISTER REVELATION",
    docketNumber: "VECNA TRIAL 10 // ILLUSION SUBJECT",
    sectionHeader: "INQUIRY 10 — SUBJECT DESIGNATION // RAINBOW ROOM",
    points: 200,
    questions: [
      {
        id: "V10",
        itemNumber: 1,
        subHeader: "ITEM 01: NUMBER DESIGNATION",
        question: "What number was Kali Prasad, the girl with illusion abilities, known by?",
        options: [
          { id: "A", text: "006" },
          { id: "B", text: "007" },
          { id: "C", text: "008" },
          { id: "D", text: "009" },
        ],
        correctAnswerId: "C",
        hint: "Tattooed on her right wrist in Hawkins Lab.",
      },
    ],
  },
  11: {
    chapterId: 11,
    stageName: "STARCOURT MALL",
    docketNumber: "VECNA TRIAL 11 // CORPORATE FRONT",
    sectionHeader: "INQUIRY 11 — SOVIET CONDUIT // COMMERCIAL ENTITY",
    points: 250,
    questions: [
      {
        id: "V11",
        itemNumber: 1,
        subHeader: "ITEM 01: CORPORATE ENTITY",
        question: "What is the name of the company that owns the Hawkins Starcourt Mall?",
        options: [
          { id: "A", text: "Starcourt Industries" },
          { id: "B", text: "Starcourt Corporation" },
          { id: "C", text: "Starcourt Holdings" },
          { id: "D", text: "Starcourt Enterprises" },
        ],
        correctAnswerId: "B",
        hint: "The exact legal corporate name on the mall blueprints.",
      },
    ],
  },
  12: {
    chapterId: 12,
    stageName: "CORRODED COFFIN",
    docketNumber: "VECNA TRIAL 12 // HELLFIRE GUITAR",
    sectionHeader: "INQUIRY 12 — UNDERGROUND METAL // EDDIE'S BAND",
    points: 250,
    questions: [
      {
        id: "V12",
        itemNumber: 1,
        subHeader: "ITEM 01: BAND NAME",
        question: "What was the name of Eddie Munson's band?",
        options: [
          { id: "A", text: "Corroded Coffin" },
          { id: "B", text: "Hellfire" },
          { id: "C", text: "The Upside Down" },
          { id: "D", text: "Hawkins Metal" },
        ],
        correctAnswerId: "A",
        hint: "Printed on Eddie's guitar pick and demo tape.",
      },
    ],
  },
  13: {
    chapterId: 13,
    stageName: "ROOFTOP CONCERT",
    docketNumber: "VECNA TRIAL 13 // THE MOST METAL CONCERT",
    sectionHeader: "INQUIRY 13 — DEMOBAT DISTRACTION // CREEL HOUSE DEFENSE",
    points: 300,
    questions: [
      {
        id: "V13",
        itemNumber: 1,
        subHeader: "ITEM 01: GUITAR TRACK",
        question: "Which song does Eddie Munson play on guitar in the Upside Down?",
        options: [
          { id: "A", text: "Master of Puppets" },
          { id: "B", text: "Enter Sandman" },
          { id: "C", text: "Run to the Hills" },
          { id: "D", text: "The Trooper" },
        ],
        correctAnswerId: "A",
        hint: "Metallica's 1986 thrash metal anthem.",
      },
    ],
  },
};
