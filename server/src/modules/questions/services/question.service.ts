import mongoose, { Types } from "mongoose";
import { Question } from "../models/question.model";
import { QuestionResponse } from "../models/question.response.model";
import { QuestionFolder } from "../models/questionFolder.model";
import { IQuestion, IQuestionResponse } from "../types/interfaces";
import { Session } from "../../session/models/session.model";
import TeamService from "../../teams/services/team.service";
import { applyQuestionFlags } from "../../session/questionSettings";
import {
  DEFAULT_CORRECT_POINTS,
  DEFAULT_WRONG_PENALTY,
  getCorrectPoints,
  getWrongPenalty,
  SESSION_QUESTIONS_FOLDER,
} from "../constants";
import {
  QuestionRequester,
  canEditQuestion,
  isSuperAdmin,
  requesterSessionId,
  EDIT_FORBIDDEN_MESSAGE,
  QUESTION_IN_RUNNING_GAME_MESSAGE,
} from "../access";
import { SessionStatus } from "../../session/types/enums";
import {
  QUESTION_LOCK_MESSAGE,
  isQuestionLocked,
  loadQuestionLockContext,
} from "../../session/questionLock";

/** Error carrying an HTTP status for the controller to forward. */
export class QuestionAccessError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default class QuestionService {
  private session?: mongoose.ClientSession;

  constructor(session?: mongoose.ClientSession) {
    this.session = session;
  }

  async fetchAllQuestions(filters?: {
    search?: string;
    folder?: string;
    sort?: "newest" | "oldest";
    page?: number;
    limit?: number;
    scope?: "library" | "mine" | "all";
    requester?: QuestionRequester;
  }): Promise<{
    questions: IQuestion[];
    total: number;
    page: number;
    limit: number;
  }> {
    const queryFilter: Record<string, any> = {};
    const sortBy: Record<string, 1 | -1> =
      filters?.sort === "oldest" ? { createdAt: 1 } : { createdAt: -1 };
    const page = Math.max(1, Number(filters?.page || 1));
    const limit = Math.min(100, Math.max(1, Number(filters?.limit || 50)));

    // Scope: superadmin sees only the global library; a session admin sees the
    // global library plus their own session's private questions. Never another
    // session's private questions.
    const ownSessionId = requesterSessionId(filters?.requester);
    const scope = filters?.scope || "all";
    if (isSuperAdmin(filters?.requester) || !ownSessionId) {
      queryFilter.session = null;
    } else if (scope === "library") {
      queryFilter.session = null;
    } else if (scope === "mine") {
      queryFilter.session = new Types.ObjectId(ownSessionId);
    } else {
      queryFilter.session = { $in: [null, new Types.ObjectId(ownSessionId)] };
    }

    if (filters?.folder && filters.folder !== "all") {
      const escapedFolder = escapeRegex(filters.folder);
      queryFilter.folder = new RegExp(`^${escapedFolder}(?:/|$)`, "i");
    }

    if (filters?.search) {
      const searchRegex = new RegExp(escapeRegex(filters.search), "i");
      queryFilter.$or = [
        { questionText: searchRegex },
        { folder: searchRegex },
        { "options.optionText": searchRegex },
        { "questionContent.text": searchRegex },
        { "answerContent.text": searchRegex },
      ];
    }

    const query = Question.find(queryFilter)
      .sort(sortBy)
      .skip((page - 1) * limit)
      .limit(limit);

    const countQuery = Question.countDocuments(queryFilter);

    if (this.session) {
      query.session(this.session);
      countQuery.session(this.session);
    }

    const [questions, total] = await Promise.all([query, countQuery]);

    return { questions, total, page, limit };
  }

