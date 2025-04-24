import { combineReducers } from '@reduxjs/toolkit';
import tasksReducer from './features/tasks/tasksSlice';
import currentUserReducer from './features/currentUser/currentUserSlice';
import projectsReducer from './features/projects/projectsSlice';
import columnsReducer from './features/columns/columnsSlice';
import usersReducer from './features/users/usersSlice';
import uiReducer from './features/ui/uiSlice';

const rootReducer = combineReducers({
  tasks: tasksReducer,
  currentUser: currentUserReducer,
  projects: projectsReducer,
  columns: columnsReducer,
  users: usersReducer,
  ui: uiReducer
});

export default rootReducer; 