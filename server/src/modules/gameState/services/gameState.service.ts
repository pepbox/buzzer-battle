import mongoose, { Types } from "mongoose";
import { GameState } from "../models/gameState.model";
import { IGameState } from "../types/interfaces";
import { GameStatus } from "../types/enums";
import { Session } from "../../session/models/session.model";
import { SessionStatus } from "../../session/types/enums";
import BuzzerQueueService from "../../buzzerQueue/services/buzzerQueue.service";
import QuestionService from "../../questions/services/question.service";

export default class GameStateService {
    private session?: mongoose.ClientSession;

    constructor(session?: mongoose.ClientSession) {
        this.session = session;
    }

    // Fetch game state by session ID
    async fetchGameStateBySessionId(
        sessionId: Types.ObjectId | string
    ): Promise<IGameState | null> {
        const query = GameState.findOne({ sessionId })
            .populate('currentAnsweringTeam', 'teamNumber teamName teamScore')
            .populate('sessionId', 'sessionName status questionTimeLimit answerTimeLimit');
        
        if (this.session) {
            query.session(this.session);
        }
        
        return await query;
    }

    // Create initial game state for a session
    async createGameState(
        sessionId: Types.ObjectId | string
    ): Promise<IGameState> {
        const gameState = new GameState({
            sessionId,
            currentQuestionIndex: 0,
            gameStatus: GameStatus.PAUSED,
        });

        const options: any = {};
        if (this.session) {
            options.session = this.session;
        }
        
        await gameState.save(options);
        return gameState;
    }

    // Update game status
    async updateGameStatus(
        sessionId: Types.ObjectId | string,
        status: GameStatus
    ): Promise<IGameState> {
        const query = GameState.findOne({ sessionId });
        if (this.session) {
            query.session(this.session);
        }
        
        const gameState = await query;
        if (!gameState) {
            throw new Error("Game state not found");
        }

        gameState.gameStatus = status;
        
        const options: any = {};
        if (this.session) {
            options.session = this.session;
        }
        
        await gameState.save(options);
        return gameState;
    }

    // Set current answering team
    async setCurrentAnsweringTeam(
        sessionId: Types.ObjectId | string,
        teamId: Types.ObjectId | string | null
    ): Promise<IGameState> {
        const query = GameState.findOne({ sessionId });
        if (this.session) {
            query.session(this.session);
        }
        
        const gameState = await query;
        if (!gameState) {
            throw new Error("Game state not found");
        }

        if (teamId === null) {
            gameState.currentAnsweringTeam = undefined;
        } else {
            gameState.currentAnsweringTeam = teamId as Types.ObjectId;
        }
        
        const options: any = {};
        if (this.session) {
            options.session = this.session;
        }
        
        await gameState.save(options);
        return gameState;
    }

    // Move to next question
    async moveToNextQuestion(
        sessionId: Types.ObjectId | string
    ): Promise<IGameState> {
        const query = GameState.findOne({ sessionId });
        if (this.session) {
            query.session(this.session);
        }
        
        const gameState = await query;
        if (!gameState) {
            throw new Error("Game state not found");
        }

        gameState.currentQuestionIndex += 1;
        gameState.currentAnsweringTeam = undefined;
        gameState.buzzerRoundStartTime = undefined; // Clear timestamps
        gameState.answeringRoundStartTime = undefined;
        
        const options: any = {};
        if (this.session) {
            options.session = this.session;
        }
        
        await gameState.save(options);
        return gameState;
    }

    // Update game state (comprehensive)
    async updateGameState(
        sessionId: Types.ObjectId | string,
        updates: {
            gameStatus?: GameStatus;
            currentQuestionIndex?: number;
            currentAnsweringTeam?: Types.ObjectId | string | null;
        }
    ): Promise<IGameState> {
        const query = GameState.findOne({ sessionId });
        if (this.session) {
            query.session(this.session);
        }
        
        const gameState = await query;
        if (!gameState) {
            throw new Error("Game state not found");
        }

        if (updates.gameStatus !== undefined) {
            gameState.gameStatus = updates.gameStatus;
        }
        
        if (updates.currentQuestionIndex !== undefined) {
            gameState.currentQuestionIndex = updates.currentQuestionIndex;
        }
        
        if (updates.currentAnsweringTeam !== undefined) {
            if (updates.currentAnsweringTeam === null) {
                gameState.currentAnsweringTeam = undefined;
            } else {
                gameState.currentAnsweringTeam = updates.currentAnsweringTeam as Types.ObjectId;
            }
        }
        
        const options: any = {};
        if (this.session) {
            options.session = this.session;
        }
        
        await gameState.save(options);
        return gameState;
    }

