import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SerializedError } from '@reduxjs/toolkit';
import { adminApi } from './admin.Api';

export interface AdminUser {
    id: string;
    name: string;
}

export interface AdminState {
    admin: AdminUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: SerializedError | null;
    token: string | null;
}

const initialState: AdminState = {
    admin: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    token: localStorage.getItem('adminToken') || null,
};

const adminSlice = createSlice({
    name: 'admin',
    initialState,
    reducers: {
        setAdmin: (state, action: PayloadAction<AdminUser>) => {
            state.admin = action.payload;
            state.isAuthenticated = true;
            state.error = null;
        },
        setToken: (state, action: PayloadAction<string>) => {
            state.token = action.payload;
            localStorage.setItem('adminToken', action.payload);
        },
        clearAdmin: (state) => {
            state.admin = null;
            state.isAuthenticated = false;
            state.token = null;
            state.error = null;
            localStorage.removeItem('adminToken');
        },
        clearError: (state) => {
            state.error = null;
        },
        // Action to initialize auth state from localStorage
        initializeAuth: (state) => {
            const token = localStorage.getItem('adminToken');
            if (token) {
                state.token = token;
                state.isAuthenticated = true;
            }
        },
    },
    extraReducers: (builder) => {
        builder
            // Handle admin login
            .addMatcher(
                adminApi.endpoints.adminLogin.matchPending,
                (state) => {
                    state.isLoading = true;
                    state.error = null;
                }
            )
            .addMatcher(
                adminApi.endpoints.adminLogin.matchFulfilled,
                (state, action: any) => {
                    state.isLoading = false;
                    if (action.payload.success) {
                        if (action.payload.admin) {
                            state.admin = action.payload.admin;
                        }
                        if (action.payload.token) {
                            state.token = action.payload.token;
                            localStorage.setItem('adminToken', action.payload.token);
                        }
                        state.isAuthenticated = true;
                        state.error = null;
                    }
                }
            )
            .addMatcher(
                adminApi.endpoints.adminLogin.matchRejected,
                (state, action: any) => {
                    state.isLoading = false;
                    state.error = action.error;
                    state.isAuthenticated = false;
                    state.admin = null;
                    state.token = null;
                    localStorage.removeItem('adminToken');
                }
            );


        builder
            .addMatcher(
                adminApi.endpoints.fetchAdmin.matchPending,
                (state) => {
                    state.error = null;
                    state.isLoading = true;
                }
            )
            .addMatcher(
                adminApi.endpoints.fetchAdmin.matchFulfilled,
                (state) => {
                    state.isLoading = false;
                    state.isAuthenticated = true;
                }
            )
            .addMatcher(
                adminApi.endpoints.fetchAdmin.matchRejected,
                (state, { error }) => {
                    state.error = error;
                    state.isLoading = false;
                }
            );
        builder
            .addMatcher(
                adminApi.endpoints.updateSession.matchPending,
                (state) => {
                    state.error = null;
                }
            )
            .addMatcher(
                adminApi.endpoints.updateSession.matchFulfilled,
                () => {
                }
            )
            .addMatcher(
                adminApi.endpoints.updateSession.matchRejected,
                (state, { error }) => {
                    state.error = error;
                }
            );

        builder
            .addMatcher(
                adminApi.endpoints.fetchDashboardData.matchPending,
                (state) => {
                    state.error = null;
                }
            )
            .addMatcher(
                adminApi.endpoints.fetchDashboardData.matchFulfilled,
                () => {
                }
            )
            .addMatcher(
                adminApi.endpoints.fetchDashboardData.matchRejected,
                (state, { error }) => {
                    state.error = error;
                }
            );

        builder
            .addMatcher(
                adminApi.endpoints.updatePlayer.matchPending,
                (state) => {
                    state.error = null;
                }
            )
            .addMatcher(
                adminApi.endpoints.updatePlayer.matchFulfilled,
                () => {
                }
            )
            .addMatcher(
                adminApi.endpoints.updatePlayer.matchRejected,
                (state, { error }) => {
                    state.error = error;
                }
            );


        builder
            .addMatcher(
                adminApi.endpoints.getPlayerWithResponses.matchPending,
                (state) => {
                    // state.isLoading = true;
                    state.error = null;
                }
            )
            .addMatcher(
                adminApi.endpoints.getPlayerWithResponses.matchFulfilled,
                () => {
                    // state.isLoading = false;
                }
            )
            .addMatcher(
                adminApi.endpoints.getPlayerWithResponses.matchRejected,
                (state, { error }) => {
                    // state.isLoading = false;
                    state.error = error;
                }
            );

    },
});

export const {
    setAdmin,
    setToken,
    clearAdmin,
    clearError,
    initializeAuth,
} = adminSlice.actions;

// Selectors
export const selectAdmin = (state: { admin: AdminState }) => state.admin.admin;
export const selectIsAuthenticated = (state: { admin: AdminState }) => state.admin.isAuthenticated;
export const selectAdminLoading = (state: { admin: AdminState }) => state.admin.isLoading;
export const selectAdminError = (state: { admin: AdminState }) => state.admin.error;
export const selectAdminToken = (state: { admin: AdminState }) => state.admin.token;

export default adminSlice.reducer;
