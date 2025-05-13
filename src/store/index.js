import { configureStore } from '@reduxjs/toolkit';
import { apiReducer, apiMiddleware } from '../services/api';

const store = configureStore({
  reducer: {
    ...apiReducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiMiddleware)
});

export default store; 