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
    hintRevealed: {
      type: Boolean,
      default: false,
    },
    // No-buzzer question: admin hasn't picked a team yet, so players must not see the question.
    awaitingTeamSelection: {
      type: Boolean,
      default: false,
    },
    // Spin wheel: admin's "hide question" choice applied to whichever question the wheel lands on.
    spinHideQuestion: {
      type: Boolean,
      default: false,
    },
    // Spin wheel pass: the team that just answered wrong; its captain picks the next team.
    spinPassPickerTeam: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      required: false,
    },
    // Spin wheel: turn ended without a correct answer -> question returns to the pool,
    // so its answer must NOT be revealed even though the game is IDLE.
    answerWithheld: {
      type: Boolean,
      default: false,
    },
    completedQuestionIds: {
      type: [Schema.Types.ObjectId],
      ref: "Question",
      default: [],
    },
    currentCategory: {
      type: String,
      default: "",
    },
    spinWheelState: {
      selectedTeamId: { type: String },
      isSpinning: { type: Boolean, default: false },
      targetCategory: { type: String },
      winningIndex: { type: Number },
      durationMs: { type: Number },
      startTime: { type: Number },
      targetQuestionId: { type: String },
    },
  },
  {
    timestamps: true,
  },
);

export const GameState = model<IGameState>("GameState", gameStateSchema);
