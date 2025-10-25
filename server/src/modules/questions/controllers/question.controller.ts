import { NextFunction, Request, Response } from 'express';
import AppError from '../../../utils/appError';
import QuestionService from '../services/question.service';
import GameStateService from '../../gameState/services/gameState.service';
import { GameStatus } from '../../gameState/types/enums';
import mongoose from 'mongoose';
import { SessionEmitters } from '../../../services/socket/sessionEmitters';
import { Events } from '../../../services/socket/enums/Events';

const questionService = new QuestionService();
const gameStateService = new GameStateService();

/**
 * Fetch current question for the session
 * GET /api/v1/questions/current
 * Requires authentication (Team)
 */
export const fetchCurrentQuestion = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const sessionId = req.user?.sessionId;

        if (!sessionId) {
            return next(new AppError("Session ID not found in token.", 401));
        }

        // Fetch game state to get current question index
        const gameState = await gameStateService.fetchGameStateBySessionId(sessionId);
        if (!gameState) {
            return next(new AppError("Game state not found.", 404));
        }

        // Fetch the current question
        const question = await questionService.fetchCurrentQuestion(
            sessionId,
            gameState.currentQuestionIndex
        );

        if (!question) {
            return next(new AppError("Current question not found.", 404));
        }

        // Remove correct answer for team
        const questionForTeam = {
            _id: question._id,
            questionText: question.questionText,
            questionImage: question.questionImage,
            quetionVideo: question.quetionVideo,
            options: question.options.map(opt => ({
                optionId: opt.optionId,
                optionText: opt.optionText,
            })),
            createdAt: question.createdAt,
            updatedAt: question.updatedAt,
        };

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
    next: NextFunction
) => {
    try {
        const { questionId } = req.params;
        const { responseOptionId } = req.body;
        const teamId = req.user?.id;
        const sessionId = req.user?.sessionId;
        console.log("Received responseOptionId:", responseOptionId);

        // Validation
        if (!teamId || !sessionId) {
            return next(new AppError("Team ID or Session ID not found in token.", 401));
        }

        if (!responseOptionId) {
            return next(new AppError("Response option ID is required.", 400));
        }

        // Validate responseOptionId format (should be a single lowercase letter)
        if (typeof responseOptionId !== 'string' || !/^[a-z]$/.test(responseOptionId)) {
            return next(new AppError("Invalid response option ID. Must be a single lowercase letter (a-z).", 400));
        }

        if (!mongoose.Types.ObjectId.isValid(questionId)) {
            return next(new AppError("Invalid question ID.", 400));
        }

        // Fetch game state
        const gameState = await gameStateService.fetchGameStateBySessionId(sessionId);
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
            responseOptionId
        );

        // Validate answer and update score
        const result = await questionService.validateAndUpdateScore(
            questionId,
            teamId,
            responseOptionId,
            150 // Points for correct answer
        );

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
        if (error.message === "Question not found" || error.message === "Game state not found") {
            return next(new AppError(error.message, 404));
        }
        next(new AppError("Failed to submit response.", 500));
    }
};
