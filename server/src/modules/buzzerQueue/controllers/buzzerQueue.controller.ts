import { NextFunction, Request, Response } from 'express';
import AppError from '../../../utils/appError';
import BuzzerQueueService from '../services/buzzerQueue.service';
import GameStateService from '../../gameState/services/gameState.service';
import QuestionService from '../../questions/services/question.service';

const buzzerQueueService = new BuzzerQueueService();
const gameStateService = new GameStateService();
const questionService = new QuestionService();

/**
 * Fetch buzzer leaderboard for the current question
 * GET /api/v1/buzzer/leaderboard
 * Requires authentication
 */
export const fetchBuzzerLeaderboard = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const sessionId = req.user?.sessionId;

        if (!sessionId) {
            return next(new AppError("Session ID not found in token.", 401));
        }

        // Fetch game state to get current question
        const gameState = await gameStateService.fetchGameStateBySessionId(sessionId);
        if (!gameState) {
            return next(new AppError("Game state not found.", 404));
        }

        // Fetch current question
        const currentQuestion = await questionService.fetchCurrentQuestion(
            sessionId,
            gameState.currentQuestionIndex
        );

        if (!currentQuestion) {
            return next(new AppError("Current question not found.", 404));
        }

        // Fetch buzzer leaderboard
        const leaderboard = await buzzerQueueService.fetchBuzzerLeaderboard(
            (currentQuestion as any)._id,
            sessionId
        );

        // Format the leaderboard data
        const formattedLeaderboard = leaderboard.map((entry, index) => ({
            rank: index + 1,
            teamId: (entry.teamId as any)._id,
            teamNumber: (entry.teamId as any).teamNumber,
            teamName: (entry.teamId as any).teamName,
            teamScore: (entry.teamId as any).teamScore,
            timestamp: entry.timestamp.toString(),
            pressedAt: entry.createdAt,
        }));

        res.status(200).json({
            message: "Buzzer leaderboard fetched successfully.",
            data: {
                leaderboard: formattedLeaderboard,
                totalTeams: formattedLeaderboard.length,
                questionId: (currentQuestion as any)._id,
            },
        });
    } catch (error: any) {
        console.error("Error fetching buzzer leaderboard:", error);
        if (error.message === "Game state not found" || error.message === "Session not found") {
            return next(new AppError(error.message, 404));
        }
        next(new AppError("Failed to fetch buzzer leaderboard.", 500));
    }
};

/**
 * Get buzzer leaderboard for a specific question (Admin)
 * GET /api/v1/buzzer/leaderboard/:questionId
 * Requires admin authentication
 */
export const fetchBuzzerLeaderboardByQuestion = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { questionId } = req.params;
        const sessionId = req.user?.sessionId;

        if (!sessionId) {
            return next(new AppError("Session ID not found in token.", 401));
        }

        // Fetch buzzer leaderboard for the specific question
        const leaderboard = await buzzerQueueService.fetchBuzzerLeaderboard(
            questionId,
            sessionId
        );

        // Format the leaderboard data
        const formattedLeaderboard = leaderboard.map((entry, index) => ({
            rank: index + 1,
            teamId: (entry.teamId as any)._id,
            teamNumber: (entry.teamId as any).teamNumber,
            teamName: (entry.teamId as any).teamName,
            teamScore: (entry.teamId as any).teamScore,
            timestamp: entry.timestamp.toString(),
            pressedAt: entry.createdAt,
        }));

        res.status(200).json({
            message: "Buzzer leaderboard fetched successfully.",
            data: {
                leaderboard: formattedLeaderboard,
                totalTeams: formattedLeaderboard.length,
                questionId,
            },
        });
    } catch (error) {
        console.error("Error fetching buzzer leaderboard:", error);
        next(new AppError("Failed to fetch buzzer leaderboard.", 500));
    }
};
