import { all } from 'redux-saga/effects';
import tasksSaga from './features/tasks/tasksSaga';
import { currentUserSaga } from './features/currentUser/currentUserSaga';


export default function* rootSaga() {
  yield all([
    tasksSaga(),
    currentUserSaga(),
  ]);
} 