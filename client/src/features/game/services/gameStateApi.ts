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
  hintRevealed?: boolean;
  isLeaderboardVisible?: boolean;
  isSpinWheelEnabled?: boolean;
  availableCategories?: string[];
  canSpinTeam?: string;
  spinPermissionGranted?: boolean;
  selectedCategory?: string;
  usedQuestionIds?: string[];
  isQuestionVisible?: boolean;
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
  penalty?: number;
  scorePenalty?: number;
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

export interface SpinWheelResponse {
  message: string;
  data: {
    category: string;
    gameState: GameState;
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

    spinWheel: builder.mutation<SpinWheelResponse, void>({
      query: () => ({
        url: '/game-state/spin-wheel',
        method: 'POST',
      }),
      invalidatesTags: ['GameState'],
    }),
  }),
});

export const {
  useFetchGameStateQuery,
  useLazyFetchGameStateQuery,
  useMarkAnswerMutation,
  useSpinWheelMutation,
} = gameStateApi;