  async createQuestion(input: {
    questionText?: string;
    questionImage?: string;
    quetionVideo?: string;
    options?: { optionId: string; optionText: string }[];
    correctAnswer?: string;
    score?: number;
    wrongPenalty?: number;
    folder?: string;
    category?: string;
    keepBuzzer?: boolean;
    hideFromUsers?: boolean;
    questionContent?: any;
    questionAssets?: any[];
    answerContent?: any;
    hint?: any;
    hintPenalty?: number;
    createdBy?: string;
    requester?: QuestionRequester;
  }): Promise<IQuestion> {
    const creatorId = input.createdBy || "superadmin";
    const superAdmin = input.requester ? isSuperAdmin(input.requester) : true;
    const privateSessionId = superAdmin
      ? null
      : requesterSessionId(input.requester);
    if (!superAdmin && !privateSessionId) {
      throw new QuestionAccessError("A valid session is required.", 400);
    }

    // Session admins' questions are private to their session and always live in
    // SESSION_QUESTIONS_FOLDER (no QuestionFolder doc: it is not a library folder).
    const normalizedFolder = privateSessionId
      ? SESSION_QUESTIONS_FOLDER
      : (input.folder || "General").trim() || "General";
    const normalizedCategory = (
      typeof input.category === "string" ? input.category : normalizedFolder
    ).trim();

    if (!privateSessionId) {
      await QuestionFolder.findOneAndUpdate(
        { name: normalizedFolder },
        { $setOnInsert: { name: normalizedFolder, createdBy: creatorId } },
        { upsert: true, new: true, session: this.session },
      );
    }

    const question = new Question({
      questionText: input.questionText || input.questionContent?.text || "",
      questionImage: input.questionImage,
      quetionVideo: input.quetionVideo,
      options: input.options || [],
      correctAnswer: input.correctAnswer,
      score: input.score ?? DEFAULT_CORRECT_POINTS,
      wrongPenalty: input.wrongPenalty ?? DEFAULT_WRONG_PENALTY,
      folder: normalizedFolder,
      category: normalizedCategory,
      keepBuzzer: input.keepBuzzer ?? true,
      hideFromUsers: input.hideFromUsers ?? false,
      questionContent: input.questionContent,
      questionAssets: input.questionAssets || [],
      answerContent: input.answerContent,
      hint: input.hint,
      hintPenalty: input.hintPenalty ?? 0,
      createdBy: creatorId,
      session: privateSessionId ? new Types.ObjectId(privateSessionId) : null,
    });

    const options: any = {};
    if (this.session) {
      options.session = this.session;
    }

    await question.save(options);
    return question;
  }

  async updateQuestion(
    questionId: Types.ObjectId | string,
    input: {
      questionText?: string;
      questionImage?: string;
      quetionVideo?: string;
      options?: { optionId: string; optionText: string }[];
      correctAnswer?: string;
      score?: number;
      wrongPenalty?: number;
      folder?: string;
      category?: string;
      keepBuzzer?: boolean;
      hideFromUsers?: boolean;
      questionContent?: any;
      questionAssets?: any[];
      answerContent?: any;
      hint?: any;
      hintPenalty?: number;
      requester?: QuestionRequester;
    },
  ): Promise<IQuestion> {
    const query = Question.findById(questionId);
    if (this.session) {
      query.session(this.session);
    }

    const question = await query;
    if (!question) {
      throw new Error("Question not found");
    }

    // Global questions: superadmin only. Private questions: their session's admin or superadmin.
    if (!canEditQuestion(input.requester, question)) {
      throw new QuestionAccessError(EDIT_FORBIDDEN_MESSAGE, 403);
    }

    // Only the superadmin may move global questions between library folders.
    // Session admins can't change folder (or session) at all.
    if (
      input.folder !== undefined &&
      isSuperAdmin(input.requester) &&
      !question.session
    ) {
      const requesterId = input.requester?.id || "superadmin";
      const normalizedFolder = (input.folder || "General").trim() || "General";
      await QuestionFolder.findOneAndUpdate(
        { name: normalizedFolder },
        { $setOnInsert: { name: normalizedFolder, createdBy: requesterId } },
        { upsert: true, new: true, session: this.session },
      );
      question.folder = normalizedFolder;
    }

    if (input.category !== undefined) {
      question.category = input.category.trim();
    }

    question.questionText =
      input.questionText ??
      input.questionContent?.text ??
      question.questionText;
    // Legacy media fields: only touch them when the client actually sent them,
    // otherwise an edit from the new editor would wipe old media.
    if (input.questionImage !== undefined) {
      question.questionImage = input.questionImage || undefined;
    }
    if (input.quetionVideo !== undefined) {
      question.quetionVideo = input.quetionVideo || undefined;
    }
    question.options = input.options || [];
    question.correctAnswer = input.correctAnswer;
    if (input.score !== undefined) {
      question.score = input.score;
    }
    if (input.wrongPenalty !== undefined) {
      question.wrongPenalty = input.wrongPenalty;
    }
    question.keepBuzzer = input.keepBuzzer ?? true;
    if (input.hideFromUsers !== undefined) {
      question.hideFromUsers = input.hideFromUsers;
    }
    question.questionContent = input.questionContent;
    question.questionAssets = input.questionAssets || [];
    question.answerContent = input.answerContent;
    question.hint = input.hint;
    if (input.hintPenalty !== undefined) {
      question.hintPenalty = input.hintPenalty;
    }

    const options: any = {};
    if (this.session) {
      options.session = this.session;
    }

    await question.save(options);
    return question;
  }

