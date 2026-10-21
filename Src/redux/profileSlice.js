import { createSlice } from '@reduxjs/toolkit';

const profileSlice = createSlice({
  name: 'profile',
  initialState: null,
  reducers: {
    setUserProfile: (_state, action) => action.payload,
    clearUserProfile: () => null,
  },
});

export const { setUserProfile, clearUserProfile } = profileSlice.actions;
export const selectUserProfile = state => state.profile;
export default profileSlice.reducer;
