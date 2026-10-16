import { configureStore } from '@reduxjs/toolkit';
import {
  FLUSH,
  REHYDRATE,
  PAUSE,
  REGISTER,
  PERSIST,
  PURGE,
  createMigrate,
  persistReducer,
  persistStore,
} from 'redux-persist';
import reduxStorage from './storage';
import rootReducer from './rootReducer';
import { initialState } from './reducers/initialState';

const migrations = {
  1: state => {
    if (!state?.game || state.game.chancePlayer !== undefined) {
      return state;
    }

    const { chacePlayer, ...gameState } = state.game;
    return {
      ...state,
      game: {
        ...gameState,
        chancePlayer: chacePlayer ?? initialState.chancePlayer,
      },
    };
  },
  2: state => {
    if (!state?.game || state.game.fireworks !== undefined) {
      return state;
    }

    const { firworks, ...gameState } = state.game;
    return {
      ...state,
      game: {
        ...gameState,
        fireworks: firworks ?? initialState.fireworks,
      },
    };
  },
  3: state => {
    if (!state?.game) {
      return state;
    }

    return {
      ...state,
      game: {
        ...initialState,
        ...state.game,
        activePlayers: state.game.activePlayers ?? initialState.activePlayers,
        winners:
          state.game.winners ??
          (state.game.winner == null ? [] : [state.game.winner]),
      },
    };
  },
};

const persistConfig = {
  key: 'root',
  storage: reduxStorage,
  version: 3,
  migrate: createMigrate(migrations),
  blacklist: [],
  whitelist: ['game'],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);
