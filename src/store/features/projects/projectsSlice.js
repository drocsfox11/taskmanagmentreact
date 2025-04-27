import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  byId: {},
  allIds: [],
  lastBackup: null, // для rollback
};

const projectsSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    setProjects: (state, action) => {
      const projects = action.payload;
      state.byId = projects.reduce((acc, project) => {
        acc[project.id] = project;
        return acc;
      }, {});
      state.allIds = projects.map(project => project.id);
    },
    addProject: (state, action) => {
      const project = action.payload;
      state.byId[project.id] = project;
      if (!state.allIds.includes(project.id)) {
        state.allIds.push(project.id);
      }
    },
    updateProject: (state, action) => {
      const { id, ...updates } = action.payload;
      if (state.byId[id]) {
        state.byId[id] = { ...state.byId[id], ...updates };
      }
    },
    deleteProject: (state, action) => {
      const id = action.payload;
      delete state.byId[id];
      state.allIds = state.allIds.filter(projectId => projectId !== id);
    },
    // optimistic
    optimisticAddProject: (state, action) => {
      state.lastBackup = { ...state };
      const project = action.payload;
      state.byId[project.id] = project;
      state.allIds.push(project.id);
    },
    optimisticUpdateProject: (state, action) => {
      state.lastBackup = { ...state };
      const { id, ...updates } = action.payload;
      if (state.byId[id]) {
        state.byId[id] = { ...state.byId[id], ...updates };
      }
    },
    optimisticDeleteProject: (state, action) => {
      state.lastBackup = { ...state };
      const id = action.payload;
      delete state.byId[id];
      state.allIds = state.allIds.filter(projectId => projectId !== id);
    },
    rollbackProjects: (state) => {
      if (state.lastBackup) {
        return state.lastBackup;
      }
    },
  }
});

export const {
  setProjects, addProject, updateProject, deleteProject,
  optimisticAddProject, optimisticUpdateProject, optimisticDeleteProject, rollbackProjects
} = projectsSlice.actions;
export default projectsSlice.reducer; 