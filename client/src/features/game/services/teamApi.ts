import { api } from "../../../app/api";

export interface Team {
  _id: string;
  teamNumber: number;
  teamName: string;
  teamScore: number;
  joinedAt: Date;
  sessionId: string;
}

export interface CreateTeamRequest {
  teamNumber: number;
  teamName: string;
  sessionId: string;
}

export interface CreateTeamResponse {
  message: string;
  data: {
    team: Team;
    accessToken: string;
  };
}

export interface LeaderboardTeam {
  _id: string;
  teamNumber: number;
  teamName: string;
  teamScore: number;
  joinedAt: Date;
}

export interface LeaderboardResponse {
  message: string;
  data: {
    leaderboard: LeaderboardTeam[];
  };
}

export const teamApi = api.injectEndpoints({
  endpoints: (builder) => ({
    createTeam: builder.mutation<CreateTeamResponse, CreateTeamRequest>({
      query: (credentials) => ({
        url: "/teams/create",
        method: "POST",
        body: credentials,
      }),
      invalidatesTags: ["Team"],
    }),

    fetchCurrentTeam: builder.query<
      { message: string; data: { team: Team } },
      { sessionId?: string } | void
    >({
      query: (arg) => ({
        url: `/teams/me${arg?.sessionId ? `?sessionId=${arg.sessionId}` : ""}`,
        method: "GET",
      }),
      providesTags: ["Team"],
    }),

    fetchOverallLeaderboard: builder.query<LeaderboardResponse, void>({
      query: () => ({
        url: "/teams/leaderboard",
        method: "GET",
      }),
      providesTags: ["Leaderboard"],
    }),

    fetchTotalTeamsInSession: builder.query<
      { message: string; data: { totalTeams: number } },
      { sessionId: string }
    >({
      query: ({ sessionId }) => ({
        url: `/teams/fetchTotalTeamsInSession/${sessionId}`,
        method: "GET",
      }),
    }),

    fetchJoinedTeamNumbers: builder.query<
      { message: string; data: { joinedTeamNumbers: number[] } },
      { sessionId: string }
    >({
      query: ({ sessionId }) => ({
        url: `/teams/joined/${sessionId}`,
        method: "GET",
      }),
    }),
  }),
});

export const {
  useCreateTeamMutation,
  useFetchCurrentTeamQuery,
  useLazyFetchCurrentTeamQuery,
  useFetchOverallLeaderboardQuery,
  useLazyFetchOverallLeaderboardQuery,
  useFetchTotalTeamsInSessionQuery,
  useFetchJoinedTeamNumbersQuery,
} = teamApi;