    // Start buzzer round
    async startBuzzerRound(sessionId: Types.ObjectId | string): Promise<IGameState> {
        const query = GameState.findOne({ sessionId });
        if (this.session) {
            query.session(this.session);
        }
        
        const gameState = await query;
        if (!gameState) {
            throw new Error("Game state not found");
        }

        gameState.gameStatus = GameStatus.BUZZER_ROUND;
        gameState.currentAnsweringTeam = undefined;
        gameState.buzzerRoundStartTime = Date.now();
        gameState.answeringRoundStartTime = undefined; // Clear answering time
        
        const options: any = {};
        if (this.session) {
            options.session = this.session;
        }
        
        await gameState.save(options);

        // Clear buzzer queue for the current question (cleanup from previous question)
        const questionService = new QuestionService(this.session);
        try {
            const currentQuestion = await questionService.fetchCurrentQuestion(
                sessionId,
                gameState.currentQuestionIndex
            );
            
            if (currentQuestion) {
                const buzzerQueueService = new BuzzerQueueService(this.session);
                await buzzerQueueService.clearBuzzerQueueForQuestion(currentQuestion._id);
                console.log(`🧹 Cleared buzzer queue for question ${currentQuestion._id}`);
            }
        } catch (error) {
            console.error("Error clearing buzzer queue:", error);
            // Don't throw - this is cleanup, game should continue
        }

        return gameState;
    }

    // Pause game
    async pauseGame(sessionId: Types.ObjectId | string): Promise<IGameState> {
        const query = GameState.findOne({ sessionId });
        if (this.session) {
            query.session(this.session);
        }
        
        const gameState = await query;
        if (!gameState) {
            throw new Error("Game state not found");
        }

        gameState.gameStatus = GameStatus.PAUSED;
        gameState.buzzerRoundStartTime = undefined; // Clear timestamps
        gameState.answeringRoundStartTime = undefined;
        
        const options: any = {};
        if (this.session) {
            options.session = this.session;
        }
        
        await gameState.save(options);
        return gameState;
    }

    // Resume game (go back to buzzer round)
    async resumeGame(sessionId: Types.ObjectId | string): Promise<IGameState> {
        const query = GameState.findOne({ sessionId });
        if (this.session) {
            query.session(this.session);
        }
        
        const gameState = await query;
        if (!gameState) {
            throw new Error("Game state not found");
        }

        // Resume to BUZZER_ROUND by default
        gameState.gameStatus = GameStatus.BUZZER_ROUND;
        
        const options: any = {};
        if (this.session) {
            options.session = this.session;
        }
        
        await gameState.save(options);
        return gameState;
    }

    // Show leaderboard (set to paused)
    async showLeaderboard(sessionId: Types.ObjectId | string): Promise<IGameState> {
        return await this.pauseGame(sessionId);
    }

    // Move to next question with auto-end game check
    async moveToNextQuestionWithCheck(
        sessionId: Types.ObjectId | string
    ): Promise<{ gameState: IGameState; gameEnded: boolean }> {
        const query = GameState.findOne({ sessionId }).populate('sessionId');
        if (this.session) {
            query.session(this.session);
        }
        
        const gameState = await query;
        if (!gameState) {
            throw new Error("Game state not found");
        }

        const session = await Session.findById(sessionId);
        if (!session) {
            throw new Error("Session not found");
        }

        const totalQuestions = session.questions.length;
        const nextIndex = gameState.currentQuestionIndex + 1;

        if (nextIndex >= totalQuestions) {
            // Last question completed - End game
            session.status = SessionStatus.ENDED;
            await session.save();

            gameState.gameStatus = GameStatus.PAUSED;
            gameState.currentAnsweringTeam = undefined;
            gameState.buzzerRoundStartTime = undefined; // Clear timestamps
            gameState.answeringRoundStartTime = undefined;
            
            const options: any = {};
            if (this.session) {
                options.session = this.session;
            }
            
            await gameState.save(options);
            
            return { gameState, gameEnded: true };
        } else {
            // Move to next question
            gameState.currentQuestionIndex = nextIndex;
            gameState.currentAnsweringTeam = undefined;
            gameState.gameStatus = GameStatus.BUZZER_ROUND;
            gameState.buzzerRoundStartTime = undefined; // Clear timestamps
            gameState.answeringRoundStartTime = undefined;
            
            const options: any = {};
            if (this.session) {
                options.session = this.session;
            }
            
            await gameState.save(options);
            
            return { gameState, gameEnded: false };
        }
    }

