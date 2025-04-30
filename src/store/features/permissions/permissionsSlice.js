import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  projectPermissions: {
    UPDATE_PROJECT: false,
    MANAGE_PROJECT_PARTICIPANTS: false,
  },
  boardPermissions: {
    UPDATE_BOARD: false,
    MANAGE_BOARD_PARTICIPANTS: false,
    MANAGE_BOARD_TAGS: false,
    CREATE_TASK: false,
    UPDATE_TASK: false,
    DELETE_TASK: false,
    MANAGE_TASK_COLUMN: false,
    MOVE_TASK: false,
    UPDATE_TASK_STATUS: false,
  },
  loading: false,
  error: null,
};

const permissionsSlice = createSlice({
  name: 'permissions',
  initialState,
  reducers: {
    setProjectPermissions: (state, action) => {
      state.projectPermissions = action.payload;
    },
    setBoardPermissions: (state, action) => {
      state.boardPermissions = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    resetPermissions: (state) => {
      state.projectPermissions = initialState.projectPermissions;
      state.boardPermissions = initialState.boardPermissions;
    },
  },
});

export const {
  setProjectPermissions,
  setBoardPermissions,
  setLoading,
  setError,
  resetPermissions,
} = permissionsSlice.actions;

export default permissionsSlice.reducer; 