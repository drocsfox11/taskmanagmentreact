import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  byId: {},
  allIds: []
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
      state.allIds.push(project.id);
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
    }
  }
});

export const { setProjects, addProject, updateProject, deleteProject } = projectsSlice.actions;
export default projectsSlice.reducer; 