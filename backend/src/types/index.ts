/**
 * HAWKINS PROTOCOL — BACKEND DATA TYPES & INTERFACES
 */

export type Role = "PLAYER" | "VECNA" | "ADMIN" | "OBSERVER";

export type SabotageKind =
  | "CORRUPT"
  | "TIME_FREEZE"
  | "LOCK"
  | "DISTORT"
  | "SIGNAL_JAM"
  | "WATCH"
  | "MESSAGE"
  | "GLITCH";

export type StoryEventType =
  | "gate_open"
  | "upsidedown_activate"
  | "vecna_appear"
  | "will_signal"
  | "final_stage";

export interface ScoreBreakdown {
  tech: number;
  puzzle: number;
  speed: number;
  clue: number;
  story: number;
  teamwork: number;
}

export interface TeamSession {
  teamId: string;
  teamName: string;
  leaderName: string;
  role: Role;
}

export interface TeamRecord {
  id: string; // e.g. "T01"
  teamName: string;
  leaderName: string;
  passcode?: string;
  role: Role;
  status: "ACTIVE" | "COMPLETED" | "DISQUALIFIED";
  totalScore: number;
  breakdown: ScoreBreakdown;
  penalty: number;
  startedAt: string | null;
  finishedAt: string | null;
  lastSolvedAt: string | null;
  location: string;
  stage: string;
  storyProgress: number; // 0-100
  completedTasks: string[];
  solvedChapters: number[];
  unlockedLocations: Record<string, boolean>;
  radiometerPins: (string | null)[];
  radiometerSolved: boolean[];
  radiometerCodeSolved: boolean;
  unlockedHints: Record<string, boolean>;
  activeSabotage?: ActiveSabotage | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActiveSabotage {
  id: number;
  kind: SabotageKind;
  target: string; // teamId or "all"
  pinIndex?: number;
  message?: string;
  operatorName?: string;
  expiresAt: number; // epoch ms
}

export interface QuizOption {
  id: string; // "A", "B", "C", "D"
  text: string;
}

export interface ChapterQuestion {
  id: string; // "ch1-q1"
  chapterId: number;
  itemNumber: number;
  subHeader: string;
  question: string;
  options: QuizOption[];
  correctAnswerId: string; // SECRET: "A", "B", "C", "D"
  hint?: string;
  docketTag?: string;
}

export interface SanitizedQuestion {
  id: string;
  chapterId: number;
  itemNumber: number;
  subHeader: string;
  question: string;
  options: QuizOption[];
  hint?: string;
  docketTag?: string;
}

export interface ChapterDef {
  id: number; // 1 to 7
  label: string;
  tag: string;
  archiveSector: string;
  archiveTitle: string;
  archiveSubtitle: string;
  archiveLines: string[];
  completionLoreTitle: string;
  completionLoreText: string;
  completionLines: string[];
  bgSrc: string;
  taskId: string;
  points: number;
  docketNumber: string;
  sectionHeader: string;
  questions: ChapterQuestion[];
}

export interface SanitizedChapter {
  id: number;
  label: string;
  tag: string;
  archiveSector: string;
  archiveTitle: string;
  archiveSubtitle: string;
  archiveLines: string[];
  completionLoreTitle: string;
  completionLoreText: string;
  completionLines: string[];
  bgSrc: string;
  taskId: string;
  points: number;
  docketNumber: string;
  sectionHeader: string;
  questions: SanitizedQuestion[];
}

export interface LeaderboardEntry {
  rank: number;
  teamId: string;
  teamName: string;
  leaderName: string;
  score: number;
  breakdown: ScoreBreakdown;
  solvedCount: number;
  completedTasks: string[];
  lastSubmissionTime: string;
  status: "ACTIVE" | "COMPLETED" | "DISQUALIFIED";
}

export interface ValidationResponse {
  success: boolean;
  pointsAwarded: number;
  speedBonus?: number;
  correctCount?: number;
  totalCount?: number;
  message?: string;
  error?: string;
  completionLore?: {
    title: string;
    text: string;
    lines: string[];
  };
}

export interface PinValidationResponse {
  success: boolean;
  pinIndex?: number;
  digit?: string;
  pointsAwarded?: number;
  message?: string;
  error?: string;
}

export interface TelemetryPayload {
  team: string;
  teamId?: string;
  location?: string;
  viewMode?: string;
  storyProgress?: number;
  stage: string;
  score: number;
  timeLeft: number;
  solved: number;
  completedTasks?: string[];
  vecnaStatus?: string;
  radiometerPins?: number;
  radiometer?: {
    pins: (string | null)[];
    solved: boolean[];
    codeSolved?: boolean;
  };
  ts: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// SPEC-ALIGNED TYPES (STRANGER_THINGS_TIDB_SOCKETIO_BACKEND_SPEC)
// ─────────────────────────────────────────────────────────────────────────────

export type EventStatus = "draft" | "active" | "paused" | "ended";

export interface EventRecord {
  eventId: number;
  eventCode: string;
  eventName: string;
  status: EventStatus;
  loginOpen: boolean;
  submissionsOpen: boolean;
  isPaused: boolean;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RoundRecord {
  roundId: number;
  eventId: number;
  roundNumber: number;
  roundCode: string;
  roundName: string;
  isActive: boolean;
  createdAt: string;
}

export interface QuestionRecord {
  questionId: number;
  roundId: number;
  questionCode: string;
  questionOrder: number;
  questionType: string;
  points: number;
  promptContent: any;
  mediaConfig?: any;
  normalizationProfile: string;
  validatorType: string;
  isActive: boolean;
}

export interface QuestionHintRecord {
  hintId: number;
  questionId: number;
  hintOrder: number;
  hintText: string;
  penaltyPoints: number;
  isActive: boolean;
}

export interface TeamActiveSessionRecord {
  teamId: string;
  sessionId: string;
  sessionTokenHash: string;
  createdAt: string;
  lastSeenAt: string;
  validUntil: string | null;
}

export interface QuestionSubmissionRecord {
  submissionId: number;
  teamId: string;
  roundId: number;
  questionId: number;
  submittedAnswer: string;
  isCorrect: boolean;
  pointsAwarded: number;
  submittedAt: string;
}

export interface TeamHintUsageRecord {
  hintUsageId: number;
  teamId: string;
  questionId: number;
  hintId: number;
  penaltyPoints: number;
  usedAt: string;
}

export interface ScoreLedgerRecord {
  scoreEntryId: number;
  teamId: string;
  roundId: number;
  questionId: number | null;
  sourceType: "correct_answer" | "hint_penalty";
  sourceId: string;
  pointsDelta: number;
  createdAt: string;
}

export interface VecnaSenderRecord {
  senderId: number;
  senderCode: string;
  senderName: string;
  username: string;
  usernameNormalized: string;
  isEnabled: boolean;
  lastLoginAt: string | null;
}

export interface VecnaMessageTemplateRecord {
  templateId: number;
  templateCode: string;
  templateName: string;
  bodyText: string; // strictly <= 150 chars
  isActive: boolean;
  createdByAdminId: number;
  createdAt: string;
}

export interface VecnaMessageRecord {
  messageId: number;
  senderId: number;
  senderName?: string;
  clientRequestId: string;
  sourceType: "custom" | "template";
  templateId: number | null;
  bodyText: string; // strictly <= 150 chars
  recipientScope: "all_teams" | "selected_teams";
  selectedTeamIds?: string[];
  approvalStatus: "pending_approval" | "approved" | "rejected";
  requestedAt: string;
  reviewedByAdminId: number | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  sentAt: string | null;
}

export interface TeamVecnaDeliveryRecord {
  deliveryId: number;
  messageId: number;
  teamId: string;
  bodyText: string;
  senderName: string;
  deliveredAt: string;
  readAt: string | null;
}

export interface RealtimeOutboxRecord {
  outboxId: number;
  eventKey: string;
  targetType: "team" | "admin" | "public" | "vecna_sender";
  targetTeamId: string | null;
  targetAdminRoom: boolean;
  eventName: string;
  payload: any;
  createdAt: string;
  publishedAt: string | null;
  attemptCount: number;
  lastError: string | null;
}

export interface AdminUserRecord {
  adminId: number;
  username: string;
  displayName: string;
  isActive: boolean;
}

