// Mirrors server/src/modules/questions/constants.ts
export const DEFAULT_CORRECT_POINTS = 10;
export const DEFAULT_WRONG_PENALTY = 5;

const valid = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? num : undefined;
};

export const getCorrectPoints = (q?: { score?: unknown } | null) =>
  valid(q?.score) ?? DEFAULT_CORRECT_POINTS;

export const getWrongPenalty = (q?: { wrongPenalty?: unknown } | null) =>
  valid(q?.wrongPenalty) ?? DEFAULT_WRONG_PENALTY;

/** e.g. "+10 / −5" */
export const formatQuestionScoring = (
  q?: { score?: unknown; wrongPenalty?: unknown } | null,
) => `+${getCorrectPoints(q)} / −${getWrongPenalty(q)}`;
