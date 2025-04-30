import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  selectedProject: null,
  selectedColumn: null,
  isTaskModalOpen: false,
  isProjectModalOpen: false,
  loading: {
    projects: false,
    tasks: false,
    columns: false,
    boards: false,
    users: false,
    messages: false
  }
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setSelectedProject: (state, action) => {
      state.selectedProject = action.payload;
    },
    setSelectedColumn: (state, action) => {
      state.selectedColumn = action.payload;
    },
    toggleTaskModal: (state) => {
      state.isTaskModalOpen = !state.isTaskModalOpen;
    },
    toggleProjectModal: (state) => {
      state.isProjectModalOpen = !state.isProjectModalOpen;
    },
    setLoading: (state, action) => {
      const { feature, isLoading } = action.payload;
      if (state.loading.hasOwnProperty(feature)) {
        state.loading[feature] = isLoading;
      }
    }
  }
});

export const { 
  setSelectedProject, 
  setSelectedColumn, 
  toggleTaskModal, 
  toggleProjectModal,
  setLoading
} = uiSlice.actions;
export default uiSlice.reducer; 