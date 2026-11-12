import { api } from '../../../app/api';

export interface Session {
    _id: string;
    sessionName: string;
    companyName?: string;
    companyLogo?: string;
    questionTimeLimit: number;
    answerTimeLimit: number;
    questions: string[];
    /** Per-session overrides of library question flags. */
    questionSettings?: Array<{
        question: string;
        hideFromUsers?: boolean;
        keepBuzzer?: boolean;
    }>;
    gameMode?: 'BUZZER_BATTLE' | 'SPIN_WHEEL' | null;
    status: 'not_started' | 'playing' | 'ended';
    numberOfTeams: number | null;
    teamMode?: 'NUMBER' | 'COLOR';
    colorTeams?: number[];
    createdAt: string;
    updatedAt: string;
}

export interface SessionResponse {
    message: string;
    data: Session;
    success: boolean;
}

/** Public, unauthenticated subset served by GET /session/:sessionId (login branding). */
export type PublicSessionInfo = Pick<
    Session,
    | 'sessionName'
    | 'companyName'
    | 'companyLogo'
    | 'teamMode'
    | 'colorTeams'
    | 'numberOfTeams'
    | 'gameMode'
    | 'status'
>;

export interface PublicSessionResponse {
    message?: string;
    data: PublicSessionInfo;
    success?: boolean;
}

export interface UpdateSessionRequest {
    companyName?: string;
    companyLogo?: string;
    questionTimeLimit?: number;
    answerTimeLimit?: number;
    questions?: string[];
    gameMode?: 'BUZZER_BATTLE' | 'SPIN_WHEEL';
    status?: 'not_started' | 'playing' | 'ended';
    numberOfTeams?: number;
    teamMode?: 'NUMBER' | 'COLOR';
    colorTeams?: number[];
}

export const sessionApi = api.injectEndpoints({
    endpoints: (builder) => ({
        // Fetch current session (uses sessionId from auth)
        fetchSession: builder.query<SessionResponse, void>({
            query: () => ({
                url: '/session/getSession',
                method: 'GET',
            }),
            providesTags: ['Session'],
        }),

        // Fetch populated session questions with status
        fetchSessionQuestionsStatus: builder.query<any, void>({
            query: () => ({
                url: '/session/questions-status',
                method: 'GET',
            }),
            providesTags: ['Session', 'GameState'],
        }),

        // Fetch session by ID (public - no auth required)
        fetchSessionById: builder.query<PublicSessionResponse, string>({
            query: (sessionId) => ({
                url: `/session/${sessionId}`,
                method: 'GET',
            }),
            providesTags: (_result, _error, sessionId) => [
                { type: 'Session', id: sessionId },
            ],
        }),

        // Update session
        updateSession: builder.mutation<SessionResponse, UpdateSessionRequest>({
            query: (updateData) => ({
                url: '/session/update',
                method: 'PUT',
                body: updateData,
            }),
            invalidatesTags: ['Session'],
        }),

        // Upload session logo
        uploadSessionLogo: builder.mutation<{ message: string, data: { fileUrl: string }, success: boolean }, FormData>({
            query: (formData) => ({
                url: '/session/upload-logo',
                method: 'POST',
                body: formData,
            }),
        }),
    }),
});

export const {
    useFetchSessionQuery,
    useLazyFetchSessionQuery,
    useFetchSessionByIdQuery,
    useLazyFetchSessionByIdQuery,
    useUpdateSessionMutation,
    useUploadSessionLogoMutation,
    useFetchSessionQuestionsStatusQuery,
    useLazyFetchSessionQuestionsStatusQuery,
} = sessionApi;