    // Pass question to second team
    async passToSecondTeam(
        sessionId: Types.ObjectId | string,
        currentQuestionId: Types.ObjectId | string
    ): Promise<IGameState> {
        const buzzerQueueService = new BuzzerQueueService(this.session);
        
        // Get buzzer leaderboard for current question
        const leaderboard = await buzzerQueueService.fetchBuzzerLeaderboard(
            currentQuestionId,
            sessionId
        );

        if (leaderboard.length < 2) {
            throw new Error("No second team available in buzzer queue");
        }

        // Get 2nd place team
        const secondTeam = leaderboard[1];

        const query = GameState.findOne({ sessionId });
        if (this.session) {
            query.session(this.session);
        }
        
        const gameState = await query;
        if (!gameState) {
            throw new Error("Game state not found");
        }

        // Set 2nd team as answering team
        gameState.currentAnsweringTeam = (secondTeam.teamId as any)._id;
        gameState.gameStatus = GameStatus.ANSWERING;
        gameState.answeringRoundStartTime = Date.now();
        gameState.buzzerRoundStartTime = undefined; // Clear buzzer time
        
        const options: any = {};
        if (this.session) {
            options.session = this.session;
        }
        
        await gameState.save(options);
        return gameState;
    }

    // Set specific team as answering team (used by auto-selection)
    async setAnsweringTeam(
        sessionId: Types.ObjectId | string,
        teamId: Types.ObjectId | string
    ): Promise<IGameState> {
        const query = GameState.findOne({ sessionId });
        if (this.session) {
            query.session(this.session);
        }
        
        const gameState = await query;
        if (!gameState) {
            throw new Error("Game state not found");
        }

        gameState.currentAnsweringTeam = teamId as Types.ObjectId;
        gameState.gameStatus = GameStatus.ANSWERING;
        gameState.answeringRoundStartTime = Date.now();
        gameState.buzzerRoundStartTime = undefined; // Clear buzzer time
        
        const options: any = {};
        if (this.session) {
            options.session = this.session;
        }
        
        await gameState.save(options);
        return gameState;
    }

    // Auto-select fastest team from buzzer leaderboard
    async autoSelectFastestTeam(
        sessionId: Types.ObjectId | string,
        questionId: Types.ObjectId | string
    ): Promise<IGameState> {
        const buzzerQueueService = new BuzzerQueueService(this.session);
        
        // Get buzzer leaderboard
        const leaderboard = await buzzerQueueService.fetchBuzzerLeaderboard(
            questionId,
            sessionId
        );

        if (leaderboard.length === 0) {
            throw new Error("No teams in buzzer queue");
        }

        // Get fastest team (1st place)
        const fastestTeam = leaderboard[0];

        return await this.setAnsweringTeam(
            sessionId,
            (fastestTeam.teamId as any)._id
        );
    }

    /**
     * Auto-transition from BUZZER_ROUND to ANSWERING
     * Selects the fastest team from buzzer queue
     */
    async transitionToAnswering(
        sessionId: Types.ObjectId | string,
        questionId: Types.ObjectId | string
    ): Promise<IGameState> {
        console.log(`🔄 Auto-transitioning to ANSWERING for session ${sessionId}`);
        
        const gameState = await this.fetchGameStateBySessionId(sessionId);
        if (!gameState) {
            throw new Error("Game state not found");
        }

        // Only transition if still in buzzer round
        if (gameState.gameStatus !== GameStatus.BUZZER_ROUND) {
            console.log(`⚠️ Game state is ${gameState.gameStatus}, skipping transition to ANSWERING`);
            return gameState;
        }

        // Auto-select fastest team
        try {
            return await this.autoSelectFastestTeam(sessionId, questionId);
        } catch (error: any) {
            if (error.message === "No teams in buzzer queue") {
                // No teams pressed buzzer, transition to IDLE
                console.log('⚠️ No teams pressed buzzer, transitioning to IDLE');
                return await this.transitionToIdle(sessionId);
            }
            throw error;
        }
    }

    /**
     * Auto-transition from ANSWERING to IDLE
     * Called when answering time expires
     */
    async transitionToIdle(sessionId: Types.ObjectId | string): Promise<IGameState> {
        console.log(`🔄 Auto-transitioning to IDLE for session ${sessionId}`);
        
        const query = GameState.findOne({ sessionId });
        if (this.session) {
            query.session(this.session);
        }
        
        const gameState = await query;
        if (!gameState) {
            throw new Error("Game state not found");
        }

        gameState.gameStatus = GameStatus.IDLE;
        gameState.idleStartTime = Date.now();
        gameState.buzzerRoundStartTime = undefined;
        gameState.answeringRoundStartTime = undefined;
        
        const options: any = {};
        if (this.session) {
            options.session = this.session;
        }
        
        await gameState.save(options);
        console.log(`✅ Transitioned to IDLE for session ${sessionId}`);
        
        return gameState;
    }
}
