import { api } from '../../../app/api';

export type GameStatus = 'paused' | 'buzzer_round' | 'spin_round' | 'answering' | 'idle';

export interface ISpinWheelState {
  selectedTeamId?: string;
  isSpinning?: boolean;
  targetCategory?: string;
  winningIndex?: number;
  durationMs?: number;
  startTime?: number;
  targetQuestionId?: string;
}

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
  isNoBuzzerQuestion?: boolean;
  awaitingTeamSelection?: boolean;
  spinHideQuestion?: boolean;
  /** Spin wheel pass: team whose captain picks the next team (id or populated team). */
  spinPassPickerTeam?: string | { _id: string; teamName?: string; teamNumber?: number } | null;
  /** Teams that already attempted the current question. */
  teamsWhoAnsweredThisQuestion?: string[];
  /** Spin turn ended without a correct answer; answer is not revealed. */
  answerWithheld?: boolean;
  completedQuestionIds?: string[];
  currentCategory?: string;
  spinWheelState?: ISpinWheelState;
  availableCategories?: string[];
  categoryCounts?: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
}

export interface GameStateResponse {
  message: string;
  data: {
    gameState: GameState;
  };
}

export interface AvailableCategoriesResponse {
  message: string;
  data: {
    categories: string[];
    categoryCounts: Record<string, number>;
    remainingQuestions: number;
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
    gameEnded?: boolean;
    categoryExhausted?: boolean;
    finalLeaderboard?: any;
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

    fetchAvailableCategories: builder.query<AvailableCategoriesResponse, void>({
      query: () => ({
        url: '/game-state/categories',
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
  useFetchAvailableCategoriesQuery,
  useLazyFetchAvailableCategoriesQuery,
  useMarkAnswerMutation,
} = gameStateApi;

