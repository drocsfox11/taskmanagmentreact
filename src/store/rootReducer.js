import { combineReducers } from '@reduxjs/toolkit';
import tasksReducer from './features/tasks/tasksSlice';
import calendarReducer from './features/calendar/calendarSlice';

const rootReducer = combineReducers({
  tasks: tasksReducer,
  calendar: calendarReducer,
});

export default rootReducer; 