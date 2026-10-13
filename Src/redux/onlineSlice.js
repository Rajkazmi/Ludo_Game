import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  roomCode: null,
  userUid: null,
  hostUid: null,
  playerNo: null,
  displayName: null,
  players: [],
  activePlayers: [],
  error: null,
};

const onlineSlice = createSlice({
  name: 'online',
  initialState,
  reducers: {
    setOnlineRoom: (_state, action) => action.payload,
    clearOnlineRoom: () => initialState,
    setOnlineError: (state, action) => {
      state.error = action.payload;
    },
    clearOnlineError: state => {
      state.error = null;
    },
  },
});

export const {
  setOnlineRoom,
  clearOnlineRoom,
  setOnlineError,
  clearOnlineError,
} = onlineSlice.actions;
export default onlineSlice.reducer;
