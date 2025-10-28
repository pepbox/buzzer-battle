import { NextFunction, Request, Response } from 'express';
import { Types } from 'mongoose';
import AppError from '../../../utils/appError';
import GameStateService from '../services/gameState.service';
import QuestionService from '../../questions/services/question.service';
import TeamService from '../../teams/services/team.service';
import { GameStatus } from '../types/enums';
import { SessionEmitters } from '../../../services/socket/sessionEmitters';
import { Events } from '../../../services/socket/enums/Events';
import { timerManager } from '../../../services/timerManager';
import { Session } from '../../session/models/session.model';

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
            case 'PAUSE':
                // Cancel any active timers for this session
                timerManager.cancelSessionTimers(sessionId);
                
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
                // Cancel any active timers for this session
                timerManager.cancelSessionTimers(sessionId);
                
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
                    // Game is continuing - start buzzer round for this question
                    const buzzerStartTime = Date.now();
                    
                    // Update to BUZZER_ROUND status and save timestamp
                    gameState = await gameStateService.startBuzzerRound(sessionId);
                    
                    // Get current question
                    const currentQuestion = await questionService.fetchCurrentQuestion(
                        sessionId,
                        gameState.currentQuestionIndex
                    );

                    // Get session to fetch questionTimeLimit
                    const session = await Session.findById(sessionId);
                    const buzzerDuration = session?.questionTimeLimit || 30; // Default 30 seconds
                    
                    // Schedule auto-transition to ANSWERING after buzzer duration
                    timerManager.scheduleBuzzerTimer(
                        sessionId,
                        buzzerDuration,
                        async () => {
                            try {
                                const updatedGameState = await gameStateService.transitionToAnswering(
                                    sessionId,
                                    currentQuestion?._id as Types.ObjectId
                                );

                                // Get answer duration from session
                                const answerDuration = session?.answerTimeLimit || 60;

                                // Emit ANSWERING_ROUND_STARTED
                                SessionEmitters.toSession(sessionId, Events.ANSWERING_ROUND_STARTED, {
                                    questionId: currentQuestion?._id as Types.ObjectId,
                                    teamId: updatedGameState.currentAnsweringTeam,
                                    startTime: updatedGameState.answeringRoundStartTime,
                                    duration: answerDuration * 1000,
                                });

                                // Emit game state change
                                SessionEmitters.toSession(sessionId, Events.GAME_STATE_CHANGED, {
                                    gameStatus: updatedGameState.gameStatus,
                                    currentQuestionIndex: updatedGameState.currentQuestionIndex,
                                    currentAnsweringTeam: updatedGameState.currentAnsweringTeam,
                                    answeringStartTime: updatedGameState.answeringRoundStartTime,
                                    buzzerRoundStartTime: updatedGameState.buzzerRoundStartTime,
                                });

                                // Schedule auto-transition to IDLE after answer duration
                                if (updatedGameState.currentAnsweringTeam) {
                                    timerManager.scheduleAnsweringTimer(
                                        sessionId,
                                        updatedGameState.currentAnsweringTeam,
                                        answerDuration,
                                        async () => {
                                            const idleGameState = await gameStateService.transitionToIdle(sessionId);
                                            
                                            // Emit transition to IDLE
                                            SessionEmitters.toSession(sessionId, Events.GAME_STATE_CHANGED, {
                                                gameStatus: idleGameState.gameStatus,
                                                currentQuestionIndex: idleGameState.currentQuestionIndex,
                                                currentAnsweringTeam: idleGameState.currentAnsweringTeam,
                                                idleStartTime: idleGameState.idleStartTime,
                                            });
                                        }
                                    );
                                }
                            } catch (error) {
                                console.error('Error in auto-transition to ANSWERING:', error);
                            }
                        }
                    );
                    
                    // Emit BUZZER_ROUND_STARTED with timestamp for synced timer
                    SessionEmitters.toSession(sessionId, Events.BUZZER_ROUND_STARTED, {
                        questionId: currentQuestion?._id,
                        questionIndex: gameState.currentQuestionIndex,
                        startTime: buzzerStartTime,
                        duration: buzzerDuration * 1000,
                    });
                    
                    // Also emit general game state change
                    SessionEmitters.toSession(sessionId, Events.GAME_STATE_CHANGED, {
                        gameStatus: gameState.gameStatus,
                        currentQuestionIndex: gameState.currentQuestionIndex,
                        currentAnsweringTeam: gameState.currentAnsweringTeam,
                        buzzerStartTime: buzzerStartTime,
                    });
                }
                break;

            case 'PASS_TO_SECOND_TEAM':
                if (!payload?.questionId) {
                    return next(new AppError("Question ID is required for PASS_TO_SECOND_TEAM action.", 400));
                }

                // Cancel previous answering timer
                timerManager.cancelTimer(`answering-${sessionId.toString()}-*`);

                gameState = await gameStateService.passToSecondTeam(
                    sessionId,
                    payload.questionId
                );

                const secondChanceStartTime = Date.now();

                // Get session to fetch answerTimeLimit
                const sessionForSecond = await Session.findById(sessionId);
                const secondAnswerDuration = sessionForSecond?.answerTimeLimit || 60;

                // Schedule auto-transition to IDLE for second team
                if (gameState.currentAnsweringTeam) {
                    timerManager.scheduleAnsweringTimer(
                        sessionId,
                        gameState.currentAnsweringTeam,
                        secondAnswerDuration,
                        async () => {
                            const idleGameState = await gameStateService.transitionToIdle(sessionId);
                            
                            // Emit transition to IDLE
                            SessionEmitters.toSession(sessionId, Events.GAME_STATE_CHANGED, {
                                gameStatus: idleGameState.gameStatus,
                                currentQuestionIndex: idleGameState.currentQuestionIndex,
                                currentAnsweringTeam: idleGameState.currentAnsweringTeam,
                                idleStartTime: idleGameState.idleStartTime,
                            });
                        }
                    );
                }

                // Emit socket event with second chance info and timestamp
                SessionEmitters.toSession(sessionId, Events.SECOND_CHANCE, {
                    teamId: gameState.currentAnsweringTeam,
                    gameStatus: gameState.gameStatus,
                    startTime: secondChanceStartTime,
                    duration: secondAnswerDuration * 1000,
                });

                // Emit answering round started to the specific team
                SessionEmitters.toTeam(sessionId, gameState.currentAnsweringTeam?.toString() || '', Events.ANSWERING_ROUND_STARTED, {
                    questionId: payload.questionId,
                    startTime: secondChanceStartTime,
                    duration: secondAnswerDuration * 1000,
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

                // Cancel buzzer timer since we're manually selecting a team
                timerManager.cancelTimer(`buzzer-${sessionId.toString()}`);

                gameState = await gameStateService.setAnsweringTeam(
                    sessionId,
                    payload.teamId
                );

                const answeringStartTime = Date.now();

                // Get session to fetch answerTimeLimit
                const sessionForAnswering = await Session.findById(sessionId);
                const answerDuration = sessionForAnswering?.answerTimeLimit || 60;

                // Schedule auto-transition to IDLE
                timerManager.scheduleAnsweringTimer(
                    sessionId,
                    payload.teamId,
                    answerDuration,
                    async () => {
                        const idleGameState = await gameStateService.transitionToIdle(sessionId);
                        
                        // Emit transition to IDLE
                        SessionEmitters.toSession(sessionId, Events.GAME_STATE_CHANGED, {
                            gameStatus: idleGameState.gameStatus,
                            currentQuestionIndex: idleGameState.currentQuestionIndex,
                            currentAnsweringTeam: idleGameState.currentAnsweringTeam,
                            idleStartTime: idleGameState.idleStartTime,
                        });
                    }
                );

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
                    duration: answerDuration * 1000,
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

                // Cancel the buzzer timer (admin fast-forwarding the process)
                timerManager.cancelTimer(`buzzer-${sessionId.toString()}`);

                gameState = await gameStateService.autoSelectFastestTeam(
                    sessionId,
                    payload.questionId
                );

                const autoSelectStartTime = Date.now();

                // Get session to fetch answerTimeLimit
                const sessionForAuto = await Session.findById(sessionId);
                const autoAnswerDuration = sessionForAuto?.answerTimeLimit || 60;

                // Schedule answering timer for the auto-selected team
                if (gameState.currentAnsweringTeam) {
                    timerManager.scheduleAnsweringTimer(
                        sessionId,
                        gameState.currentAnsweringTeam,
                        autoAnswerDuration,
                        async () => {
                            const idleGameState = await gameStateService.transitionToIdle(sessionId);
                            
                            // Emit transition to IDLE
                            SessionEmitters.toSession(sessionId, Events.GAME_STATE_CHANGED, {
                                gameStatus: idleGameState.gameStatus,
                                currentQuestionIndex: idleGameState.currentQuestionIndex,
                                currentAnsweringTeam: idleGameState.currentAnsweringTeam,
                                idleStartTime: idleGameState.idleStartTime,
                            });
                        }
                    );
                }

                // Emit team selected event
                SessionEmitters.toSession(sessionId, Events.TEAM_SELECTED, {
                    teamId: gameState.currentAnsweringTeam,
                    startTime: autoSelectStartTime,
                });

                // Emit answering round started to the selected team
                SessionEmitters.toTeam(sessionId, gameState.currentAnsweringTeam?.toString() || '', Events.ANSWERING_ROUND_STARTED, {
                    questionId: payload.questionId,
                    startTime: autoSelectStartTime,
                    duration: autoAnswerDuration * 1000,
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

/**
 * Validate timer expiration and update state if needed
 * GET /api/v1/game-state/validate-timer
 * Checks if current timer has expired and updates game state accordingly
 * Requires team/admin authentication
 */
export const validateTimerExpiration = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const sessionId = req.user?.sessionId;

        if (!sessionId) {
            return next(new AppError("Session ID not found in token.", 401));
        }

        const session = await Session.findById(sessionId);
        if (!session) {
            return next(new AppError("Session not found.", 404));
        }

        const gameState = await gameStateService.fetchGameStateBySessionId(sessionId);
        if (!gameState) {
            return next(new AppError("Game state not found.", 404));
        }

        const currentTime = Date.now();
        let stateChanged = false;
        let action = '';

        // Check buzzer round timer
        if (
            gameState.gameStatus === GameStatus.BUZZER_ROUND &&
            gameState.buzzerRoundStartTime
        ) {
            const elapsedTime = currentTime - gameState.buzzerRoundStartTime;
            const timeLimit = (session.questionTimeLimit || 30) * 1000;

            if (elapsedTime >= timeLimit) {
                // Buzzer round expired - transition to answering or idle
                console.log('⏰ Buzzer round timer expired - triggering transition');
                
                // Cancel existing timers first
                timerManager.cancelTimer(`buzzer-${sessionId.toString()}`);
                
                // Get current question to pass to transition
                const currentQuestion = await questionService.fetchCurrentQuestion(
                    sessionId,
                    gameState.currentQuestionIndex
                );
                
                if (!currentQuestion) {
                    return next(new AppError("Current question not found.", 404));
                }
                
                // Transition to answering (will auto-select fastest team)
                await gameStateService.transitionToAnswering(
                    sessionId,
                    currentQuestion._id as Types.ObjectId
                );
                
                stateChanged = true;
                action = 'BUZZER_EXPIRED_TO_ANSWERING';
            }
        }

        // Check answering round timer
        if (
            gameState.gameStatus === GameStatus.ANSWERING &&
            gameState.answeringRoundStartTime &&
            gameState.currentAnsweringTeam
        ) {
            const elapsedTime = currentTime - gameState.answeringRoundStartTime;
            const timeLimit = (session.answerTimeLimit || 60) * 1000;

            if (elapsedTime >= timeLimit) {
                // Answering round expired - transition to idle
                console.log('⏰ Answering round timer expired - triggering transition');
                
                const teamId = typeof gameState.currentAnsweringTeam === 'string'
                    ? gameState.currentAnsweringTeam
                    : gameState.currentAnsweringTeam._id.toString();
                
                // Cancel existing timers first
                timerManager.cancelTimer(`answering-${sessionId.toString()}-${teamId}`);
                
                // Transition to idle
                await gameStateService.transitionToIdle(sessionId);
                
                stateChanged = true;
                action = 'ANSWERING_EXPIRED_TO_IDLE';
            }
        }

        // Fetch updated game state if changed
        const finalGameState = stateChanged
            ? await gameStateService.fetchGameStateBySessionId(sessionId)
            : gameState;

        res.status(200).json({
            message: stateChanged
                ? "Timer expired - game state updated"
                : "Timer validation successful - no update needed",
            data: {
                gameState: finalGameState,
                stateChanged,
                action,
            },
        });
    } catch (error: any) {
        console.error("Error validating timer expiration:", error);
        next(new AppError("Failed to validate timer.", 500));
    }
};
