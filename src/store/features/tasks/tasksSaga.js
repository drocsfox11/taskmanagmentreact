import { takeLatest, put, call } from 'redux-saga/effects';
import {
  fetchTasksRequest,
  fetchTasksSuccess,
  fetchTasksFailure,
} from './tasksSlice';
import { fetchWithAuth } from '../../../utils/api';


const fetchTasksApi = () => fetchWithAuth('/api/tasks');

function* fetchTasks() {
  try {
    const tasks = yield call(fetchTasksApi);
    yield put(fetchTasksSuccess(tasks));
  } catch (error) {
    yield put(fetchTasksFailure(error.message));
  }
}

export default function* tasksSaga() {
  yield takeLatest(fetchTasksRequest.type, fetchTasks);
} 