  async deleteQuestion(
    questionId: Types.ObjectId | string,
    requester?: QuestionRequester,
  ): Promise<void> {
    const query = Question.findById(questionId);
    if (this.session) {
      query.session(this.session);
    }
    const question = await query;
    if (!question) {
      throw new Error("Question not found");
    }

    if (!canEditQuestion(requester, question)) {
      throw new QuestionAccessError(EDIT_FORBIDDEN_MESSAGE, 403);
    }

    const qid = new Types.ObjectId(String(questionId));
    const privateSessionId = question.session ? String(question.session) : null;

    if (privateSessionId) {
      // Private question: only its own session can reference it.
      const ownerSession = await Session.findById(privateSessionId).select(
        "questions status gameMode",
      );
      if (ownerSession) {
        const ids = (ownerSession.questions || []).map((id) => String(id));
        const ctx = await loadQuestionLockContext(ownerSession);
        const locked = ids.some(
          (id, index) => id === String(qid) && isQuestionLocked(ctx, index, id),
        );
        if (locked) {
          throw new QuestionAccessError(QUESTION_LOCK_MESSAGE, 409);
        }
      }
    } else {
      // Global question: refuse while any game using it is running.
      const runningQuery = Session.exists({
        questions: qid,
        status: SessionStatus.PLAYING,
      });
      if (this.session) {
        runningQuery.session(this.session);
      }
      if (await runningQuery) {
        throw new QuestionAccessError(QUESTION_IN_RUNNING_GAME_MESSAGE, 409);
      }
    }

    const deleteQuery = Question.findByIdAndDelete(questionId);
    if (this.session) {
      deleteQuery.session(this.session);
    }

    const deletedQuestion = await deleteQuery;
    if (!deletedQuestion) {
      throw new Error("Question not found");
    }

    const sessionUpdateOptions: any = {};
    if (this.session) {
      sessionUpdateOptions.session = this.session;
    }

    await Session.updateMany(
      privateSessionId
        ? { _id: privateSessionId, questions: qid }
        : { questions: qid },
      { $pull: { questions: qid, questionSettings: { question: qid } } },
      sessionUpdateOptions,
    );

    const responseDeleteQuery = QuestionResponse.deleteMany({ questionId: qid });
    if (this.session) {
      responseDeleteQuery.session(this.session);
    }
    await responseDeleteQuery;
  }

  async fetchFolders(): Promise<string[]> {
    // Only QuestionFolder docs (global library). Private session questions never
    // create folder docs, so their folder names can't leak here.
    const query = QuestionFolder.find()
      .sort({ name: 1 })
      .select("name -_id")
      .lean();
    if (this.session) {
      query.session(this.session);
    }

    const folders = await query;
    const names = folders.map((folder) => folder.name).filter(Boolean);

    if (!names.includes("General")) {
      return ["General", ...names];
    }

    return names;
  }

  async createFolder(name: string, parentPath?: string, userId?: string): Promise<string> {
    const normalized = name.trim();

    if (!normalized) {
      throw new Error("Folder name is required");
    }
    if (normalized.includes("/")) {
      throw new Error("Folder name cannot contain '/'");
    }

    const normalizedParent =
      typeof parentPath === "string" && parentPath.trim().length > 0
        ? parentPath.trim()
        : "";
    const fullPath = normalizedParent
      ? `${normalizedParent}/${normalized}`
      : normalized;

    const requesterId = userId || "superadmin";

    // Verify parent folder write access: other admins cannot add questions/subfolders to folders they don't own
    if (normalizedParent && requesterId !== "superadmin") {
      const parentFolder = await QuestionFolder.findOne({ name: normalizedParent });
      if (parentFolder && parentFolder.createdBy !== requesterId) {
        throw new Error("You do not have permission to create folders inside this folder");
      }
    }

    const existingQuery = QuestionFolder.findOne({ name: fullPath });
    if (this.session) {
      existingQuery.session(this.session);
    }
    const existing = await existingQuery;

    if (existing) {
      throw new Error("Folder already exists");
    }

    const folder = new QuestionFolder({ name: fullPath, createdBy: requesterId });
    const options: any = {};
    if (this.session) {
      options.session = this.session;
    }
    await folder.save(options);

    return folder.name;
  }

