import { configureStore } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import rootReducer from './rootReducer';
import rootSaga from './rootSaga';

const sagaMiddleware = createSagaMiddleware();

// Navigation middleware
const navigationMiddleware = () => (next) => (action) => {
    if (action.type === 'currentUser/navigateTo') {
        window.location.href = action.payload;
        return;
    }
    return next(action);
};

const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(sagaMiddleware)
      .concat(navigationMiddleware)
});

sagaMiddleware.run(rootSaga);

export default store; 