import { NextFunction, Request, Response } from "express";
import AppError from "../../../utils/appError";
import QuestionService from "../services/question.service";
import GameStateService from "../../gameState/services/gameState.service";
import { GameStatus } from "../../gameState/types/enums";
import mongoose from "mongoose";
import { SessionEmitters } from "../../../services/socket/sessionEmitters";
import { Events } from "../../../services/socket/enums/Events";
import { timerManager } from "../../../services/timerManager";
import FileService from "../../files/services/fileService";

const questionService = new QuestionService();
const gameStateService = new GameStateService();

export const fetchAllQuestions = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { search, folder, sort, page, limit } = req.query;
    const result = await questionService.fetchAllQuestions({
      search: typeof search === "string" ? search : undefined,
      folder: typeof folder === "string" ? folder : undefined,
      sort: sort === "oldest" ? "oldest" : "newest",
      page: typeof page === "string" ? Number(page) : undefined,
      limit: typeof limit === "string" ? Number(limit) : undefined,
    });

    res.status(200).json({
      message: "Questions fetched successfully.",
      data: {
        questions: result.questions,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching questions:", error);
    next(new AppError("Failed to fetch questions.", 500));
  }
};

export const fetchFolders = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const folders = await questionService.fetchFolders();

    res.status(200).json({
      message: "Folders fetched successfully.",
      data: { folders },
    });
  } catch (error) {
    console.error("Error fetching folders:", error);
    next(new AppError("Failed to fetch folders.", 500));
  }
};

export const createFolder = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { name } = req.body;

    if (!name || typeof name !== "string") {
      return next(new AppError("Folder name is required.", 400));
    }

    const folder = await questionService.createFolder(name);

    res.status(201).json({
      message: "Folder created successfully.",
      data: { folder },
    });
  } catch (error: any) {
    if (error.message === "Folder already exists") {
      return next(new AppError(error.message, 409));
    }
    if (error.message === "Folder name is required") {
      return next(new AppError(error.message, 400));
    }
    console.error("Error creating folder:", error);
    next(new AppError("Failed to create folder.", 500));
  }
};

export const createQuestion = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const {
      questionText,
      questionImage,
      quetionVideo,
      options,
      correctAnswer,
      score,
      folder,
      keepBuzzer,
      questionContent,
      questionAssets,
      answerContent,
    } = req.body;

    const hasQuestion = Boolean(
      questionText ||
      questionContent?.text ||
      (Array.isArray(questionContent?.media) &&
        questionContent.media.length > 0),
    );

    const hasAnswer = Boolean(
      answerContent?.text ||
      (Array.isArray(answerContent?.media) && answerContent.media.length > 0),
    );

    if (!hasQuestion) {
      return next(
        new AppError(
          "Question is required (text or at least one media item).",
          400,
        ),
      );
    }

    if (!hasAnswer) {
      return next(
        new AppError(
          "Answer is required (text or at least one media item).",
          400,
        ),
      );
    }

    const normalizedOptions = Array.isArray(options)
      ? options
          .filter((opt: any) => opt?.optionText)
          .map((opt: any, index: number) => ({
            optionId: opt.optionId || String.fromCharCode(97 + index),
            optionText: String(opt.optionText),
          }))
      : [];

    const selectedCorrectAnswer =
      typeof correctAnswer === "string" && correctAnswer
        ? correctAnswer
        : normalizedOptions[0]?.optionId;

    const question = await questionService.createQuestion({
      questionText,
      questionImage,
      quetionVideo,
      options: normalizedOptions,
      correctAnswer: selectedCorrectAnswer,
      score: Number(score || 0),
      folder,
      keepBuzzer,
      questionContent,
      questionAssets,
      answerContent,
    });

    res.status(201).json({
      message: "Question created successfully.",
      data: {
        question,
      },
    });
  } catch (error) {
    console.error("Error creating question:", error);
    next(new AppError("Failed to create question.", 500));
  }
};

