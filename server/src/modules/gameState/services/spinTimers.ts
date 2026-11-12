import { Types } from "mongoose";
import GameStateService from "./gameState.service";
import { GameState } from "../models/gameState.model";
import { GameStatus } from "../types/enums";
import { IGameState } from "../types/interfaces";
import { timerManager } from "../../../services/timerManager";
import { SessionEmitters } from "../../../services/socket/sessionEmitters";
import { Events } from "../../../services/socket/enums/Events";

/**
 * Spin wheel lifecycle shared by the captain's socket "spin-wheel" event and the
 * admin TRIGGER_SPIN_WHEEL action.
 *
 *   t = 0                 wheel starts spinning (isSpinning = true)
 *   t = durationMs        WHEEL_LANDED emitted so clients show the category chip
 *   t = durationMs + 2.5s game moves to ANSWERING (isSpinning = false)
 *
 * Both timers are registered with timerManager under session-scoped keys, so
 * PAUSE / NEXT_QUESTION / START_SPIN_ROUND (cancelSessionTimers) cancel them, and
 * each step only acts if the game is still on the same spin.
 */

const gameStateService = new GameStateService();

/** Time the landed category chip is shown before the question appears. */
export const SPIN_LAND_DISPLAY_MS = 2500;

const wheelLandedKey = (sessionId: string) => `spin-wheel-landed-${sessionId}`;
const spinLandKey = (sessionId: string) => `spin-land-${sessionId}`;

export const cancelSpinTimers = (sessionId: Types.ObjectId | string) => {
  timerManager.cancelTimer(wheelLandedKey(String(sessionId)));
  timerManager.cancelTimer(spinLandKey(String(sessionId)));
};

/**
 * Start a spin for `teamId` (atomically; throws SPIN_NOT_ALLOWED if the game is
 * not in SPIN_ROUND or the wheel is already spinning), broadcast it, and schedule
 * the landing.
 */
export const spinWheelForTeam = async (
  sessionIdInput: Types.ObjectId | string,
  teamId: Types.ObjectId | string,
) => {
  const sessionId = String(sessionIdInput);
  const spinResult = await gameStateService.triggerSpinWheel(sessionId, teamId);
  const { gameState } = spinResult;
  const startTime = gameState.spinWheelState?.startTime as number;

  SessionEmitters.toSession(sessionId, Events.WHEEL_SPIN_TRIGGERED, {
    teamId: String(teamId),
    targetCategory: spinResult.targetCategory,
    winningIndex: spinResult.winningIndex,
    durationMs: spinResult.durationMs,
    availableCategories: spinResult.availableCategories,
    startTime,
  });

  SessionEmitters.toSession(sessionId, Events.GAME_STATE_CHANGED, {
    gameStatus: gameState.gameStatus,
    currentQuestionIndex: gameState.currentQuestionIndex,
    currentAnsweringTeam: gameState.currentAnsweringTeam,
    spinWheelState: gameState.spinWheelState,
    hintRevealed: false,
    answerMarked: false,
  });

  // Wheel stops: show the category chip (only if this spin is still current).
  timerManager.schedule(wheelLandedKey(sessionId), spinResult.durationMs, async () => {
    const stillSpinning = await GameState.exists({
      sessionId,
      gameStatus: GameStatus.SPIN_ROUND,
      "spinWheelState.startTime": startTime,
    });
    if (!stillSpinning) return;
    SessionEmitters.toSession(sessionId, Events.WHEEL_LANDED, {
      targetCategory: spinResult.targetCategory,
      questionIndex: gameState.currentQuestionIndex,
    });
  });

  // After the chip has been shown, move to ANSWERING to reveal the question.
  timerManager.schedule(
    spinLandKey(sessionId),
    spinResult.durationMs + SPIN_LAND_DISPLAY_MS,
    async () => {
      const landedState = await gameStateService.landSpinWheel(sessionId, startTime);
      if (!landedState) return; // Stale spin (paused, new round, landed manually...).
      emitSpinLanded(sessionId, landedState);
    },
  );

  return spinResult;
};

/** GAME_STATE_CHANGED payload after the wheel lands. */
export const emitSpinLanded = (
  sessionId: string,
  landedState: IGameState,
) => {
  SessionEmitters.toSession(sessionId, Events.GAME_STATE_CHANGED, {
    gameStatus: landedState.gameStatus,
    currentQuestionIndex: landedState.currentQuestionIndex,
    currentAnsweringTeam: landedState.currentAnsweringTeam,
    currentCategory: landedState.currentCategory,
    spinWheelState: landedState.spinWheelState,
    answerMarked: false,
  });
};
