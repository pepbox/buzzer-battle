import { api } from '../../../app/api';

export interface Session {
    _id: string;
    sessionName: string;
    companyName?: string;
    companyLogo?: string;
    questionTimeLimit: number;
    answerTimeLimit: number;
    questions: string[];
    status: 'not_started' | 'playing' | 'ended';
    numberOfTeams: number | null;
    createdAt: string;
    updatedAt: string;
}

export interface SessionResponse {
    message: string;
    data: Session;
    success: boolean;
}

export interface UpdateSessionRequest {
    companyName?: string;
    companyLogo?: string;
    questionTimeLimit?: number;
    answerTimeLimit?: number;
    questions?: string[];
    status?: 'not_started' | 'playing' | 'ended';
    numberOfTeams?: number;
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

        // Fetch session by ID (public - no auth required)
        fetchSessionById: builder.query<SessionResponse, string>({
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
} = sessionApi;
