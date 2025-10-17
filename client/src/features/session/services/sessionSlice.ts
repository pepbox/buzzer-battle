import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../../../app/store';
import { sessionApi, Session } from './session.api';

export interface SessionState {
  session: Session | null;
  sessionId: string | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: SessionState = {
  session: null,
  sessionId: localStorage.getItem('sessionId') || null,
  isLoading: false,
  error: null,
};

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    setSessionId: (state, action: PayloadAction<string>) => {
      state.sessionId = action.payload;
      localStorage.setItem('sessionId', action.payload);
    },
    clearSessionId: (state) => {
      state.sessionId = null;
      localStorage.removeItem('sessionId');
    },
    clearSession: (state) => {
      state.session = null;
      state.sessionId = null;
      state.error = null;
      localStorage.removeItem('sessionId');
    },
    setSession: (state, action: PayloadAction<Session>) => {
      state.session = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch session
    builder.addMatcher(
      sessionApi.endpoints.fetchSession.matchPending,
      (state) => {
        state.isLoading = true;
        state.error = null;
      }
    );
    builder.addMatcher(
      sessionApi.endpoints.fetchSession.matchFulfilled,
      (state, action) => {
        state.isLoading = false;
        state.session = action.payload.data;
        state.error = null;
      }
    );
    builder.addMatcher(
      sessionApi.endpoints.fetchSession.matchRejected,
      (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch session';
      }
    );

    // Fetch session by ID
    builder.addMatcher(
      sessionApi.endpoints.fetchSessionById.matchPending,
      (state) => {
        state.isLoading = true;
        state.error = null;
      }
    );
    builder.addMatcher(
      sessionApi.endpoints.fetchSessionById.matchFulfilled,
      (state, action) => {
        state.isLoading = false;
        state.session = action.payload.data;
        state.error = null;
        // Also set sessionId if not already set
        if (!state.sessionId && action.payload.data._id) {
          state.sessionId = action.payload.data._id;
          localStorage.setItem('sessionId', action.payload.data._id);
        }
      }
    );
    builder.addMatcher(
      sessionApi.endpoints.fetchSessionById.matchRejected,
      (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch session';
      }
    );

    // Update session
    builder.addMatcher(
      sessionApi.endpoints.updateSession.matchFulfilled,
      (state, action) => {
        state.session = action.payload.data;
      }
    );
  },
});

export const { setSessionId, clearSessionId, clearSession, setSession } =
  sessionSlice.actions;

// Selectors
export const selectSession = (state: RootState) => state.session.session;
export const selectSessionId = (state: RootState) => state.session.sessionId;
export const selectSessionLoading = (state: RootState) => state.session.isLoading;
export const selectSessionError = (state: RootState) => state.session.error;

export default sessionSlice.reducer;
