import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  username: null,
  name: null,
  avatar: null,
  isAuthenticated: false,
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
    checkAuth: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    setCurrentUser: (state, action) => {
      return { 
        ...state, 
        ...action.payload, 
        isAuthenticated: true,
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
    navigateTo: (state, action) => {
      // This is just a marker action, actual navigation will be handled by middleware
      return state;
    },
    logout: (state) => {
      state.isLoading = true;
      state.error = null;
    }
  }
});

export const { login, register, checkAuth, setCurrentUser, clearCurrentUser, updateLastLogin, setError, resetError, navigateTo, logout } = currentUserSlice.actions;
export default currentUserSlice.reducer; 