  async renameFolder(folderPath: string, newName: string, userId?: string): Promise<string> {
    const normalizedPath = folderPath.trim();
    const normalizedName = newName.trim();

    if (!normalizedPath) {
      throw new Error("Folder path is required");
    }
    if (!normalizedName) {
      throw new Error("Folder name is required");
    }
    if (normalizedPath === "General") {
      throw new Error("General folder cannot be renamed");
    }
    if (normalizedName.includes("/")) {
      throw new Error("Folder name cannot contain '/'");
    }

    const requesterId = userId || "superadmin";

    const folderQuery = QuestionFolder.findOne({ name: normalizedPath });
    if (this.session) {
      folderQuery.session(this.session);
    }
    const folder = await folderQuery;
    if (!folder) {
      throw new Error("Folder not found");
    }

    // Authorization check: Admins can only rename folders they created
    if (requesterId !== "superadmin" && folder.createdBy !== requesterId) {
      throw new Error("You do not have permission to rename this folder");
    }

    const pathSegments = normalizedPath.split("/").filter(Boolean);
    const parentPath = pathSegments.slice(0, -1).join("/");
    const renamedPath = parentPath
      ? `${parentPath}/${normalizedName}`
      : normalizedName;

    if (renamedPath === normalizedPath) {
      return renamedPath;
    }

    const existingQuery = QuestionFolder.findOne({ name: renamedPath });
    if (this.session) {
      existingQuery.session(this.session);
    }
    const existingFolder = await existingQuery;
    if (existingFolder) {
      throw new Error("Folder already exists");
    }

    const escapedPath = normalizedPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const folderRegex = new RegExp(`^${escapedPath}(?:/|$)`);

    const folderDocsQuery = QuestionFolder.find({ name: folderRegex });
    const questionDocsQuery = Question.find({ folder: folderRegex, session: null });

    if (this.session) {
      folderDocsQuery.session(this.session);
      questionDocsQuery.session(this.session);
    }

    const [folderDocs, questionDocs] = await Promise.all([
      folderDocsQuery,
      questionDocsQuery,
    ]);

    await Promise.all(
      folderDocs.map(async (folderDoc) => {
        const updatedName =
          renamedPath + folderDoc.name.slice(normalizedPath.length);
        folderDoc.name = updatedName;
        await folderDoc.save(this.session ? { session: this.session } : {});
      }),
    );

    await Promise.all(
      questionDocs.map(async (questionDoc) => {
        const currentFolder = questionDoc.folder || "General";
        questionDoc.folder =
          renamedPath + currentFolder.slice(normalizedPath.length);
        await questionDoc.save(this.session ? { session: this.session } : {});
      }),
    );

    return renamedPath;
  }

  async deleteFolder(folderPath: string, userId?: string): Promise<string> {
    const normalizedPath = folderPath.trim();

    if (!normalizedPath) {
      throw new Error("Folder path is required");
    }
    if (normalizedPath === "General") {
      throw new Error("General folder cannot be deleted");
    }

    const requesterId = userId || "superadmin";

    const folderQuery = QuestionFolder.findOne({ name: normalizedPath });
    if (this.session) {
      folderQuery.session(this.session);
    }
    const folder = await folderQuery;
    if (!folder) {
      throw new Error("Folder not found");
    }

    // Authorization check: Admins can only delete folders they created
    if (requesterId !== "superadmin" && folder.createdBy !== requesterId) {
      throw new Error("You do not have permission to delete this folder");
    }

    const pathSegments = normalizedPath.split("/").filter(Boolean);
    const parentPath = pathSegments.slice(0, -1).join("/");
    const fallbackPath = parentPath || "General";
    const escapedPath = normalizedPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const folderRegex = new RegExp(`^${escapedPath}(?:/|$)`);

    const questionDocsQuery = Question.find({ folder: folderRegex, session: null });
    if (this.session) {
      questionDocsQuery.session(this.session);
    }
    const questionDocs = await questionDocsQuery;

    await Promise.all(
      questionDocs.map(async (questionDoc) => {
        const currentFolder = questionDoc.folder || "General";
        const suffix = currentFolder.slice(normalizedPath.length);
        const normalizedSuffix = suffix.startsWith("/") ? suffix.slice(1) : "";
        questionDoc.folder = normalizedSuffix
          ? parentPath
            ? `${parentPath}/${normalizedSuffix}`
            : normalizedSuffix
          : fallbackPath;
        await questionDoc.save(this.session ? { session: this.session } : {});
      }),
    );

    const deleteQuery = QuestionFolder.deleteMany({ name: folderRegex });
    if (this.session) {
      deleteQuery.session(this.session);
    }
    await deleteQuery;

    return fallbackPath;
  }