export const updateQuestion = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { questionId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      return next(new AppError("Invalid question ID.", 400));
    }

    const {
      questionText,
      questionImage,
      quetionVideo,
      options,
      correctAnswer,
      score,
      folder,
      keepBuzzer,
      questionContent,
      questionAssets,
      answerContent,
    } = req.body;

    const hasQuestion = Boolean(
      questionText ||
      questionContent?.text ||
      (Array.isArray(questionContent?.media) &&
        questionContent.media.length > 0),
    );

    const hasAnswer = Boolean(
      answerContent?.text ||
      (Array.isArray(answerContent?.media) && answerContent.media.length > 0),
    );

    if (!hasQuestion) {
      return next(
        new AppError(
          "Question is required (text or at least one media item).",
          400,
        ),
      );
    }

    if (!hasAnswer) {
      return next(
        new AppError(
          "Answer is required (text or at least one media item).",
          400,
        ),
      );
    }

    const normalizedOptions = Array.isArray(options)
      ? options
          .filter((opt: any) => opt?.optionText)
          .map((opt: any, index: number) => ({
            optionId: opt.optionId || String.fromCharCode(97 + index),
            optionText: String(opt.optionText),
          }))
      : [];

    const selectedCorrectAnswer =
      typeof correctAnswer === "string" && correctAnswer
        ? correctAnswer
        : normalizedOptions[0]?.optionId;

    const question = await questionService.updateQuestion(questionId, {
      questionText,
      questionImage,
      quetionVideo,
      options: normalizedOptions,
      correctAnswer: selectedCorrectAnswer,
      score: Number(score || 0),
      folder,
      keepBuzzer,
      questionContent,
      questionAssets,
      answerContent,
    });

    res.status(200).json({
      message: "Question updated successfully.",
      data: {
        question,
      },
    });
  } catch (error: any) {
    console.error("Error updating question:", error);
    if (error.message === "Question not found") {
      return next(new AppError(error.message, 404));
    }
    next(new AppError("Failed to update question.", 500));
  }
};

export const deleteQuestion = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { questionId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      return next(new AppError("Invalid question ID.", 400));
    }

    await questionService.deleteQuestion(questionId);

    res.status(200).json({
      message: "Question deleted successfully.",
      success: true,
    });
  } catch (error: any) {
    console.error("Error deleting question:", error);
    if (error.message === "Question not found") {
      return next(new AppError(error.message, 404));
    }
    next(new AppError("Failed to delete question.", 500));
  }
};

export const uploadQuestionMedia = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.file) {
      return next(new AppError("File is required.", 400));
    }

    const savedFile = await FileService.uploadFile({
      originalName: req.file.originalname,
      fileName: req.file.key || req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      location: req.file.location || "",
      bucket: req.file.bucket || "",
      etag: req.file.etag || "",
    });

    const mediaType = req.file.mimetype.startsWith("image/")
      ? req.file.mimetype === "image/gif"
        ? "gif"
        : "image"
      : req.file.mimetype.startsWith("video/")
        ? "video"
        : req.file.mimetype.startsWith("audio/")
          ? "audio"
          : "file";

    res.status(201).json({
      message: "Media uploaded successfully.",
      data: {
        media: {
          type: mediaType,
          url: req.file.location,
          mimeType: req.file.mimetype,
          name: req.file.originalname,
          fileId: savedFile._id,
        },
      },
    });
  } catch (error) {
    console.error("Error uploading media:", error);
    next(new AppError("Failed to upload media.", 500));
  }
};

/**
 * Fetch current question for the session
 * GET /api/v1/questions/current
 * Requires authentication (Team)
 */
export const fetchCurrentQuestion = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const sessionId = req.user?.sessionId;

    if (!sessionId) {
      return next(new AppError("Session ID not found in token.", 401));
    }

    // Fetch game state to get current question index
    const gameState =
      await gameStateService.fetchGameStateBySessionId(sessionId);
    if (!gameState) {
      return next(new AppError("Game state not found.", 404));
    }

    // Fetch the current question
    const question = await questionService.fetchCurrentQuestion(
      sessionId,
      gameState.currentQuestionIndex,
    );

    if (!question) {
      return next(new AppError("Current question not found.", 404));
    }

    // Determine if we can reveal the answer
    const canRevealAnswer = gameState.gameStatus === GameStatus.IDLE;

    // Remove correct answer for team
    const questionForTeam: any = {
      _id: question._id,
      questionText: question.questionText,
      questionImage: question.questionImage,
      quetionVideo: question.quetionVideo,
      options: question.options.map((opt) => ({
        optionId: opt.optionId,
        optionText: opt.optionText,
      })),
      questionContent: question.questionContent,
      score: question.score,
      keepBuzzer: question.keepBuzzer,
      questionAssets: question.questionAssets,
      createdAt: question.createdAt,
      updatedAt: question.updatedAt,
    };

    if (canRevealAnswer) {
      questionForTeam.correctAnswer = question.correctAnswer;
      questionForTeam.answerContent = question.answerContent;
    }

    res.status(200).json({
      message: "Current question fetched successfully.",
      data: {
        question: questionForTeam,
        currentQuestionIndex: gameState.currentQuestionIndex,
      },
    });
  } catch (error: any) {
    console.error("Error fetching current question:", error);
    if (error.message === "Session not found") {
      return next(new AppError(error.message, 404));
    }
    next(new AppError("Failed to fetch current question.", 500));
  }
};

