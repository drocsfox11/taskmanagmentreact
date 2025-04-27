import { all } from 'redux-saga/effects';
import tasksSaga from './features/tasks/tasksSaga';
import { currentUserSaga } from './features/currentUser/currentUserSaga';
import projectsSaga from './features/projects/projectsSaga';

export default function* rootSaga() {
  yield all([
    tasksSaga(),
    currentUserSaga(),
    projectsSaga(),
  ]);
} 