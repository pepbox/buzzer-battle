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

export const gameStateApi = api.injectEndpoints({
  endpoints: (builder) => ({
    fetchGameState: builder.query<GameStateResponse, void>({
      query: () => ({
        url: '/game-state/current',
        method: 'GET',
      }),
      providesTags: ['GameState'],
    }),
  }),
});

export const {
  useFetchGameStateQuery,
  useLazyFetchGameStateQuery,
} = gameStateApi;
