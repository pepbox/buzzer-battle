import { Document, Types } from "mongoose";
import { GameStatus } from "./enums";
import { IBuzzerQueue } from "../../buzzerQueue/types/buzzerQueue.interface";

export interface ISpinWheelState {
  selectedTeamId?: string;
  isSpinning?: boolean;
  targetCategory?: string;
  winningIndex?: number;
  durationMs?: number;
  startTime?: number;
  targetQuestionId?: string;
}

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
  hintRevealed?: boolean;
  completedQuestionIds: Types.ObjectId[];
  currentCategory?: string;
  spinWheelState?: ISpinWheelState;
  createdAt: Date;
  updatedAt: Date;
}
