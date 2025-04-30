import { takeLatest, put, call } from 'redux-saga/effects';
import {
  setProjects, addProject, updateProject, deleteProject,
  optimisticAddProject, optimisticUpdateProject, optimisticDeleteProject, rollbackProjects
} from './projectsSlice';
import { api } from '../../../utils/api';
import {
  fetchProjectsRequest,
  createProjectRequest,
  updateProjectRequest,
  deleteProjectRequest
} from './projectsActions';
import { setLoading } from '../ui/uiSlice';

function* fetchProjects() {
  try {
    yield put(setLoading({ feature: 'projects', isLoading: true }));
    const projects = yield call(api.get, '/api/projects/my');
    yield put(setProjects(projects));
  } catch (error) {
    // handle error (можно добавить экшен для ошибок)
  } finally {
    yield put(setLoading({ feature: 'projects', isLoading: false }));
  }
}

function* createProject(action) {
  const tempId = 'temp-' + Date.now();
  const optimisticProject = { ...action.payload, id: tempId };
  yield put(optimisticAddProject(optimisticProject));
  try {
    yield put(setLoading({ feature: 'projects', isLoading: true }));
    const newProject = yield call(api.post, '/api/projects', action.payload);
    yield put(deleteProject(tempId)); // убираем временный
    yield put(addProject(newProject));
  } catch (error) {
    yield put(rollbackProjects());
    alert('Ошибка при создании проекта: ' + (error.message || 'Неизвестная ошибка'));
  } finally {
    yield put(setLoading({ feature: 'projects', isLoading: false }));
  }
}

function* updateProjectSaga(action) {
  yield put(optimisticUpdateProject(action.payload));
  try {
    yield put(setLoading({ feature: 'projects', isLoading: true }));
    const updated = yield call(api.put, `/api/projects/${action.payload.id}`, action.payload);
    yield put(updateProject(updated));
  } catch (error) {
    yield put(rollbackProjects());
    alert('Ошибка при редактировании проекта: ' + (error.message || 'Неизвестная ошибка'));
  } finally {
    yield put(setLoading({ feature: 'projects', isLoading: false }));
  }
}

function* deleteProjectSaga(action) {
  yield put(optimisticDeleteProject(action.payload));
  try {
    yield put(setLoading({ feature: 'projects', isLoading: true }));
    yield call(api.delete, `/api/projects/${action.payload}`);
    yield put(deleteProject(action.payload));
  } catch (error) {
    yield put(rollbackProjects());
    alert('Ошибка при удалении проекта: ' + (error.message || 'Неизвестная ошибка'));
  } finally {
    yield put(setLoading({ feature: 'projects', isLoading: false }));
  }
}

export default function* projectsSaga() {
  yield takeLatest(fetchProjectsRequest.type, fetchProjects);
  yield takeLatest(createProjectRequest.type, createProject);
  yield takeLatest(updateProjectRequest.type, updateProjectSaga);
  yield takeLatest(deleteProjectRequest.type, deleteProjectSaga);
} 