import { Types } from "mongoose";
import { GameState } from "../models/gameState.model";
import { GameStatus } from "../types/enums";
import { IGameState } from "../types/interfaces";
import TeamService from "../../teams/services/team.service";
import { SessionEmitters } from "../../../services/socket/sessionEmitters";
import { Events } from "../../../services/socket/enums/Events";

/**
 * Spin Wheel "pass" flow.
 *
 * After a wrong answer, the wrong team's captain picks the next team to answer the
 * SAME question. Every team gets one attempt per question (tracked in
 * gameState.teamsWhoAnsweredThisQuestion). If no team is left, or the admin ends the
 * turn, the question goes back to the pool and its answer stays hidden.
 *
 * While the captain is choosing, the game is IDLE with awaitingTeamSelection=true,
 * which keeps both question content and answer away from players.
 */

const teamService = new TeamService();

export class SpinPassError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

const idStr = (value: unknown) => String((value as any)?._id ?? value);

const teamSummary = async (teamId: Types.ObjectId | string) => {
  const team = await teamService.fetchTeamById(teamId).catch(() => null);
  return team
    ? { _id: String(team._id), teamName: team.teamName, teamNumber: team.teamNumber }
    : { _id: String(teamId) };
};

/** Teams in the session that have not attempted the current question yet. */
export const getEligiblePassTeams = async (
  sessionId: Types.ObjectId | string,
  gameState: Pick<IGameState, "teamsWhoAnsweredThisQuestion">,
) => {
  const attempted = new Set(
    (gameState.teamsWhoAnsweredThisQuestion || []).map(idStr),
  );
  const teams = await teamService.fetchTeamsBySession(sessionId);
  return teams.filter((team) => !attempted.has(String(team._id)));
};

const emitState = (sessionId: string, gameState: IGameState, extra = {}) => {
  SessionEmitters.toSession(sessionId, Events.GAME_STATE_CHANGED, {
    gameStatus: gameState.gameStatus,
    currentQuestionIndex: gameState.currentQuestionIndex,
    currentAnsweringTeam: gameState.currentAnsweringTeam ?? null,
    currentCategory: gameState.currentCategory,
    awaitingTeamSelection: Boolean(gameState.awaitingTeamSelection),
    spinPassPickerTeam: gameState.spinPassPickerTeam ?? null,
    teamsWhoAnsweredThisQuestion: (gameState.teamsWhoAnsweredThisQuestion || []).map(idStr),
    answerWithheld: Boolean(gameState.answerWithheld),
    ...extra,
  });
};

/**
 * End the spin turn without a correct answer: question goes back to the pool,
 * the answer is withheld, and the admin picks the next team to spin.
 */
export const endSpinTurn = async (sessionId: string): Promise<IGameState> => {
  const gameState = await GameState.findOneAndUpdate(
    { sessionId },
    {
      $set: {
        gameStatus: GameStatus.IDLE,
        idleStartTime: Date.now(),
        awaitingTeamSelection: false,
        answerWithheld: true,
        currentCategory: "",
      },
      $unset: {
        currentAnsweringTeam: 1,
        spinPassPickerTeam: 1,
        buzzerRoundStartTime: 1,
        answeringRoundStartTime: 1,
      },
    },
    { new: true },
  );
  if (!gameState) throw new SpinPassError("Game state not found.", 404);

  emitState(sessionId, gameState, { spinTurnEnded: true });
  return gameState;
};

/**
 * Called when the admin marks a spin-wheel answer wrong.
 * Records the attempt, then either opens the captain's pass picker or ends the turn.
 */
export const handleSpinWrongAnswer = async (
  sessionId: string,
  wrongTeamId: string,
): Promise<{ gameState: IGameState; passing: boolean }> => {
  const recorded = await GameState.findOneAndUpdate(
    { sessionId },
    { $addToSet: { teamsWhoAnsweredThisQuestion: new Types.ObjectId(wrongTeamId) } },
    { new: true },
  );
  if (!recorded) throw new SpinPassError("Game state not found.", 404);

  const eligible = await getEligiblePassTeams(sessionId, recorded);
  if (eligible.length === 0) {
    // Every team has tried this question: back to the pool.
    return { gameState: await endSpinTurn(sessionId), passing: false };
  }

  const gameState = await GameState.findOneAndUpdate(
    { sessionId },
    {
      $set: {
        gameStatus: GameStatus.IDLE,
        idleStartTime: Date.now(),
        awaitingTeamSelection: true,
        spinPassPickerTeam: new Types.ObjectId(wrongTeamId),
        hintRevealed: false,
        answerWithheld: false,
      },
      $unset: { currentAnsweringTeam: 1, answeringRoundStartTime: 1 },
    },
    { new: true },
  );
  if (!gameState) throw new SpinPassError("Game state not found.", 404);

  const pickerTeam = await teamSummary(wrongTeamId);
  emitState(sessionId, gameState, { spinPassPickerTeam: pickerTeam });
  return { gameState, passing: true };
};

/**
 * Give the current spin question to `targetTeamId`.
 * Used by the wrong team's captain (socket) and by the admin on their behalf.
 */
export const passSpinQuestionToTeam = async (
  sessionId: string,
  targetTeamId: string,
  selectedBy: "captain" | "admin",
  /** For captain picks: the picker team the caller is; must still be the picker. */
  expectedPickerTeamId?: string,
): Promise<IGameState> => {
  if (!Types.ObjectId.isValid(targetTeamId)) {
    throw new SpinPassError("Invalid team.");
  }

  const team = await teamService.fetchTeamById(targetTeamId).catch(() => null);
  if (!team || idStr(team.session) !== String(sessionId)) {
    throw new SpinPassError("Team not found in this session.", 404);
  }

  const targetId = new Types.ObjectId(targetTeamId);
  const now = Date.now();

  // Atomic: only succeeds while a pass is pending and the team hasn't tried yet,
  // so a captain and admin picking at the same moment can't both win.
  const gameState = await GameState.findOneAndUpdate(
    {
      sessionId,
      gameStatus: GameStatus.IDLE,
      awaitingTeamSelection: true,
      spinPassPickerTeam: expectedPickerTeamId
        ? new Types.ObjectId(expectedPickerTeamId)
        : { $exists: true, $ne: null },
      teamsWhoAnsweredThisQuestion: { $ne: targetId },
    },
    {
      $set: {
        gameStatus: GameStatus.ANSWERING,
        currentAnsweringTeam: targetId,
        answeringRoundStartTime: now,
        awaitingTeamSelection: false,
        hintRevealed: false,
      },
      $unset: { spinPassPickerTeam: 1 },
    },
    { new: true },
  );

  if (!gameState) {
    throw new SpinPassError(
      "This team can't be selected (already tried, or the pass is no longer open).",
      409,
    );
  }

  SessionEmitters.toSession(sessionId, Events.TEAM_SELECTED, {
    teamId: targetTeamId,
    teamName: team.teamName,
    startTime: now,
    selectedBy,
  });
  SessionEmitters.toTeam(sessionId, targetTeamId, Events.ANSWERING_ROUND_STARTED, {
    startTime: now,
  });
  emitState(sessionId, gameState, { answeringStartTime: now });
  return gameState;
};
