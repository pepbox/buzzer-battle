import mongoose from "mongoose";

/** Minimal shape of req.user needed for library access checks. */
export type QuestionRequester =
  | { id?: string; role?: string; sessionId?: string }
  | null
  | undefined;

/** Super admin = global library owner (passcode login, sessionId "global"). */
export const isSuperAdmin = (user: QuestionRequester): boolean =>
  Boolean(user && (user.id === "superadmin" || user.sessionId === "global"));

/** The session a session-admin's private questions belong to, or null. */
export const requesterSessionId = (user: QuestionRequester): string | null => {
  if (!user || isSuperAdmin(user)) return null;
  const sid = user.sessionId;
  return sid && mongoose.isValidObjectId(sid) ? String(sid) : null;
};

const sessionOf = (question: any): string | null => {
  const s = question?.session;
  if (s === null || s === undefined) return null;
  return String(s?._id ?? s);
};

/**
 * Global questions (session null) are editable only by the super admin.
 * Private questions are editable by the super admin or their own session's admin.
 */
export const canEditQuestion = (user: QuestionRequester, question: any): boolean => {
  if (isSuperAdmin(user)) return true;
  const qSession = sessionOf(question);
  return Boolean(qSession && user?.sessionId && qSession === String(user.sessionId));
};

/** Can this requester see / use the question at all? */
export const canAccessQuestion = (user: QuestionRequester, question: any): boolean => {
  const qSession = sessionOf(question);
  if (qSession === null) return true;
  return canEditQuestion(user, question);
};

/** Plain object for an admin response, with `session` (string|null) and `isEditable`. */
export const serializeQuestionForAdmin = (user: QuestionRequester, question: any) => {
  if (!question) return question;
  const obj =
    typeof question.toObject === "function" ? question.toObject() : { ...question };
  return {
    ...obj,
    session: sessionOf(question),
    isEditable: canEditQuestion(user, question),
  };
};

export const EDIT_FORBIDDEN_MESSAGE = "You can only edit questions created in this session.";
export const SUPERADMIN_ONLY_MESSAGE = "Only the super admin can manage the global library.";
export const QUESTION_IN_RUNNING_GAME_MESSAGE =
  "This question is in a game that is currently running. Remove it from that session first.";
