import { Socket } from "socket.io";
import { isTeamCaptain } from "../../../modules/teams/captain";
import GameStateService from "../../../modules/gameState/services/gameState.service";
import { GameStatus } from "../../../modules/gameState/types/enums";
import { SessionEmitters } from "../sessionEmitters";
import { Events } from "../enums/Events";
import { GameState } from "../../../modules/gameState/models/gameState.model";

const gameStateService = new GameStateService();

export const handleSpinWheel = async (socket: Socket) => {
  try {
    const user = (socket as any).user;
    if (!user || !user.id || !user.sessionId) {
      return;
    }

    const sessionId = user.sessionId;
    const teamId = user.id;

    const gameState = await gameStateService.fetchGameStateBySessionId(sessionId);
    if (!gameState || gameState.gameStatus !== GameStatus.SPIN_ROUND) {
      return;
    }

    const currentTeamId = gameState.currentAnsweringTeam
      ? typeof gameState.currentAnsweringTeam === "string"
        ? gameState.currentAnsweringTeam
        : (gameState.currentAnsweringTeam as any)._id?.toString() || gameState.currentAnsweringTeam.toString()
      : null;

    // Check if this team is the selected answering team and user is buzzer person (captain)
    if (currentTeamId !== teamId || !(await isTeamCaptain(user))) {
      return;
    }

    if (gameState.spinWheelState?.isSpinning) {
      return; // Already spinning
    }

    const spinResult = await gameStateService.triggerSpinWheel(sessionId, teamId);

    // Broadcast spin event
    SessionEmitters.toSession(sessionId, Events.WHEEL_SPIN_TRIGGERED, {
      teamId,
      targetCategory: spinResult.targetCategory,
      winningIndex: spinResult.winningIndex,
      durationMs: spinResult.durationMs,
      availableCategories: spinResult.availableCategories,
      startTime: spinResult.gameState.spinWheelState?.startTime,
    });

    SessionEmitters.toSession(sessionId, Events.GAME_STATE_CHANGED, {
      gameStatus: spinResult.gameState.gameStatus,
      currentQuestionIndex: spinResult.gameState.currentQuestionIndex,
      currentAnsweringTeam: spinResult.gameState.currentAnsweringTeam,
      spinWheelState: spinResult.gameState.spinWheelState,
    });

    // Broadcast WHEEL_LANDED when wheel stops
    setTimeout(async () => {
      try {
        await GameState.updateOne(
          { sessionId },
          { $set: { "spinWheelState.isSpinning": false } }
        );
      } catch (err) {
        console.error("Error setting isSpinning to false in spinHandler:", err);
      }
      SessionEmitters.toSession(sessionId, Events.WHEEL_LANDED, {
        targetCategory: spinResult.targetCategory,
        questionIndex: spinResult.gameState.currentQuestionIndex,
      });
    }, spinResult.durationMs);

    // After 2.5s displaying the landed category, transition to ANSWERING to show question
    setTimeout(async () => {
      try {
        const landedState = await gameStateService.landSpinWheel(sessionId);
        SessionEmitters.toSession(sessionId, Events.GAME_STATE_CHANGED, {
          gameStatus: landedState.gameStatus,
          currentQuestionIndex: landedState.currentQuestionIndex,
          currentAnsweringTeam: landedState.currentAnsweringTeam,
          currentCategory: landedState.currentCategory,
          spinWheelState: landedState.spinWheelState,
        });
      } catch (landError) {
        console.error("Auto land spin wheel error:", landError);
      }
    }, spinResult.durationMs + 2500);
  } catch (error) {
    console.error("Error in handleSpinWheel:", error);
  }
};
