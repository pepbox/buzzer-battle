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
  | "WHEEL_LANDED";

export interface UpdateGameStateRequest {
  action: GameStateAction;
  payload?: {
    questionId?: string;
    teamId?: string;
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
      invalidatesTags: ["GameState", "Leaderboard", "BuzzerLeaderboard"],
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
    nextQuestion: () => update({ action: "NEXT_QUESTION" }),
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
    startSpinRound: (teamId: string) =>
      update({ action: "START_SPIN_ROUND", payload: { teamId } }),
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