/**
 * Send response to a question
 * POST /api/v1/questions/:questionId/response
 * Body: { responseOptionId: string }
 * Requires authentication (Team)
 */
export const sendQuestionResponse = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { questionId } = req.params;
    const { responseOptionId } = req.body;
    const teamId = req.user?.id;
    const sessionId = req.user?.sessionId;

    // Validation
    if (!teamId || !sessionId) {
      return next(
        new AppError("Team ID or Session ID not found in token.", 401),
      );
    }

    if (!responseOptionId) {
      return next(new AppError("Response option ID is required.", 400));
    }

    // Validate responseOptionId format (should be a single lowercase letter)
    if (
      typeof responseOptionId !== "string" ||
      !/^[a-z]$/.test(responseOptionId)
    ) {
      return next(
        new AppError(
          "Invalid response option ID. Must be a single lowercase letter (a-z).",
          400,
        ),
      );
    }

    if (!mongoose.Types.ObjectId.isValid(questionId)) {
      return next(new AppError("Invalid question ID.", 400));
    }

    // Fetch game state
    const gameState =
      await gameStateService.fetchGameStateBySessionId(sessionId);
    if (!gameState) {
      return next(new AppError("Game state not found.", 404));
    }

    // Check if the game status is ANSWERING
    // if (gameState.gameStatus !== GameStatus.ANSWERING) {
    //     return next(
    //         new AppError("Questions can only be answered during the answering phase.", 403)
    //     );
    // }

    // // Check if this team is the current answering team
    // if (!gameState.currentAnsweringTeam ||
    //     gameState.currentAnsweringTeam.toString() !== teamId.toString()) {
    //     return next(
    //         new AppError("Only the current answering team can submit a response.", 403)
    //     );
    // }

    // // Check if the question belongs to the current session
    // const currentQuestion = await questionService.fetchCurrentQuestion(
    //     sessionId,
    //     gameState.currentQuestionIndex
    // );

    // if (!currentQuestion || (currentQuestion as any)._id.toString() !== questionId) {
    //     return next(
    //         new AppError("Question does not match the current question.", 400)
    //     );
    // }

    // Create question response
    const questionResponse = await questionService.createQuestionResponse(
      questionId,
      teamId,
      responseOptionId,
    );

    // Validate answer and update score
    const result = await questionService.validateAndUpdateScore(
      questionId,
      teamId,
      responseOptionId,
    );

    // Cancel the answering timer since answer was submitted
    timerManager.cancelTimer(
      `answering-${sessionId.toString()}-${teamId.toString()}`,
    );

    // Transition to IDLE state after answer is submitted
    const idleGameState = await gameStateService.transitionToIdle(sessionId);

    // Emit ANSWER_SUBMITTED event to admins and presenter
    try {
      SessionEmitters.toSessionAdmins(sessionId, Events.ANSWER_SUBMITTED, {
        teamId,
        questionId,
        responseOptionId,
        isCorrect: result.isCorrect,
        pointsAwarded: result.pointsAwarded,
        timestamp: Date.now(),
      });
    } catch (socketError) {
      console.error("Error emitting ANSWER_SUBMITTED event:", socketError);
      // Don't fail the request if socket emission fails
    }

    // Emit game state change to IDLE
    try {
      SessionEmitters.toSession(sessionId, Events.GAME_STATE_CHANGED, {
        gameStatus: idleGameState.gameStatus,
        currentQuestionIndex: idleGameState.currentQuestionIndex,
        currentAnsweringTeam: idleGameState.currentAnsweringTeam,
        idleStartTime: idleGameState.idleStartTime,
      });
    } catch (socketError) {
      console.error("Error emitting GAME_STATE_CHANGED event:", socketError);
    }

    res.status(201).json({
      message: "Response submitted successfully.",
      data: {
        questionResponse: {
          _id: questionResponse._id,
          questionId: questionResponse.questionId,
          teamId: questionResponse.team,
          responseOptionId: questionResponse.response,
          createdAt: questionResponse.createdAt,
        },
        isCorrect: result.isCorrect,
        pointsAwarded: result.pointsAwarded,
      },
    });
  } catch (error: any) {
    console.error("Error submitting question response:", error);
    if (error.message === "Team has already responded to this question") {
      return next(new AppError(error.message, 409));
    }
    if (
      error.message === "Question not found" ||
      error.message === "Game state not found"
    ) {
      return next(new AppError(error.message, 404));
    }
    next(new AppError("Failed to submit response.", 500));
  }
};
