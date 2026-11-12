// Default scoring applied when a question does not specify its own values.
// Both are stored as positive numbers; wrongPenalty is subtracted on a wrong answer.
export const DEFAULT_CORRECT_POINTS = 10;
export const DEFAULT_WRONG_PENALTY = 5;

const toNonNegativeNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? num : undefined;
};

/** Points awarded for a correct answer on this question. */
export const getCorrectPoints = (question?: { score?: unknown } | null) =>
  toNonNegativeNumber(question?.score) ?? DEFAULT_CORRECT_POINTS;

/** Points deducted (as a positive number) for a wrong answer on this question. */
export const getWrongPenalty = (question?: { wrongPenalty?: unknown } | null) =>
  toNonNegativeNumber(question?.wrongPenalty) ?? DEFAULT_WRONG_PENALTY;

/** Normalise request input; returns undefined if missing/invalid so callers can apply defaults. */
export const parseScoreInput = toNonNegativeNumber;

/** Folder every session-private question is placed in (no QuestionFolder doc is created for it). */
export const SESSION_QUESTIONS_FOLDER = "My Questions";
