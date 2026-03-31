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
      queryFilter.folder = filters.folder;
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
    questionContent?: any;
    questionAssets?: any[];
    answerContent?: any;
  }): Promise<IQuestion> {
    const normalizedFolder = (input.folder || "General").trim();

    await QuestionFolder.findOneAndUpdate(
      { name: normalizedFolder },
      { $setOnInsert: { name: normalizedFolder } },
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
      questionContent: input.questionContent,
      questionAssets: input.questionAssets || [],
      answerContent: input.answerContent,
    });

    const options: any = {};
    if (this.session) {
      options.session = this.session;
    }

    await question.save(options);
    return question;
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

  async createFolder(name: string): Promise<string> {
    const normalized = name.trim();

    if (!normalized) {
      throw new Error("Folder name is required");
    }

    const existingQuery = QuestionFolder.findOne({ name: normalized });
    if (this.session) {
      existingQuery.session(this.session);
    }
    const existing = await existingQuery;

    if (existing) {
      throw new Error("Folder already exists");
    }

    const folder = new QuestionFolder({ name: normalized });
    const options: any = {};
    if (this.session) {
      options.session = this.session;
    }
    await folder.save(options);

    return folder.name;
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
}
