import { Document, Types } from "mongoose";
import { GameStatus } from "./enums";

export interface IGameState extends Document {
    sessionId: Types.ObjectId;
    currentQuestionIndex: number;
    gameStatus: GameStatus;
    currentAnsweringTeam?: Types.ObjectId;
    buzzerRoundStartTime?: number;
    answeringRoundStartTime?: number;
    idleStartTime?: number;
    createdAt: Date;
    updatedAt: Date;
}
