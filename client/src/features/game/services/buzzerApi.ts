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

export const buzzerApi = api.injectEndpoints({
  endpoints: (builder) => ({
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
  useFetchBuzzerLeaderboardQuery,
  useLazyFetchBuzzerLeaderboardQuery,
  useFetchBuzzerLeaderboardByQuestionQuery,
  useLazyFetchBuzzerLeaderboardByQuestionQuery,
} = buzzerApi;
