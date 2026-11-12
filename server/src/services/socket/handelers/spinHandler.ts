import { Socket } from "socket.io";
import { isTeamCaptain } from "../../../modules/teams/captain";
import GameStateService, {
  SPIN_NOT_ALLOWED,
} from "../../../modules/gameState/services/gameState.service";
import { GameStatus } from "../../../modules/gameState/types/enums";
import { spinWheelForTeam } from "../../../modules/gameState/services/spinTimers";
import { isValidObjectId } from "../../../modules/gameState/utils/sessionScope";

const gameStateService = new GameStateService();

export const handleSpinWheel = async (socket: Socket) => {
  try {
    const user = (socket as any).user;
    if (
      !user ||
      user.role !== "TEAM" ||
      !isValidObjectId(user.id) ||
      !isValidObjectId(user.sessionId)
    ) {
      return;
    }

    const sessionId = String(user.sessionId);
    const teamId = String(user.id);

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

    // Atomic claim + broadcast + session-scoped landing timers (shared with the
    // admin TRIGGER_SPIN_WHEEL action).
    await spinWheelForTeam(sessionId, teamId);
  } catch (error: any) {
    if (error?.message === SPIN_NOT_ALLOWED) return; // Lost a race with another spin.
    console.error("Error in handleSpinWheel:", error);
  }
};
