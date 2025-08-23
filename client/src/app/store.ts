import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query/react';
import { api } from './api';
// import errorMiddleware from './middleware/errorMiddleware';
// import gameReducer from '../features/game/services/gameSlice';
// import playerReducer from '../features/player/services/player.slice';
// import gameArenaReducer from '../features/game/services/gameArenaSlice';
import adminReducer from '../features/admin/services/adminSlice';

export const store = configureStore({
  reducer: {
    // user: userReducer,
    // game: gameReducer,
    // player: playerReducer,
    // gameArena: gameArenaReducer,
    admin: adminReducer,
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(api.middleware)
});

// Enable refetchOnFocus/refetchOnReconnect
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;