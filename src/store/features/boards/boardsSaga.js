import { takeLatest, put, call } from 'redux-saga/effects';
import { setBoards, addBoard, updateBoard, deleteBoard } from './boardsSlice';
import { api } from '../../../utils/api';
import {
  fetchBoardsByProjectRequest,
  createBoardRequest,
  updateBoardRequest,
  updateBoardFailure,
  deleteBoardRequest
} from './boardsActions';
import { setLoading } from '../ui/uiSlice';

function* fetchBoardsByProject(action) {
  try {
    yield put(setLoading({ feature: 'boards', isLoading: true }));
    const boards = yield call(api.get, `/api/boards/project/${action.payload}`);
    yield put(setBoards(boards));
  } catch (error) {
    // handle error
  } finally {
    yield put(setLoading({ feature: 'boards', isLoading: false }));
  }
}

function* createBoard(action) {
  try {
    yield put(setLoading({ feature: 'boards', isLoading: true }));
    const newBoard = yield call(api.post, '/api/boards', action.payload);
    yield put(addBoard(newBoard));
  } catch (error) {
    // handle error
  } finally {
    yield put(setLoading({ feature: 'boards', isLoading: false }));
  }
}

function* updateBoardSaga(action) {
  try {
    yield put(setLoading({ feature: 'boards', isLoading: true }));
    
    // Преобразуем числовые значения в строки для совместимости с бэкендом
    const board = {
      ...action.payload,
      id: String(action.payload.id),
      projectId: action.payload.projectId ? String(action.payload.projectId) : undefined,
      position: action.payload.position ? String(action.payload.position) : undefined
    };
    
    const updatedBoard = yield call(api.put, `/api/boards/${action.payload.id}`, board);
    yield put(updateBoard(updatedBoard));
  } catch (error) {
    yield put(updateBoardFailure(error.toString()));
  } finally {
    yield put(setLoading({ feature: 'boards', isLoading: false }));
  }
}

function* deleteBoardSaga(action) {
  try {
    yield put(setLoading({ feature: 'boards', isLoading: true }));
    yield call(api.delete, `/api/boards/${action.payload}`);
    yield put(deleteBoard(action.payload));
  } catch (error) {
    // handle error
  } finally {
    yield put(setLoading({ feature: 'boards', isLoading: false }));
  }
}

export default function* boardsSaga() {
  yield takeLatest(fetchBoardsByProjectRequest.type, fetchBoardsByProject);
  yield takeLatest(createBoardRequest.type, createBoard);
  yield takeLatest(updateBoardRequest.type, updateBoardSaga);
  yield takeLatest(deleteBoardRequest.type, deleteBoardSaga);
} 