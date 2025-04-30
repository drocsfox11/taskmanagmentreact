import { all } from 'redux-saga/effects';
import tasksSaga from './features/tasks/tasksSaga';
import { currentUserSaga } from './features/currentUser/currentUserSaga';
import projectsSaga from './features/projects/projectsSaga';
import usersSaga from './features/users/usersSaga';
import boardsSaga from './features/boards/boardsSaga';
import columnsSaga from './features/columns/columnsSaga';
import { tagsSaga } from './features/tags/tagsSaga';

export default function* rootSaga() {
  yield all([
    tasksSaga(),
    currentUserSaga(),
    projectsSaga(),
    usersSaga(),
    boardsSaga(),
    columnsSaga(),
    tagsSaga()
  ]);
} 