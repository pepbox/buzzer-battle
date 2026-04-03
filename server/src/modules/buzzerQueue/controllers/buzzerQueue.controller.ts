import { NextFunction, Request, Response } from 'express';
import AppError from '../../../utils/appError';
import BuzzerQueueService from '../services/buzzerQueue.service';
import GameStateService from '../../gameState/services/gameState.service';
import QuestionService from '../../questions/services/question.service';
import TeamService from '../../teams/services/team.service';
import { Types } from 'mongoose';
import { SessionEmitters } from '../../../services/socket/sessionEmitters';
import { Events } from '../../../services/socket/enums/Events';
import { GameStatus } from '../../gameState/types/enums';

const buzzerQueueService = new BuzzerQueueService();
const gameStateService = new GameStateService();
const questionService = new QuestionService();
const teamService = new TeamService();

/**
 * Press buzzer for current question
 * POST /api/v1/buzzer/press
 * Requires authentication
 */
export const pressBuzzer = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const teamId = req.user?.id; // This is the team ID when authenticated as TEAM
        const sessionId = req.user?.sessionId;
        const { timestamp } = req.body;

        if (!teamId || !sessionId) {
            return next(new AppError("Team ID or Session ID not found in token.", 401));
        }

        if (!timestamp) {
            return next(new AppError("Timestamp is required.", 400));
        }

        const normalizedTimestamp = Number(timestamp);
        if (!Number.isFinite(normalizedTimestamp)) {
            return next(new AppError("Invalid buzzer timestamp.", 400));
        }

        const roundedTimestamp = Math.round(normalizedTimestamp);

        // Fetch game state to get current question
        const gameState = await gameStateService.fetchGameStateBySessionId(sessionId);
        if (!gameState) {
            return next(new AppError("Game state not found.", 404));
        }

        if (gameState.gameStatus !== GameStatus.BUZZER_ROUND) {
            return next(
                new AppError(
                    "Buzzer can only be pressed during the buzzer round.",
                    400
                )
            );
        }

        if (
            gameState.buzzerRoundStartTime &&
            roundedTimestamp < gameState.buzzerRoundStartTime
        ) {
            return next(
                new AppError(
                    "Buzzer pressed too early! Wait for the countdown.",
                    400
                )
            );
        }

        // Fetch current question
        const currentQuestion = await questionService.fetchCurrentQuestion(
            sessionId,
            gameState.currentQuestionIndex
        );

        if (!currentQuestion) {
            return next(new AppError("Current question not found.", 404));
        }

        const questionId = (currentQuestion as any)._id;

        // Check if team has already pressed buzzer for this question
        const hasPressed = await buzzerQueueService.checkIfTeamPressed(
            questionId,
            teamId
        );

        if (hasPressed) {
            return next(new AppError("You have already pressed the buzzer for this question.", 400));
        }

        // Calculate TTL (10 minutes from now)
        const ttl = new Date();
        ttl.setMinutes(ttl.getMinutes() + 10);
        const reactionTimeMs = gameState.buzzerRoundStartTime
            ? Math.max(0, roundedTimestamp - gameState.buzzerRoundStartTime)
            : 0;

        // Create buzzer entry
        const buzzerEntry = await buzzerQueueService.createBuzzerEntry({
            gameStateId: (gameState as any)._id,
            sessionId: new Types.ObjectId(sessionId),
            teamId: new Types.ObjectId(teamId),
            questionId,
            timestamp: BigInt(roundedTimestamp),
            reactionTimeMs,
            ttl,
        });
        await teamService.recordBuzzerReactionTime(teamId, reactionTimeMs);

        // Get current rank by counting entries with smaller timestamp
        const leaderboard = await buzzerQueueService.fetchBuzzerLeaderboard(
            questionId,
            sessionId
        );
        const rank = leaderboard.findIndex(
            (entry) => (entry.teamId as any)._id.toString() === teamId
        ) + 1;

        // Get team details from leaderboard
        const teamEntry = leaderboard.find(
            (entry) => (entry.teamId as any)._id.toString() === teamId
        );
        const teamName = teamEntry ? (teamEntry.teamId as any).teamName : 'Unknown Team';

        // Emit buzzer pressed event to all teams in the session
        SessionEmitters.toSession(sessionId, Events.BUZZER_PRESSED, {
            teamId,
            teamName,
            rank,
            timestamp: roundedTimestamp.toString(),
            reactionTimeMs,
            questionId: questionId.toString(),
            totalTeamsPressed: leaderboard.length,
        });

        res.status(201).json({
            message: "Buzzer pressed successfully.",
            data: {
                rank,
                teamId,
                timestamp: roundedTimestamp.toString(),
                buzzerEntry: {
                    _id: (buzzerEntry as any)._id,
                    questionId: buzzerEntry.questionId,
                    timestamp: buzzerEntry.timestamp.toString(),
                    reactionTimeMs: buzzerEntry.reactionTimeMs,
                    createdAt: buzzerEntry.createdAt,
                },
            },
        });
    } catch (error: any) {
        console.error("Error pressing buzzer:", error);
        if (error.message === "Game state not found" || error.message === "Session not found") {
            return next(new AppError(error.message, 404));
        }
        next(new AppError("Failed to press buzzer.", 500));
    }
};

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
            reactionTimeMs: entry.reactionTimeMs,
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
            reactionTimeMs: entry.reactionTimeMs,
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

/**
 * Get live buzzer statistics for current question (Admin)
 * GET /api/v1/buzzer/stats
 * Returns: fastest team, teams pressed count, teams remaining count
 * Requires authentication
 */
export const fetchBuzzerStats = async (
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

        // Fetch buzzer leaderboard for current question
        const leaderboard = await buzzerQueueService.fetchBuzzerLeaderboard(
            (currentQuestion as any)._id,
            sessionId
        );

        // Get total teams in session
        const totalTeams = await teamService.fetchTotalTeamsInSession(sessionId);

        // Calculate teams pressed and remaining
        const teamsPressed = leaderboard.length;
        const teamsRemaining = totalTeams - teamsPressed;

        // Get fastest team (first in leaderboard)
        const fastestTeam = leaderboard.length > 0 ? {
            teamId: (leaderboard[0].teamId as any)._id,
            teamNumber: (leaderboard[0].teamId as any).teamNumber,
            teamName: (leaderboard[0].teamId as any).teamName,
            timestamp: leaderboard[0].timestamp.toString(),
            reactionTimeMs: leaderboard[0].reactionTimeMs,
            pressedAt: leaderboard[0].createdAt,
        } : null;

        res.status(200).json({
            message: "Buzzer statistics fetched successfully.",
            data: {
                fastestTeam,
                teamsPressed,
                teamsRemaining,
                totalTeams,
            },
        });
    } catch (error: any) {
        console.error("Error fetching buzzer stats:", error);
        if (error.message === "Game state not found" || error.message === "Session not found") {
            return next(new AppError(error.message, 404));
        }
        if (error.message === "Session not found or numberOfTeams not set") {
            return next(new AppError("Session configuration error.", 500));
        }
        next(new AppError("Failed to fetch buzzer statistics.", 500));
    }
};
