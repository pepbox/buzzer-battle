import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { SerializedError } from "@reduxjs/toolkit";
import { teamApi, Team } from "./teamApi";

export interface TeamState {
  team: Team | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: SerializedError | null;
}

const initialState: TeamState = {
  team: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

const teamSlice = createSlice({
  name: "team",
  initialState,
  reducers: {
    setTeam: (state, action: PayloadAction<Team>) => {
      state.team = action.payload;
      state.isAuthenticated = true;
      state.error = null;
    },
    clearTeam: (state) => {
      state.team = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Create Team
    builder
      .addMatcher(teamApi.endpoints.createTeam.matchPending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addMatcher(
        teamApi.endpoints.createTeam.matchFulfilled,
        (state, { payload }) => {
          state.team = payload.data.team;
          state.isAuthenticated = true;
          state.isLoading = false;
          state.error = null;
        }
      )
      .addMatcher(
        teamApi.endpoints.createTeam.matchRejected,
        (state, { error }) => {
          state.isLoading = false;
          state.error = error;
        }
      )
      .addMatcher(teamApi.endpoints.fetchCurrentTeam.matchPending, (state) => {
        // Only the initial auth resolution shows the loader; background
        // refetches (tag invalidations from socket events) must not.
        if (!state.team) {
          state.isLoading = true;
        }
        state.error = null;
      })
      .addMatcher(
        teamApi.endpoints.fetchCurrentTeam.matchFulfilled,
        (state, { payload }) => {
          state.team = payload.data.team;
          state.isAuthenticated = true;
          state.isLoading = false;
          state.error = null;
        }
      )
      .addMatcher(
        teamApi.endpoints.fetchCurrentTeam.matchRejected,
        (state, action) => {
          state.isLoading = false;
          state.error = action.error;
          // Only a real auth failure logs the player out; a network blip or
          // 5xx during a background refetch keeps the current session.
          const status = (action.payload as { status?: unknown } | undefined)
            ?.status;
          if (status === 401 || status === 403) {
            state.isAuthenticated = false;
          }
        }
      );
  },
});

export const { setTeam, clearTeam, clearError } = teamSlice.actions;
export default teamSlice.reducer;
