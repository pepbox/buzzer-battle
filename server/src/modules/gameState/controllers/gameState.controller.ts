import { NextFunction, Request, Response } from 'express';
import AppError from '../../../utils/appError';
import GameStateService from '../services/gameState.service';
import { GameStatus } from '../types/enums';
import { getSocketIO } from '../../../services/socket';

const gameStateService = new GameStateService();

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
            const io = getSocketIO();
            io.to(`session:${sessionId}`).emit('game-state-changed', {
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
            const io = getSocketIO();
            io.to(`session:${sessionId}`).emit('game-state-changed', {
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
