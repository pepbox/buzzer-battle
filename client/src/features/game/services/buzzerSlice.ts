import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SerializedError } from '@reduxjs/toolkit';
import { buzzerApi, BuzzerLeaderboardEntry } from './buzzerApi';

export interface BuzzerState {
    leaderboard: BuzzerLeaderboardEntry[];
    hasPressed: boolean;
    pressTimestamp: string | null;
    isLoading: boolean;
    error: SerializedError | null;
}

const initialState: BuzzerState = {
    leaderboard: [],
    hasPressed: false,
    pressTimestamp: null,
    isLoading: false,
    error: null,
};

const buzzerSlice = createSlice({
    name: 'buzzer',
    initialState,
    reducers: {
        setBuzzerPressed: (state, action: PayloadAction<string>) => {
            state.hasPressed = true;
            state.pressTimestamp = action.payload;
            state.error = null;
        },
        resetBuzzer: (state) => {
            state.hasPressed = false;
            state.pressTimestamp = null;
            state.leaderboard = [];
            state.error = null;
        },
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        // Fetch Buzzer Leaderboard
        builder
            .addMatcher(
                buzzerApi.endpoints.fetchBuzzerLeaderboard.matchPending,
                (state) => {
                    state.isLoading = true;
                    state.error = null;
                }
            )
            .addMatcher(
                buzzerApi.endpoints.fetchBuzzerLeaderboard.matchFulfilled,
                (state, { payload }) => {
                    state.leaderboard = payload.data.leaderboard;
                    state.isLoading = false;
                    state.error = null;
                }
            )
            .addMatcher(
                buzzerApi.endpoints.fetchBuzzerLeaderboard.matchRejected,
                (state, { error }) => {
                    state.isLoading = false;
                    state.error = error;
                }
            );

        // Fetch Buzzer Leaderboard By Question
        builder
            .addMatcher(
                buzzerApi.endpoints.fetchBuzzerLeaderboardByQuestion.matchPending,
                (state) => {
                    state.isLoading = true;
                    state.error = null;
                }
            )
            .addMatcher(
                buzzerApi.endpoints.fetchBuzzerLeaderboardByQuestion.matchFulfilled,
                (state, { payload }) => {
                    state.leaderboard = payload.data.leaderboard;
                    state.isLoading = false;
                    state.error = null;
                }
            )
            .addMatcher(
                buzzerApi.endpoints.fetchBuzzerLeaderboardByQuestion.matchRejected,
                (state, { error }) => {
                    state.isLoading = false;
                    state.error = error;
                }
            );
    },
});

export const { setBuzzerPressed, resetBuzzer, clearError } = buzzerSlice.actions;
export default buzzerSlice.reducer;