  // Fetch current question based on session and question index
  async fetchCurrentQuestion(
    sessionId: Types.ObjectId | string,
    questionIndex: number,
  ): Promise<IQuestion | null> {
    // Unpopulated: populate drops deleted questions and would shift indexes.
    const sessionQuery = Session.findById(sessionId).select(
      "questions questionSettings",
    );
    if (this.session) {
      sessionQuery.session(this.session);
    }

    const sessionData = await sessionQuery;
    if (!sessionData) {
      throw new Error("Session not found");
    }

    if (questionIndex < 0 || questionIndex >= sessionData.questions.length) {
      return null;
    }

    const questionId = sessionData.questions[questionIndex];
    if (!questionId) {
      return null;
    }
    const questionQuery = Question.findById(questionId);
    if (this.session) {
      questionQuery.session(this.session);
    }

    // Overlay this session's hide/keepBuzzer values. Callers must NOT save this doc
    // (it would write the session's values back into the shared library question).
    return applyQuestionFlags(sessionData, await questionQuery);
  }

  // Fetch question by ID (for teams - without correct answer)
  async fetchQuestionForTeam(
    questionId: Types.ObjectId | string,
  ): Promise<Partial<IQuestion> | null> {
    const query = Question.findById(questionId).select("-correctAnswer");
    if (this.session) {
      query.session(this.session);
    }

    return await query;
  }

  // Fetch question by ID (for admin - with correct answer)
  async fetchQuestionById(
    questionId: Types.ObjectId | string,
  ): Promise<IQuestion | null> {
    const query = Question.findById(questionId);
    if (this.session) {
      query.session(this.session);
    }

    return await query;
  }

  // Create question response
  async createQuestionResponse(
    questionId: Types.ObjectId | string,
    teamId: Types.ObjectId | string,
    responseOptionId: string,
  ): Promise<IQuestionResponse> {
    // Check if team has already responded to this question
    const existingResponseQuery = QuestionResponse.findOne({
      questionId,
      team: teamId,
    });
    if (this.session) {
      existingResponseQuery.session(this.session);
    }

    const existingResponse = await existingResponseQuery;
    if (existingResponse) {
      throw new Error("Team has already responded to this question");
    }

    const questionResponse = new QuestionResponse({
      questionId,
      team: teamId,
      response: responseOptionId,
    });

    const options: any = {};
    if (this.session) {
      options.session = this.session;
    }

    await questionResponse.save(options);
    return questionResponse;
  }

  // Validate answer and update team score
  async validateAndUpdateScore(
    questionId: Types.ObjectId | string,
    teamId: Types.ObjectId | string,
    responseOptionId: string,
  ): Promise<{ isCorrect: boolean; pointsAwarded: number }> {
    // Fetch the question
    const questionQuery = Question.findById(questionId);
    if (this.session) {
      questionQuery.session(this.session);
    }

    const question = await questionQuery;
    if (!question) {
      throw new Error("Question not found");
    }

    // Check if the answer is correct by comparing optionId with correctAnswer
    const isCorrect = question.correctAnswer === responseOptionId.toString();

    // Update team score if correct
    const teamService = new TeamService(this.session);
    if (isCorrect) {
      const points = getCorrectPoints(question);
      await teamService.updateTeamScore(teamId, points);
      return { isCorrect: true, pointsAwarded: points };
    }

    const penalty = getWrongPenalty(question);
    if (penalty > 0) {
      await teamService.updateTeamScore(teamId, -penalty);
    }
    return { isCorrect: false, pointsAwarded: -penalty };
  }

  // Get all questions for a session
  async fetchQuestionsBySession(
    sessionId: Types.ObjectId | string,
  ): Promise<IQuestion[]> {
    const sessionQuery = Session.findById(sessionId).populate("questions");
    if (this.session) {
      sessionQuery.session(this.session);
    }

    const sessionData = await sessionQuery;
    if (!sessionData) {
      throw new Error("Session not found");
    }

    return sessionData.questions as any;
  }

