import { configureStore } from '@reduxjs/toolkit';
import { apiReducer, apiMiddleware } from '../services/api';
import usersReducer from './features/users/usersSlice';

const store = configureStore({
  reducer: {
    ...apiReducer,
    users: usersReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiMiddleware)
});

export default store; 