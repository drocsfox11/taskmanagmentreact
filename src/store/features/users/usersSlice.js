import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  byUsername: {},
  byId: {},
  loading: {},
  error: {}
};

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    fetchUserStart(state, action) {
      const username = action.payload;
      state.loading[username] = true;
      state.error[username] = null;
    },
    fetchUserSuccess(state, action) {
      const { username, userData } = action.payload;
      state.byUsername[username] = userData;
      if (userData.id) {
        state.byId[userData.id] = userData;
      }
      state.loading[username] = false;
    },
    fetchUserFailure(state, action) {
      const { username, error } = action.payload;
      state.loading[username] = false;
      state.error[username] = error;
    },
    addUserData(state, action) {
      const { username, avatarURL, userId } = action.payload;
      if (!username) return;
      
      const userData = {
        username,
        avatarURL,
        id: userId
      };
      
      state.byUsername[username] = {
        ...state.byUsername[username],
        ...userData
      };
      
      if (userId) {
        state.byId[userId] = {
          ...state.byId[userId],
          ...userData
        };
      }
    }
  }
});

export const { 
  fetchUserStart, 
  fetchUserSuccess, 
  fetchUserFailure,
  addUserData
} = usersSlice.actions;

export default usersSlice.reducer; 