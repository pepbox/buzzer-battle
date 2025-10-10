import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SerializedError } from '@reduxjs/toolkit';
import { gameStateApi, GameState, GameStatus } from './gameStateApi';

export interface GameStateSliceState {
    gameState: GameState | null;
    isLoading: boolean;
    error: SerializedError | null;
}

const initialState: GameStateSliceState = {
    gameState: null,
    isLoading: false,
    error: null,
};

const gameStateSlice = createSlice({
    name: 'gameState',
    initialState,
    reducers: {
        setGameState: (state, action: PayloadAction<GameState>) => {
            state.gameState = action.payload;
            state.error = null;
        },
        updateGameStatus: (state, action: PayloadAction<GameStatus>) => {
            if (state.gameState) {
                state.gameState.gameStatus = action.payload;
            }
        },
        updateCurrentAnsweringTeam: (state, action: PayloadAction<string | undefined>) => {
            if (state.gameState) {
                state.gameState.currentAnsweringTeam = action.payload;
            }
        },
        clearGameState: (state) => {
            state.gameState = null;
            state.error = null;
        },
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        // Fetch Game State
        builder
            .addMatcher(
                gameStateApi.endpoints.fetchGameState.matchPending,
                (state) => {
                    state.isLoading = true;
                    state.error = null;
                }
            )
            .addMatcher(
                gameStateApi.endpoints.fetchGameState.matchFulfilled,
                (state, { payload }) => {
                    state.gameState = payload.data.gameState;
                    state.isLoading = false;
                    state.error = null;
                }
            )
            .addMatcher(
                gameStateApi.endpoints.fetchGameState.matchRejected,
                (state, { error }) => {
                    state.isLoading = false;
                    state.error = error;
                }
            );
    },
});

export const {
    setGameState,
    updateGameStatus,
    updateCurrentAnsweringTeam,
    clearGameState,
    clearError,
} = gameStateSlice.actions;

export default gameStateSlice.reducer;
