import { all } from 'redux-saga/effects';
import tasksSaga from './features/tasks/tasksSaga';
import calendarSaga from './features/calendar/calendarSaga';

export default function* rootSaga() {
  yield all([
    tasksSaga(),
    calendarSaga(),
  ]);
} 