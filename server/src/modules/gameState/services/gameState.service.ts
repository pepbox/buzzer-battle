import mongoose, { Types } from "mongoose";
import { GameState } from "../models/gameState.model";
import { IGameState } from "../types/interfaces";
import { GameStatus } from "../types/enums";

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
}
