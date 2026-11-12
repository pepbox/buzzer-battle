import { Socket } from "socket.io";
import { isTeamCaptain } from "../../../modules/teams/captain";
import { Events } from "../enums/Events";
import GameStateService from "../../../modules/gameState/services/gameState.service";
import { isValidObjectId } from "../../../modules/gameState/utils/sessionScope";
import {
  SpinPassError,
  passSpinQuestionToTeam,
} from "../../../modules/gameState/services/spinPass";

const gameStateService = new GameStateService();

/**
 * Spin Wheel: the captain (buzzer person) of the team that just answered wrong
 * picks which team answers the same question next.
 */
export const handleSpinPassSelect = async (
  socket: Socket,
  payload: { teamId?: string },
) => {
  const fail = (message: string) =>
    socket.emit(Events.SPIN_PASS_ERROR, { message });

  try {
    const user = (socket as any).user;
    if (
      !user?.id ||
      user.role !== "TEAM" ||
      !isValidObjectId(user.sessionId)
    ) {
      return fail("Only team captains can choose the next team.");
    }
    if (!(await isTeamCaptain(user))) {
      return fail("Only your team captain can choose the next team.");
    }
    if (
      !payload ||
      typeof payload !== "object" ||
      typeof payload.teamId !== "string" ||
      !isValidObjectId(payload.teamId)
    ) {
      return fail("Please choose a team.");
    }

    const gameState = await gameStateService.fetchGameStateBySessionId(
      user.sessionId,
    );
    const pickerId = gameState?.spinPassPickerTeam
      ? String((gameState.spinPassPickerTeam as any)?._id ?? gameState.spinPassPickerTeam)
      : null;
    if (!pickerId) {
      return fail("There is no team to choose right now.");
    }
    if (pickerId !== String(user.id)) {
      return fail("Only the team that just answered can choose the next team.");
    }

    await passSpinQuestionToTeam(
      user.sessionId,
      String(payload.teamId),
      "captain",
      pickerId,
    );
  } catch (error) {
    if (error instanceof SpinPassError) return fail(error.message);
    console.error("Error in handleSpinPassSelect:", error);
    fail("Couldn't select that team. Please try again.");
  }
};
