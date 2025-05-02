import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  username: null,
  name: null,
  avatar: null,
  lastLogin: null,
  error: null,
  isLoading: false
};

const currentUserSlice = createSlice({
  name: 'currentUser',
  initialState,
  reducers: {
    login: (state, action) => {
      state.isLoading = true;
      state.error = null;
    },
    register: (state, action) => {
      state.isLoading = true;
      state.error = null;
    },
    setCurrentUser: (state, action) => {
      return { 
        ...state, 
        ...action.payload,
        isLoading: false,
        error: null
      };
    },
    clearCurrentUser: () => ({
      ...initialState,
      isLoading: false
    }),
    updateLastLogin: (state) => {
      state.lastLogin = new Date().toISOString();
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    resetError: (state) => {
      state.error = null;
    },
    logout: (state) => {
      state.isLoading = true;
      state.error = null;
    }
  }
});

export const { 
  login, 
  register, 
  setCurrentUser, 
  clearCurrentUser, 
  updateLastLogin, 
  setError, 
  resetError, 
  logout 
} = currentUserSlice.actions;

export default currentUserSlice.reducer; 