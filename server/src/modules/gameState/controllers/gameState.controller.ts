import { NextFunction, Request, Response } from 'express';
import AppError from '../../../utils/appError';
import GameStateService from '../services/gameState.service';
import QuestionService from '../../questions/services/question.service';
import TeamService from '../../teams/services/team.service';
import { GameStatus } from '../types/enums';
import { SessionEmitters } from '../../../services/socket/sessionEmitters';
import { Events } from '../../../services/socket/enums/Events';

const gameStateService = new GameStateService();
const questionService = new QuestionService();
const teamService = new TeamService();

/**
 * Fetch current game state for the session
 * GET /api/v1/game-state/current
 * Requires authentication
 */
export const fetchGameState = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const sessionId = req.user?.sessionId;

        if (!sessionId) {
            return next(new AppError("Session ID not found in token.", 401));
        }

        let gameState = await gameStateService.fetchGameStateBySessionId(sessionId);

        // If game state doesn't exist, create one
        if (!gameState) {
            gameState = await gameStateService.createGameState(sessionId);
        }

        res.status(200).json({
            message: "Game state fetched successfully.",
            data: {
                gameState,
            },
        });
    } catch (error) {
        console.error("Error fetching game state:", error);
        next(new AppError("Failed to fetch game state.", 500));
    }
};

/**
 * Unified game state update controller (ADMIN only)
 * PATCH /api/v1/game-state
 * Body: { action: string, payload?: any }
 * Requires admin authentication
 */
