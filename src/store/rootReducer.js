import { combineReducers } from '@reduxjs/toolkit';
import tasksReducer from './features/tasks/tasksSlice';


const rootReducer = combineReducers({
  tasks: tasksReducer,

});

export default rootReducer; 