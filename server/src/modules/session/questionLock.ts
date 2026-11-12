import { GameState } from "../gameState/models/gameState.model";
import { SessionStatus } from "./types/enums";

/**
 * Mid-game question lock.
 *
 * While a game is running, questions that were already played or are live
 * can't be moved or removed from the session; upcoming ones can.
 *  - BUZZER_BATTLE (or no mode): the first (currentQuestionIndex + 1) entries are locked.
 *  - SPIN_WHEEL: every completed question, plus the entry at currentQuestionIndex.
 */
export const QUESTION_LOCK_MESSAGE =
  "Questions that were already played or are live can't be moved or removed during a game.";

export interface QuestionLockContext {
  started: boolean;
  gameMode: string | null;
  currentQuestionIndex: number;
  completedQuestionIds: Set<string>;
}

type SessionLike = {
  _id: unknown;
  status?: string;
  gameMode?: string | null;
};

export const loadQuestionLockContext = async (
  session: SessionLike,
): Promise<QuestionLockContext> => {
  const gameState = await GameState.findOne({ sessionId: session._id })
    .select("currentQuestionIndex completedQuestionIds")
    .lean();
  const currentQuestionIndex =
    typeof gameState?.currentQuestionIndex === "number"
      ? gameState.currentQuestionIndex
      : -1;
  return {
    started:
      currentQuestionIndex >= 0 || session.status === SessionStatus.PLAYING,
    gameMode: session.gameMode ?? null,
    currentQuestionIndex,
    completedQuestionIds: new Set(
      (gameState?.completedQuestionIds || []).map((id) => String(id)),
    ),
  };
};

/** Is the entry at `index` (with id `questionId`) locked right now? */
export const isQuestionLocked = (
  ctx: QuestionLockContext,
  index: number,
  questionId: string,
): boolean => {
  if (!ctx.started) return false;
  if (ctx.gameMode === "SPIN_WHEEL") {
    return (
      ctx.completedQuestionIds.has(questionId) ||
      (ctx.currentQuestionIndex >= 0 && index === ctx.currentQuestionIndex)
    );
  }
  return index <= ctx.currentQuestionIndex;
};

/** True if replacing `oldIds` with `newIds` keeps every locked question in place. */
export const isReorderAllowed = (
  ctx: QuestionLockContext,
  oldIds: string[],
  newIds: string[],
): boolean => {
  if (!ctx.started) return true;
  const cqi = ctx.currentQuestionIndex;
  if (ctx.gameMode === "SPIN_WHEEL") {
    const newSet = new Set(newIds);
    for (const id of ctx.completedQuestionIds) {
      // Only enforce for completed questions that are still in the session list.
      if (oldIds.includes(id) && !newSet.has(id)) return false;
    }
    if (cqi >= 0 && cqi < oldIds.length && newIds[cqi] !== oldIds[cqi]) {
      return false;
    }
    return true;
  }
  const lockedCount = Math.min(cqi + 1, oldIds.length);
  for (let i = 0; i < lockedCount; i++) {
    if (newIds[i] !== oldIds[i]) return false;
  }
  return true;
};