export const updateGameStateUnified = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const sessionId = req.user?.sessionId;
        const { action, payload } = req.body;

        if (!sessionId) {
            return next(new AppError("Session ID not found in token.", 401));
        }

        if (!action) {
            return next(new AppError("Action is required.", 400));
        }

        let gameState;
        let additionalData: any = {};

        switch (action) {
            case 'START_BUZZER_ROUND':
                const startTime = Date.now();
                gameState = await gameStateService.startBuzzerRound(sessionId);
                
                // Get current question
                const currentQuestion = await questionService.fetchCurrentQuestion(
                    sessionId,
                    gameState.currentQuestionIndex
                );
                
                // Emit BUZZER_ROUND_STARTED with timestamp for synced timer
                SessionEmitters.toSession(sessionId, Events.BUZZER_ROUND_STARTED, {
                    questionId: currentQuestion?._id,
                    questionIndex: gameState.currentQuestionIndex,
                    startTime,
                    duration: 30000, // 30 seconds for buzzer round
                });
                
                // Also emit general game state change
                SessionEmitters.toSession(sessionId, Events.GAME_STATE_CHANGED, {
                    gameStatus: gameState.gameStatus,
                    currentQuestionIndex: gameState.currentQuestionIndex,
                    currentAnsweringTeam: gameState.currentAnsweringTeam,
                    buzzerStartTime: startTime,
                });
                break;

            case 'PAUSE':
                gameState = await gameStateService.pauseGame(sessionId);
                
                // Emit socket event
                SessionEmitters.toSession(sessionId, Events.GAME_STATE_CHANGED, {
                    gameStatus: gameState.gameStatus,
                    currentQuestionIndex: gameState.currentQuestionIndex,
                    currentAnsweringTeam: gameState.currentAnsweringTeam,
                });
                break;

            case 'RESUME':
                gameState = await gameStateService.resumeGame(sessionId);
                
                // Emit socket event
                SessionEmitters.toSession(sessionId, Events.GAME_STATE_CHANGED, {
                    gameStatus: gameState.gameStatus,
                    currentQuestionIndex: gameState.currentQuestionIndex,
                    currentAnsweringTeam: gameState.currentAnsweringTeam,
                });
                break;

            case 'NEXT_QUESTION':
                const result = await gameStateService.moveToNextQuestionWithCheck(sessionId);
                gameState = result.gameState;
                additionalData.gameEnded = result.gameEnded;

                if (result.gameEnded) {
                    // Fetch final leaderboard
                    const finalLeaderboard = await teamService.fetchOverallLeaderboard(sessionId);
                    additionalData.finalLeaderboard = finalLeaderboard;

                    // Emit game ended event
                    SessionEmitters.toSession(sessionId, Events.GAME_ENDED, {
                        finalLeaderboard,
                    });
                } else {
                    // Emit normal game state change
                    SessionEmitters.toSession(sessionId, Events.GAME_STATE_CHANGED, {
                        gameStatus: gameState.gameStatus,
                        currentQuestionIndex: gameState.currentQuestionIndex,
                        currentAnsweringTeam: gameState.currentAnsweringTeam,
                    });
                }
                break;

            case 'SHOW_LEADERBOARD':
                gameState = await gameStateService.showLeaderboard(sessionId);
                
                // Fetch current leaderboard
                const leaderboard = await teamService.fetchOverallLeaderboard(sessionId);
                additionalData.leaderboard = leaderboard;

                // Emit show leaderboard event
                SessionEmitters.toSession(sessionId, Events.SHOW_LEADERBOARD, {
                    leaderboard,
                });
                
                // Also emit game state change
                SessionEmitters.toSession(sessionId, Events.GAME_STATE_CHANGED, {
                    gameStatus: gameState.gameStatus,
                    currentQuestionIndex: gameState.currentQuestionIndex,
                    currentAnsweringTeam: gameState.currentAnsweringTeam,
                });
                break;

            case 'PASS_TO_SECOND_TEAM':
                if (!payload?.questionId) {
                    return next(new AppError("Question ID is required for PASS_TO_SECOND_TEAM action.", 400));
                }

                gameState = await gameStateService.passToSecondTeam(
                    sessionId,
                    payload.questionId
                );

                const secondChanceStartTime = Date.now();

                // Emit socket event with second chance info and timestamp
                SessionEmitters.toSession(sessionId, Events.SECOND_CHANCE, {
                    teamId: gameState.currentAnsweringTeam,
                    gameStatus: gameState.gameStatus,
                    startTime: secondChanceStartTime,
                    duration: 60000, // 60 seconds for answering
                });

                // Emit answering round started to the specific team
                SessionEmitters.toTeam(sessionId, gameState.currentAnsweringTeam?.toString() || '', Events.ANSWERING_ROUND_STARTED, {
                    questionId: payload.questionId,
                    startTime: secondChanceStartTime,
                    duration: 60000,
                });

                SessionEmitters.toSession(sessionId, Events.GAME_STATE_CHANGED, {
                    gameStatus: gameState.gameStatus,
                    currentQuestionIndex: gameState.currentQuestionIndex,
                    currentAnsweringTeam: gameState.currentAnsweringTeam,
                    answeringStartTime: secondChanceStartTime,
                });
                break;

            case 'SET_ANSWERING_TEAM':
                if (!payload?.teamId) {
                    return next(new AppError("Team ID is required for SET_ANSWERING_TEAM action.", 400));
                }

                gameState = await gameStateService.setAnsweringTeam(
                    sessionId,
                    payload.teamId
                );

                const answeringStartTime = Date.now();

                // Emit team selected event
                SessionEmitters.toSession(sessionId, Events.TEAM_SELECTED, {
                    teamId: gameState.currentAnsweringTeam,
                    startTime: answeringStartTime,
                });

                // Emit answering round started to the specific team
                const questionForAnswering = await questionService.fetchCurrentQuestion(
                    sessionId,
                    gameState.currentQuestionIndex
                );
                
                SessionEmitters.toTeam(sessionId, payload.teamId, Events.ANSWERING_ROUND_STARTED, {
                    questionId: questionForAnswering?._id,
                    startTime: answeringStartTime,
                    duration: 60000, // 60 seconds
                });

                SessionEmitters.toSession(sessionId, Events.GAME_STATE_CHANGED, {
                    gameStatus: gameState.gameStatus,
                    currentQuestionIndex: gameState.currentQuestionIndex,
                    currentAnsweringTeam: gameState.currentAnsweringTeam,
                    answeringStartTime,
                });
                break;

            case 'AUTO_SELECT_FASTEST_TEAM':
                if (!payload?.questionId) {
                    return next(new AppError("Question ID is required for AUTO_SELECT_FASTEST_TEAM action.", 400));
                }

                gameState = await gameStateService.autoSelectFastestTeam(
                    sessionId,
                    payload.questionId
                );

                const autoSelectStartTime = Date.now();

                // Emit team selected event
                SessionEmitters.toSession(sessionId, Events.TEAM_SELECTED, {
                    teamId: gameState.currentAnsweringTeam,
                    startTime: autoSelectStartTime,
                });

                // Emit answering round started to the selected team
                SessionEmitters.toTeam(sessionId, gameState.currentAnsweringTeam?.toString() || '', Events.ANSWERING_ROUND_STARTED, {
                    questionId: payload.questionId,
                    startTime: autoSelectStartTime,
                    duration: 60000,
                });

                SessionEmitters.toSession(sessionId, Events.GAME_STATE_CHANGED, {
                    gameStatus: gameState.gameStatus,
                    currentQuestionIndex: gameState.currentQuestionIndex,
                    currentAnsweringTeam: gameState.currentAnsweringTeam,
                    answeringStartTime: autoSelectStartTime,
                });
                break;

            default:
                return next(new AppError(`Invalid action: ${action}`, 400));
        }

        res.status(200).json({
            message: `Action ${action} completed successfully.`,
            data: {
                gameState,
                ...additionalData,
            },
        });
    } catch (error: any) {
        console.error(`Error executing game state action:`, error);
        
        // Handle specific errors
        if (error.message === "Game state not found" || error.message === "Session not found") {
            return next(new AppError(error.message, 404));
        }
        if (error.message === "No second team available in buzzer queue") {
            return next(new AppError(error.message, 400));
        }
        if (error.message === "No teams in buzzer queue") {
            return next(new AppError(error.message, 400));
        }
        
        next(new AppError(`Failed to execute action: ${error.message}`, 500));
    }
};

