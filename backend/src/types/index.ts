export type ChapterId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface SanitizedOption {
  id: string;
  text: string;
}

export interface SanitizedEvidenceLog {
  title: string;
  badge: string;
  time: string;
  content: string;
}

export interface SanitizedChapter {
  id: ChapterId;
  label: string;
  tag: string;
  archiveSector: string;
  archiveTitle: string;
  archiveSubtitle: string;
  archiveLines: string[];
  bgSrc: string;
  taskId: string;
  points: number;
  questionPrompt?: string;
  options?: SanitizedOption[];
  codeSnippet?: string;
  evidenceLogs?: SanitizedEvidenceLog[];
  initialTiles?: string[];
  placeholder?: string;
}

export interface ChapterVaultSecret {
  id: ChapterId;
  taskId: string;
  type: "quiz" | "case_study" | "rearrange" | "code" | "forest_runes" | "radiometer" | "final_quiz";
  points: number;
  validation: {
    correctOptionId?: string;
    correctPhrase?: string;
    numericAnswer?: number;
    codeAnswer?: string;
    acceptedAnswers?: string[];
  };
  completionLore: {
    title: string;
    text: string;
    lines: string[];
  };
}

export interface RadiometerPinSecret {
  taskIndex: number;
  digit: string;
  label: string;
  validation: {
    type: "radio" | "series" | "connection" | "rearrange" | "debug";
    answerRegex?: string;
    correctOrder?: string[];
    pairs?: Array<{ from: string; to: string }>;
  };
  points: number;
}

export interface ValidateChapterRequest {
  chapterId: ChapterId;
  taskId: string;
  answer: string | string[] | Record<string, string>;
  teamId?: string;
}

export interface ValidateChapterResponse {
  success: boolean;
  pointsAwarded: number;
  message: string;
  completionLore?: {
    title: string;
    text: string;
    lines: string[];
  };
  error?: string;
}

export interface AdminChapterView {
  id: ChapterId;
  label: string;
  tag: string;
  archiveSector: string;
  archiveTitle: string;
  archiveSubtitle: string;
  archiveLines: string[];
  bgSrc: string;
  taskId: string;
  points: number;
  questionPrompt?: string;
  options?: SanitizedOption[];
  codeSnippet?: string;
  initialTiles?: string[];
  type: string;
  correctAnswer: string;
  completionLoreTitle?: string;
  completionLoreText?: string;
  completionLines?: string[];
}

export interface LeaderboardEntry {
  rank: number;
  teamId: string;
  teamName: string;
  leaderName: string;
  score: number;
  solvedCount: number;
  completedTasks: string[];
  lastSubmissionTime: string;
  status: "ACTIVE" | "COMPLETED" | "IDLE";
}
