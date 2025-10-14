import { api } from '../../../app/api';

export interface BuzzerLeaderboardEntry {
  rank: number;
  teamId: string;
  teamNumber: number;
  teamName: string;
  teamScore: number;
  timestamp: string;
  pressedAt: Date;
}

export interface BuzzerLeaderboardResponse {
  message: string;
  data: {
    leaderboard: BuzzerLeaderboardEntry[];
    totalTeams: number;
    questionId: string;
  };
}

export interface PressBuzzerRequest {
  timestamp: string;
}

export interface PressBuzzerResponse {
  message: string;
  data: {
    rank: number;
    teamId: string;
    timestamp: string;
    buzzerEntry: {
      _id: string;
      questionId: string;
      timestamp: string;
      createdAt: Date;
    };
  };
}

export const buzzerApi = api.injectEndpoints({
  endpoints: (builder) => ({
    pressBuzzer: builder.mutation<PressBuzzerResponse, PressBuzzerRequest>({
      query: (body) => ({
        url: '/buzzer/press',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['BuzzerLeaderboard'],
    }),

    fetchBuzzerLeaderboard: builder.query<BuzzerLeaderboardResponse, void>({
      query: () => ({
        url: '/buzzer/leaderboard',
        method: 'GET',
      }),
      providesTags: ['BuzzerLeaderboard'],
    }),

    fetchBuzzerLeaderboardByQuestion: builder.query<BuzzerLeaderboardResponse, string>({
      query: (questionId) => ({
        url: `/buzzer/leaderboard/${questionId}`,
        method: 'GET',
      }),
      providesTags: ['BuzzerLeaderboard'],
    }),
  }),
});

export const {
  usePressBuzzerMutation,
  useFetchBuzzerLeaderboardQuery,
  useLazyFetchBuzzerLeaderboardQuery,
  useFetchBuzzerLeaderboardByQuestionQuery,
  useLazyFetchBuzzerLeaderboardByQuestionQuery,
} = buzzerApi;