// Keep old methods for backward compatibility (deprecated)
/**
 * @deprecated Use updateGameStateUnified instead
 * Update game status (ADMIN only)
 * PATCH /api/v1/game-state/status
 * Body: { status: "paused" | "buzzer_round" | "answering", currentAnsweringTeam?: teamId }
 * Requires admin authentication
 */
export const updateGameStatus = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const sessionId = req.user?.sessionId;
        const { status, currentAnsweringTeam } = req.body;

        if (!sessionId) {
            return next(new AppError("Session ID not found in token.", 401));
        }

        // Validate status
        if (!status || !Object.values(GameStatus).includes(status)) {
            return next(
                new AppError(
                    `Invalid status. Must be one of: ${Object.values(GameStatus).join(", ")}`,
                    400
                )
            );
        }

        // Update game state
        const updates: any = { gameStatus: status };
        
        if (currentAnsweringTeam !== undefined) {
            updates.currentAnsweringTeam = currentAnsweringTeam;
        }

        const gameState = await gameStateService.updateGameState(sessionId, updates);

        // Emit socket event to all users in the session
        try {
            SessionEmitters.toSession(sessionId, Events.GAME_STATE_CHANGED, {
                gameStatus: gameState.gameStatus,
                currentQuestionIndex: gameState.currentQuestionIndex,
                currentAnsweringTeam: gameState.currentAnsweringTeam,
            });
        } catch (socketError) {
            console.error("Error emitting game state change:", socketError);
            // Continue even if socket emission fails
        }

        res.status(200).json({
            message: "Game status updated successfully.",
            data: {
                gameState,
            },
        });
    } catch (error: any) {
        console.error("Error updating game status:", error);
        if (error.message === "Game state not found") {
            return next(new AppError(error.message, 404));
        }
        next(new AppError("Failed to update game status.", 500));
    }
};

/**
 * Move to next question (ADMIN only)
 * POST /api/v1/game-state/next-question
 * Requires admin authentication
 */
export const moveToNextQuestion = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const sessionId = req.user?.sessionId;

        if (!sessionId) {
            return next(new AppError("Session ID not found in token.", 401));
        }

        const gameState = await gameStateService.moveToNextQuestion(sessionId);

        // Emit socket event to all users in the session
        try {
            SessionEmitters.toSession(sessionId, Events.GAME_STATE_CHANGED, {
                gameStatus: gameState.gameStatus,
                currentQuestionIndex: gameState.currentQuestionIndex,
                currentAnsweringTeam: gameState.currentAnsweringTeam,
            });
        } catch (socketError) {
            console.error("Error emitting game state change:", socketError);
        }

        res.status(200).json({
            message: "Moved to next question successfully.",
            data: {
                gameState,
            },
        });
    } catch (error: any) {
        console.error("Error moving to next question:", error);
        if (error.message === "Game state not found") {
            return next(new AppError(error.message, 404));
        }
        next(new AppError("Failed to move to next question.", 500));
    }
};
