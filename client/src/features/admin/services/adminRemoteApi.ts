import { api } from "../../../app/api";

// Admin Remote Control Actions
export type GameStateAction =
  | "PAUSE"
  | "RESUME"
  | "NEXT_QUESTION"
  | "SHOW_ANSWER"
  | "SHOW_LEADERBOARD"
  | "PASS_TO_SECOND_TEAM"
  | "SET_ANSWERING_TEAM"
  | "AUTO_SELECT_FASTEST_TEAM"
  | "SHOW_HINT"
  | "START_SPIN_ROUND"
  | "TRIGGER_SPIN_WHEEL"
  | "WHEEL_LANDED"
  | "SET_QUESTION_SETTINGS"
  | "SET_SPIN_HIDE"
  | "SPIN_PASS_SELECT_TEAM"
  | "SPIN_END_TURN";

export interface UpdateGameStateRequest {
  action: GameStateAction;
  payload?: {
    questionId?: string;
    teamId?: string;
    hideFromUsers?: boolean;
    keepBuzzer?: boolean;
  };
}

export interface UpdateGameStateResponse {
  message: string;
  data: {
    gameState: {
      _id: string;
      sessionId: string;
      currentQuestionIndex: number;
      gameStatus: "paused" | "buzzer_round" | "answering" | "spin_round" | "idle";
      currentAnsweringTeam?: {
        _id: string;
        teamNumber: number;
        teamName: string;
        teamScore: number;
      };
      spinWheelState?: {
        teamId?: string;
        isSpinning?: boolean;
        targetCategory?: string;
        winningIndex?: number;
        durationMs?: number;
      };
    };
    gameEnded?: boolean;
    finalLeaderboard?: any[];
    leaderboard?: any[];
    availableCategories?: string[];
    categoryCounts?: Record<string, number>;
    remainingQuestions?: number;
  };
}

export const adminRemoteApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Unified game state update endpoint
    updateGameState: builder.mutation<
      UpdateGameStateResponse,
      UpdateGameStateRequest
    >({
      query: (body) => ({
        url: "/game-state",
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, arg) =>
        arg.action === "SET_QUESTION_SETTINGS"
          ? ["GameState", "Session", "Question"]
          : ["GameState", "Leaderboard", "BuzzerLeaderboard"],
    }),
  }),
});

export const { useUpdateGameStateMutation } = adminRemoteApi;

// Helper hooks for each action
export const usePauseGame = () => {
  const [update, result] = useUpdateGameStateMutation();
  return {
    pauseGame: () => update({ action: "PAUSE" }),
    ...result,
  };
};

export const useResumeGame = () => {
  const [update, result] = useUpdateGameStateMutation();
  return {
    resumeGame: () => update({ action: "RESUME" }),
    ...result,
  };
};

export const useNextQuestion = () => {
  const [update, result] = useUpdateGameStateMutation();
  return {
    /** Optional toggles apply (per session) to the upcoming question before it starts. */
    nextQuestion: (toggles?: { hideFromUsers?: boolean; keepBuzzer?: boolean }) =>
      update({ action: "NEXT_QUESTION", payload: toggles }),
    ...result,
  };
};

export const useShowAnswer = () => {
  const [update, result] = useUpdateGameStateMutation();
  return {
    showAnswer: () => update({ action: "SHOW_ANSWER" }),
    ...result,
  };
};

export const usePassToSecondTeam = () => {
  const [update, result] = useUpdateGameStateMutation();
  return {
    passToSecondTeam: (questionId: string) =>
      update({ action: "PASS_TO_SECOND_TEAM", payload: { questionId } }),
    ...result,
  };
};

export const useSetAnsweringTeam = () => {
  const [update, result] = useUpdateGameStateMutation();
  return {
    setAnsweringTeam: (teamId: string) =>
      update({ action: "SET_ANSWERING_TEAM", payload: { teamId } }),
    ...result,
  };
};

export const useAutoSelectFastestTeam = () => {
  const [update, result] = useUpdateGameStateMutation();
  return {
    autoSelectFastestTeam: (questionId: string) =>
      update({ action: "AUTO_SELECT_FASTEST_TEAM", payload: { questionId } }),
    ...result,
  };
};

export const useShowHint = () => {
  const [update, result] = useUpdateGameStateMutation();
  return {
    showHint: () => update({ action: "SHOW_HINT" }),
    ...result,
  };
};

export const useStartSpinRound = () => {
  const [update, result] = useUpdateGameStateMutation();
  return {
    startSpinRound: (teamId: string, hideFromUsers?: boolean) =>
      update({ action: "START_SPIN_ROUND", payload: { teamId, hideFromUsers } }),
    ...result,
  };
};

export const useTriggerSpinWheel = () => {
  const [update, result] = useUpdateGameStateMutation();
  return {
    triggerSpinWheel: (teamId?: string) =>
      update({ action: "TRIGGER_SPIN_WHEEL", payload: { teamId } }),
    ...result,
  };
};

/** Per-session hide / keepBuzzer for one question (does not modify the library question). */
export const useSetQuestionSettings = () => {
  const [update, result] = useUpdateGameStateMutation();
  return {
    setQuestionSettings: (
      questionId: string,
      settings: { hideFromUsers?: boolean; keepBuzzer?: boolean },
    ) =>
      update({
        action: "SET_QUESTION_SETTINGS",
        payload: { questionId, ...settings },
      }),
    ...result,
  };
};

/** Spin wheel: hide choice applied to whichever question the wheel lands on. */
export const useSetSpinHide = () => {
  const [update, result] = useUpdateGameStateMutation();
  return {
    setSpinHide: (hideFromUsers: boolean) =>
      update({ action: "SET_SPIN_HIDE", payload: { hideFromUsers } }),
    ...result,
  };
};

/** Spin wheel pass: admin picks the next team for the captain, or ends the turn. */
export const useSpinPass = () => {
  const [update, result] = useUpdateGameStateMutation();
  return {
    passToTeam: (teamId: string) =>
      update({ action: "SPIN_PASS_SELECT_TEAM", payload: { teamId } }),
    endTurn: () => update({ action: "SPIN_END_TURN" }),
    ...result,
  };
};
