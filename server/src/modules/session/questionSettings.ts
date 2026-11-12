import { Types } from "mongoose";
import { Session } from "./models/session.model";
import { Question } from "../questions/models/question.model";

/**
 * Per-session question flags (hideFromUsers, keepBuzzer).
 *
 * The library Question holds the default. When a question is added to a session,
 * the library value is copied into session.questionSettings ("seeded"). From then on
 * the session's value is authoritative and admin toggles in a live game only write here,
 * so other sessions using the same library question are unaffected.
 */
export interface QuestionFlags {
  hideFromUsers: boolean;
  keepBuzzer: boolean;
}

type SettingsSource = {
  questionSettings?: Array<{
    question: Types.ObjectId | string;
    hideFromUsers?: boolean;
    keepBuzzer?: boolean;
  }>;
} | null | undefined;

type QuestionLike = {
  _id?: unknown;
  hideFromUsers?: boolean;
  keepBuzzer?: boolean;
} | null | undefined;

const idOf = (value: unknown) => String((value as any)?._id ?? value);

/** Effective flags for a question in a session (session override → library value → default). */
export const resolveQuestionFlags = (
  session: SettingsSource,
  question: QuestionLike,
): QuestionFlags => {
  const qid = idOf(question);
  const setting = session?.questionSettings?.find(
    (s) => idOf(s.question) === qid,
  );
  return {
    hideFromUsers:
      setting?.hideFromUsers ?? question?.hideFromUsers ?? false,
    keepBuzzer: setting?.keepBuzzer ?? question?.keepBuzzer ?? true,
  };
};

/** Overwrite the flag fields on a question object/doc with the session's effective values. */
export const applyQuestionFlags = <T extends QuestionLike>(
  session: SettingsSource,
  question: T,
): T => {
  if (!question) return question;
  const flags = resolveQuestionFlags(session, question);
  (question as any).hideFromUsers = flags.hideFromUsers;
  (question as any).keepBuzzer = flags.keepBuzzer;
  return question;
};

/** Set one or both flags for a question in this session only. */
export const setSessionQuestionFlags = async (
  sessionId: Types.ObjectId | string,
  questionId: Types.ObjectId | string,
  flags: Partial<QuestionFlags>,
) => {
  const update: Record<string, boolean> = {};
  if (typeof flags.hideFromUsers === "boolean") {
    update["questionSettings.$.hideFromUsers"] = flags.hideFromUsers;
  }
  if (typeof flags.keepBuzzer === "boolean") {
    update["questionSettings.$.keepBuzzer"] = flags.keepBuzzer;
  }
  if (Object.keys(update).length === 0) return;

  const qid = new Types.ObjectId(String(questionId));
  const result = await Session.updateOne(
    { _id: sessionId, "questionSettings.question": qid },
    { $set: update },
  );

  if (result.matchedCount === 0) {
    // No entry yet: seed from the library, then apply the requested flags.
    const library = await Question.findById(qid).select("hideFromUsers keepBuzzer");
    await Session.updateOne(
      { _id: sessionId, "questionSettings.question": { $ne: qid } },
      {
        $push: {
          questionSettings: {
            question: qid,
            hideFromUsers: flags.hideFromUsers ?? library?.hideFromUsers ?? false,
            keepBuzzer: flags.keepBuzzer ?? library?.keepBuzzer ?? true,
          },
        },
      },
    );
  }
};

/**
 * Sync session.questionSettings with session.questions:
 * - questions newly in the session get an entry seeded from the library
 * - entries for questions no longer in the session are dropped
 */
export const seedSessionQuestionSettings = async (
  sessionId: Types.ObjectId | string,
) => {
  const session = await Session.findById(sessionId).select(
    "questions questionSettings",
  );
  if (!session) return;

  const questionIds = (session.questions || []).map((q) => String(q));
  const inSession = new Set(questionIds);
  const existing = new Map(
    (session.questionSettings || []).map((s) => [String(s.question), s]),
  );

  const missingIds = questionIds.filter((id) => !existing.has(id));
  const libraryQuestions = missingIds.length
    ? await Question.find({ _id: { $in: missingIds } }).select(
        "hideFromUsers keepBuzzer",
      )
    : [];
  const libraryById = new Map(libraryQuestions.map((q) => [String(q._id), q]));

  // Atomic, per-entry updates (no whole-array $set), so a concurrent
  // SET_QUESTION_SETTINGS toggle can't be overwritten by this sync.
  const staleIds = [...existing.keys()].filter((id) => !inSession.has(id));
  if (staleIds.length) {
    await Session.updateOne(
      { _id: sessionId },
      {
        $pull: {
          questionSettings: {
            question: { $in: staleIds.map((id) => new Types.ObjectId(id)) },
          },
        },
      },
    );
  }
  await Promise.all(
    missingIds.map((id) => {
      const qid = new Types.ObjectId(id);
      return Session.updateOne(
        { _id: sessionId, "questionSettings.question": { $ne: qid } },
        {
          $push: {
            questionSettings: {
              question: qid,
              hideFromUsers: libraryById.get(id)?.hideFromUsers ?? false,
              keepBuzzer: libraryById.get(id)?.keepBuzzer ?? true,
            },
          },
        },
      );
    }),
  );
};
