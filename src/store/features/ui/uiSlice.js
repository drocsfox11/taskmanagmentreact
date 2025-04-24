import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  selectedProject: null,
  selectedColumn: null,
  isTaskModalOpen: false,
  isProjectModalOpen: false
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
    }
  }
});

export const { setSelectedProject, setSelectedColumn, toggleTaskModal, toggleProjectModal } = uiSlice.actions;
export default uiSlice.reducer; 