  // Check if team has responded to a question
  async hasTeamResponded(
    questionId: Types.ObjectId | string,
    teamId: Types.ObjectId | string,
  ): Promise<boolean> {
    const query = QuestionResponse.findOne({
      questionId,
      team: teamId,
    });
    if (this.session) {
      query.session(this.session);
    }

    const response = await query;
    return response !== null;
  }

  // Fetch all responses by team ID (for admin dashboard)
  async fetchResponsesByTeamId(
    teamId: Types.ObjectId | string,
  ): Promise<IQuestionResponse[]> {
    const query = QuestionResponse.find({ team: teamId })
      .populate("questionId")
      .populate("team")
      .sort({ createdAt: 1 }); // Oldest first

    if (this.session) {
      query.session(this.session);
    }

    return await query;
  }

  // Create question response for buzzer/verbal answer flow
  async createBuzzerResponse(
    questionId: Types.ObjectId | string,
    teamId: Types.ObjectId | string,
    isCorrect: boolean,
    pointsAwarded?: number,
  ): Promise<IQuestionResponse> {
    // Check if team has already responded to this question
    const existingResponseQuery = QuestionResponse.findOne({
      questionId,
      team: teamId,
    });
    if (this.session) {
      existingResponseQuery.session(this.session);
    }

    const existingResponse = await existingResponseQuery;
    if (existingResponse) {
      // Update existing response instead of creating duplicate
      existingResponse.isCorrect = isCorrect;
      if (pointsAwarded !== undefined) existingResponse.pointsAwarded = pointsAwarded;

      const options: any = {};
      if (this.session) {
        options.session = this.session;
      }

      await existingResponse.save(options);
      return existingResponse;
    }

    // Create new response
    const questionResponse = new QuestionResponse({
      questionId,
      team: teamId,
      response: isCorrect ? "CORRECT" : "INCORRECT", // For buzzer/verbal answers
      isCorrect: isCorrect,
      pointsAwarded,
    });

    const options: any = {};
    if (this.session) {
      options.session = this.session;
    }

    await questionResponse.save(options);
    return questionResponse;
  }

  // Bulk copy questions
  async copyQuestions(
    questionIds: string[],
    targetFolder: string,
    creatorId: string,
  ): Promise<IQuestion[]> {
    const normalizedFolder = targetFolder.trim();

    // Verify folder write access: other admins cannot add questions to folders they don't own
    if (creatorId !== "superadmin") {
      const folderDoc = await QuestionFolder.findOne({ name: normalizedFolder });
      if (folderDoc && folderDoc.createdBy !== creatorId) {
        throw new Error("You do not have permission to write to this folder");
      }
    }

    // Ensure folder exists (or create it)
    await QuestionFolder.findOneAndUpdate(
      { name: normalizedFolder },
      { $setOnInsert: { name: normalizedFolder, createdBy: creatorId } },
      { upsert: true, new: true, session: this.session },
    );

    // Find original questions
    // Only global library questions can be copied (copies stay global).
    const originals = await Question.find({
      _id: { $in: questionIds },
      session: null,
    });
    
    const copies = originals.map((orig) => {
      const origObj: any = orig.toObject();
      delete origObj._id;
      delete origObj.createdAt;
      delete origObj.updatedAt;
      return new Question({
        ...origObj,
        folder: normalizedFolder,
        createdBy: creatorId,
        session: null,
      });
    });

    const options: any = {};
    if (this.session) {
      options.session = this.session;
    }

    await Promise.all(copies.map((copy) => copy.save(options)));
    return copies;
  }

  // Bulk move questions
  async moveQuestions(
    questionIds: string[],
    targetFolder: string,
    userId: string,
  ): Promise<IQuestion[]> {
    if (userId !== "superadmin") {
      throw new Error("Only superadmin has permission to move questions");
    }

    const normalizedFolder = targetFolder.trim();

    // Ensure folder exists (or create it)
    await QuestionFolder.findOneAndUpdate(
      { name: normalizedFolder },
      { $setOnInsert: { name: normalizedFolder, createdBy: userId } },
      { upsert: true, new: true, session: this.session },
    );

    // Find the questions to move
    const questions = await Question.find({
      _id: { $in: questionIds },
      session: null,
    });

    const options: any = {};
    if (this.session) {
      options.session = this.session;
    }

    await Promise.all(
      questions.map(async (q) => {
        q.folder = normalizedFolder;
        await q.save(options);
      }),
    );

    return questions;
  }
}
