import { api } from '../../../app/api';

// Admin Remote Control Actions
export type GameStateAction =
  | 'START_BUZZER_ROUND'
  | 'PAUSE'
  | 'RESUME'
  | 'NEXT_QUESTION'
  | 'SHOW_LEADERBOARD'
  | 'PASS_TO_SECOND_TEAM'
  | 'SET_ANSWERING_TEAM'
  | 'AUTO_SELECT_FASTEST_TEAM';

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
      gameStatus: 'paused' | 'buzzer_round' | 'answering';
      currentAnsweringTeam?: {
        _id: string;
        teamNumber: number;
        teamName: string;
        teamScore: number;
      };
    };
    gameEnded?: boolean;
    finalLeaderboard?: any[];
    leaderboard?: any[];
  };
}

export const adminRemoteApi = api.injectEndpoints({
  endpoints: (builder) => ({
    // Unified game state update endpoint
    updateGameState: builder.mutation<UpdateGameStateResponse, UpdateGameStateRequest>({
      query: (body) => ({
        url: '/game-state',
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['GameState', 'Leaderboard', 'BuzzerLeaderboard'],
    }),
  }),
});

export const {
  useUpdateGameStateMutation,
} = adminRemoteApi;

// Helper hooks for each action
export const useStartBuzzerRound = () => {
  const [update, result] = useUpdateGameStateMutation();
  return {
    startBuzzerRound: () => update({ action: 'START_BUZZER_ROUND' }),
    ...result,
  };
};

export const usePauseGame = () => {
  const [update, result] = useUpdateGameStateMutation();
  return {
    pauseGame: () => update({ action: 'PAUSE' }),
    ...result,
  };
};

export const useResumeGame = () => {
  const [update, result] = useUpdateGameStateMutation();
  return {
    resumeGame: () => update({ action: 'RESUME' }),
    ...result,
  };
};

export const useNextQuestion = () => {
  const [update, result] = useUpdateGameStateMutation();
  return {
    nextQuestion: () => update({ action: 'NEXT_QUESTION' }),
    ...result,
  };
};

export const useShowLeaderboard = () => {
  const [update, result] = useUpdateGameStateMutation();
  return {
    showLeaderboard: () => update({ action: 'SHOW_LEADERBOARD' }),
    ...result,
  };
};

export const usePassToSecondTeam = () => {
  const [update, result] = useUpdateGameStateMutation();
  return {
    passToSecondTeam: (questionId: string) => 
      update({ action: 'PASS_TO_SECOND_TEAM', payload: { questionId } }),
    ...result,
  };
};

export const useSetAnsweringTeam = () => {
  const [update, result] = useUpdateGameStateMutation();
  return {
    setAnsweringTeam: (teamId: string) =>
      update({ action: 'SET_ANSWERING_TEAM', payload: { teamId } }),
    ...result,
  };
};

export const useAutoSelectFastestTeam = () => {
  const [update, result] = useUpdateGameStateMutation();
  return {
    autoSelectFastestTeam: (questionId: string) =>
      update({ action: 'AUTO_SELECT_FASTEST_TEAM', payload: { questionId } }),
    ...result,
  };
};
