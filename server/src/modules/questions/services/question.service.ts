import mongoose, { Types } from "mongoose";
import { Question } from "../models/question.model";
import { QuestionResponse } from "../models/question.response.model";
import { QuestionFolder } from "../models/questionFolder.model";
import { IQuestion, IQuestionResponse } from "../types/interfaces";
import { Session } from "../../session/models/session.model";
import TeamService from "../../teams/services/team.service";

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

    if (filters?.folder && filters.folder !== "all") {
      const escapedFolder = filters.folder.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&",
      );
      queryFilter.folder = new RegExp(`^${escapedFolder}(?:/|$)`, "i");
    }

    if (filters?.search) {
      const searchRegex = new RegExp(filters.search, "i");
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
    folder?: string;
    keepBuzzer?: boolean;
    hideFromUsers?: boolean;
    questionContent?: any;
    questionAssets?: any[];
    answerContent?: any;
    hint?: any;
    hintPenalty?: number;
    createdBy?: string;
  }): Promise<IQuestion> {
    const normalizedFolder = (input.folder || "General").trim();
    const creatorId = input.createdBy || "superadmin";

    // Verify folder write access: other admins cannot add questions to folders they don't own
    if (creatorId !== "superadmin") {
      const folderDoc = await QuestionFolder.findOne({ name: normalizedFolder });
      if (folderDoc && folderDoc.createdBy !== creatorId) {
        throw new Error("You do not have permission to write to this folder");
      }
    }

    await QuestionFolder.findOneAndUpdate(
      { name: normalizedFolder },
      { $setOnInsert: { name: normalizedFolder, createdBy: creatorId } },
      { upsert: true, new: true, session: this.session },
    );

    const question = new Question({
      questionText: input.questionText || input.questionContent?.text || "",
      questionImage: input.questionImage,
      quetionVideo: input.quetionVideo,
      options: input.options || [],
      correctAnswer: input.correctAnswer,
      score: input.score ?? 0,
      folder: normalizedFolder,
      keepBuzzer: input.keepBuzzer ?? true,
      hideFromUsers: input.hideFromUsers ?? false,
      questionContent: input.questionContent,
      questionAssets: input.questionAssets || [],
      answerContent: input.answerContent,
      hint: input.hint,
      hintPenalty: input.hintPenalty ?? 0,
      createdBy: creatorId,
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
      folder?: string;
      keepBuzzer?: boolean;
      hideFromUsers?: boolean;
      questionContent?: any;
      questionAssets?: any[];
      answerContent?: any;
      hint?: any;
      hintPenalty?: number;
      userId?: string;
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

    const requesterId = input.userId || "superadmin";

    // Authorization check: Admins can only edit their own questions (unless superadmin)
    if (requesterId !== "superadmin" && question.createdBy !== requesterId) {
      throw new Error("You do not have permission to update this question");
    }

    if (input.folder !== undefined) {
      const normalizedFolder = (input.folder || "General").trim();

      // Verify folder write access: other admins cannot add questions to folders they don't own
      if (requesterId !== "superadmin") {
        const folderDoc = await QuestionFolder.findOne({ name: normalizedFolder });
        if (folderDoc && folderDoc.createdBy !== requesterId) {
          throw new Error("You do not have permission to write to this folder");
        }
      }

      await QuestionFolder.findOneAndUpdate(
        { name: normalizedFolder },
        { $setOnInsert: { name: normalizedFolder, createdBy: requesterId } },
        { upsert: true, new: true, session: this.session },
      );
      question.folder = normalizedFolder;
    }

    question.questionText =
      input.questionText ??
      input.questionContent?.text ??
      question.questionText;
    question.questionImage = input.questionImage;
    question.quetionVideo = input.quetionVideo;
    question.options = input.options || [];
    question.correctAnswer = input.correctAnswer;
    question.score = input.score ?? 0;
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

  async deleteQuestion(questionId: Types.ObjectId | string, userId?: string): Promise<void> {
    const query = Question.findById(questionId);
    if (this.session) {
      query.session(this.session);
    }
    const question = await query;
    if (!question) {
      throw new Error("Question not found");
    }

    const requesterId = userId || "superadmin";

    // Authorization check: Admins can only delete their own questions (unless superadmin)
    if (requesterId !== "superadmin" && question.createdBy !== requesterId) {
      throw new Error("You do not have permission to delete this question");
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
      { questions: questionId },
      { $pull: { questions: questionId } },
      sessionUpdateOptions,
    );

    const responseDeleteQuery = QuestionResponse.deleteMany({ questionId });
    if (this.session) {
      responseDeleteQuery.session(this.session);
    }
    await responseDeleteQuery;
  }

  async fetchFolders(): Promise<string[]> {
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
    const questionDocsQuery = Question.find({ folder: folderRegex });

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

    const questionDocsQuery = Question.find({ folder: folderRegex });
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
    const sessionQuery = Session.findById(sessionId).populate("questions");
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
    const questionQuery = Question.findById(questionId);
    if (this.session) {
      questionQuery.session(this.session);
    }

    return await questionQuery;
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
    if (isCorrect) {
      const teamService = new TeamService(this.session);
      await teamService.updateTeamScore(teamId, question.score);
      return { isCorrect: true, pointsAwarded: question.score };
    }

    return { isCorrect: false, pointsAwarded: 0 };
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
    const originals = await Question.find({ _id: { $in: questionIds } });
    
    const copies = originals.map((orig) => {
      const origObj: any = orig.toObject();
      delete origObj._id;
      delete origObj.createdAt;
      delete origObj.updatedAt;
      return new Question({
        ...origObj,
        folder: normalizedFolder,
        createdBy: creatorId,
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
    const questions = await Question.find({ _id: { $in: questionIds } });

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
