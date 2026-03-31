import { Document, Types } from "mongoose";
import { GameStatus } from "./enums";
import { IBuzzerQueue } from "../../buzzerQueue/types/buzzerQueue.interface";

export interface IGameState extends Document {
  sessionId: Types.ObjectId;
  currentQuestionIndex: number;
  gameStatus: GameStatus;
  currentAnsweringTeam?: Types.ObjectId;
  buzzerRoundStartTime?: number;
  answeringRoundStartTime?: number;
  idleStartTime?: number;
  teamsWhoAnsweredThisQuestion: Types.ObjectId[];
  isNoBuzzerQuestion: boolean;
  createdAt: Date;
  updatedAt: Date;
}
