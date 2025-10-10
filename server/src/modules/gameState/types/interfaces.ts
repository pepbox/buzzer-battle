import { Document, Types } from "mongoose";
import { GameStatus } from "./enums";

export interface IGameState extends Document {
    sessionId: Types.ObjectId;
    currentQuestionIndex: number;
    gameStatus: GameStatus;
    currentAnsweringTeam?: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
