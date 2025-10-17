import { api } from '../../../app/api';
import { Team, TeamResponse } from '../types/interfaces';

export interface AdminLoginRequest {
  password: string;
  sessionId: string;
}

export interface AdminLoginResponse {
  success: boolean;
  message: string;
  token?: string;
  admin?: {
    id: string;
    name: string;
  };
}

// Dashboard Response Types
// Team Dashboard Response
export interface DashboardResponse {
  success: boolean;
  message: string;
  data: {
    session: {
      _id: string;
      sessionName: string;
      status: 'NOT_STARTED' | 'PLAYING' | 'ENDED';
      questionTimeLimit: number;
      answerTimeLimit: number;
      numberOfTeams: number;
      totalQuestions: number;
    };
    gameState: {
      currentQuestionIndex: number;
      gameStatus: 'idle' | 'buzzer_round' | 'answering' | 'paused' | 'playing';
      currentAnsweringTeam: any;
    };
    teams: Team[];
    statistics: {
      totalTeamsRegistered: number;
      totalTeamsExpected: number;
      currentQuestion: number;
      totalQuestions: number;
    };
  };
}

// Update Team Request/Response
export interface UpdateTeamRequest {
  teamName?: string;
  teamScore?: number;
}

export interface UpdateTeamResponse {
  success: boolean;
  message: string;
  data: {
    team: {
      _id: string;
      teamNumber: number;
      teamName: string;
      teamScore: number;
    };
  };
}

// Team Responses
export interface TeamResponsesResponse {
  success: boolean;
  message: string;
  team: {
    _id: string;
    teamNumber: number;
    teamName: string;
    teamScore: number;
  };
  responses: TeamResponse[];
}

export const adminApi = api.injectEndpoints({
  endpoints: (builder) => ({
    adminLogin: builder.mutation<AdminLoginResponse, AdminLoginRequest>({
      query: (credentials) => ({
        url: '/admin/login',
        method: 'POST',
        body: credentials,
      }),
    }),

    adminLogout: builder.mutation({
      query: () => ({
        url: '/admin/logout',
        method: 'POST',
      }),
    }),


    fetchAdmin: builder.query({
      query: () => ({
        url: '/admin/fetchAdmin',
        method: 'GET',
      }),
      transformResponse: (response: any) => response.data,
    }),

    updateSession: builder.mutation({
      query: (updateData) => ({
        url: '/session/update',
        method: 'PUT',
        body: updateData,
      }),
    }),

    fetchDashboardData: builder.query({
      query: () => ({
        url: '/admin/fetchDashboardData',
        method: 'GET',
      }),
      transformResponse: (response: any) => response.data,
    }),

    fetchLeaderboardData: builder.query({
      query: () => ({
        url: '/admin/fetchLeaderboardData',
        method: 'GET',
      }),
      transformResponse: (response: any) => response.data,
    }),

    updatePlayer: builder.mutation({
      query: (updateData) => ({
        url: '/admin/updatePlayer',
        method: 'PUT',
        body: updateData,
      }),
    }),

    getPlayerWithResponses: builder.query({
      query: (playerId: string) => ({
        url: `/admin/getPlayerWithResponses/${playerId}`,
        method: 'GET',
      }),
      transformResponse: (response: any) => response.data,
      // providesTags: ["AdminPlayer"],
    }),

    checkPlayersReadiness: builder.query({
      query: () => ({
        url: '/admin/checkPlayersReadiness',
        method: 'GET',
      }),
      transformResponse: (response: any) => response.data,
    }),

    // ===== NEW TEAM-BASED ENDPOINTS =====

    // Fetch dashboard data (teams, session, game state)
    fetchTeamDashboard: builder.query<DashboardResponse, void>({
      query: () => ({
        url: '/admin/dashboard',
        method: 'GET',
      }),
      providesTags: ['Team', 'GameState'],
    }),

    // Update team (name or score) - single optimized endpoint
    updateTeam: builder.mutation<UpdateTeamResponse, { teamId: string; data: UpdateTeamRequest }>({
      query: ({ teamId, data }) => ({
        url: `/admin/teams/${teamId}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['Team'],
    }),

    // Fetch team responses
    fetchTeamResponses: builder.query<TeamResponsesResponse, string>({
      query: (teamId) => ({
        url: `/admin/teams/${teamId}/responses`,
        method: 'GET',
      }),
      transformResponse: (response: any) => response.data,
    }),

  }),

});

export const {
  useAdminLoginMutation,
  useAdminLogoutMutation,
  useUpdateSessionMutation,
  useFetchDashboardDataQuery,
  useFetchLeaderboardDataQuery,
  useUpdatePlayerMutation,
  useLazyGetPlayerWithResponsesQuery,
  useLazyFetchAdminQuery,
  useLazyCheckPlayersReadinessQuery,
  // New team-based hooks
  useFetchTeamDashboardQuery,
  useLazyFetchTeamDashboardQuery,
  useUpdateTeamMutation,
  useFetchTeamResponsesQuery,
  useLazyFetchTeamResponsesQuery,
} = adminApi;
