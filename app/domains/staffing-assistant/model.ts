// Staffing assistant ("Ask AI" on the CBS admin page): staff ask questions
// about contractor availability and Claude answers through read-only tools
// over the roster.

export const ASSISTANT_MODEL = "claude-opus-5-5";
export const MAX_QUESTION_CHARS = 1000;
// Older turns are dropped past this, so a long chat can't grow without bound
export const MAX_CHAT_MESSAGES = 20;
// Longest stretch of days a single availability search expands to
export const MAX_SEARCH_DAYS = 70;

// One row of staffing_assistant_questions
export interface QuestionLogEntry {
  userEmail: string;
  question: string;
  toolsUsed: string[];
  inputTokens: number | null;
  outputTokens: number | null;
  finishReason: string | null;
  durationMs: number;
  error: string | null;
}
