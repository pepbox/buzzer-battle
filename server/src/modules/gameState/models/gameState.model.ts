import { Schema, model } from 'mongoose';
import { IGameState } from '../types/interfaces';
import { GameStatus } from '../types/enums';

const gameStateSchema = new Schema<IGameState>({
    sessionId: {
        type: Schema.Types.ObjectId,
        ref: 'Session',
        required: true
    },
    currentQuestionIndex: {
        type: Number,
        required: true,
        default: 0
    },
    gameStatus: {
        type: String,
        enum: Object.values(GameStatus),
        required: true,
        default: GameStatus.PAUSED
    },
    currentAnsweringTeam: {
        type: Schema.Types.ObjectId,
        ref: 'Team',
        required: false
    }
}, {
    timestamps: true
});

export const GameState = model<IGameState>('GameState', gameStateSchema);
