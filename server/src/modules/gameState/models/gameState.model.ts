import { Schema, model } from "mongoose";
import { IGameState } from "../types/interfaces";
import { GameStatus } from "../types/enums";

const gameStateSchema = new Schema<IGameState>(
  {
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: "Session",
      required: true,
    },
    currentQuestionIndex: {
      type: Number,
      required: true,
      default: -1, // Start at -1, first NEXT_QUESTION will move to 0
    },
    gameStatus: {
      type: String,
      enum: Object.values(GameStatus),
      required: true,
      default: GameStatus.PAUSED,
    },
    currentAnsweringTeam: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      required: false,
    },
    buzzerRoundStartTime: {
      type: Number,
      required: false,
    },
    answeringRoundStartTime: {
      type: Number,
      required: false,
    },
    idleStartTime: {
      type: Number,
      required: false,
    },
    teamsWhoAnsweredThisQuestion: {
      type: [Schema.Types.ObjectId],
      ref: "Team",
      default: [],
    },
    isNoBuzzerQuestion: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

export const GameState = model<IGameState>("GameState", gameStateSchema);
