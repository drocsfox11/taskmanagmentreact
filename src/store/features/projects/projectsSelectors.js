export const selectProjects = state =>
  Array.isArray(state.projects.allIds)
    ? state.projects.allIds.map(id => state.projects.byId[id]).filter(Boolean)
    : []; 