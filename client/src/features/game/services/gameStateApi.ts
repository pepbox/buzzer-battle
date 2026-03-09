import { api } from '../../../app/api';

export type GameStatus = 'paused' | 'buzzer_round' | 'answering' | 'idle';

export interface GameState {
  _id: string;
  sessionId: string;
  currentQuestionIndex: number;
  gameStatus: GameStatus;
  currentAnsweringTeam?: {
    _id: string;
    teamNumber: number;
    teamName: string;
    teamScore: number;
  } | string;
  buzzerRoundStartTime?: number;
  answeringRoundStartTime?: number;
  idleStartTime?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GameStateResponse {
  message: string;
  data: {
    gameState: GameState;
  };
}

export interface MarkAnswerRequest {
  isCorrect: boolean;
}

export interface MarkAnswerResponse {
  message: string;
  data: {
    gameState: GameState;
    isCorrect: boolean;
    pointsAwarded: number;
    teamId: string;
  };
}

export const gameStateApi = api.injectEndpoints({
  endpoints: (builder) => ({
    fetchGameState: builder.query<GameStateResponse, void>({
      query: () => ({
        url: '/game-state/current',
        method: 'GET',
      }),
      providesTags: ['GameState'],
    }),

    markAnswer: builder.mutation<MarkAnswerResponse, MarkAnswerRequest>({
      query: (data) => ({
        url: '/game-state/mark-answer',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['GameState'],
    }),
  }),
});

export const {
  useFetchGameStateQuery,
  useLazyFetchGameStateQuery,
  useMarkAnswerMutation,
} = gameStateApi;

