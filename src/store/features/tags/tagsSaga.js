import { takeLatest, put, call } from 'redux-saga/effects';
import { api } from '../../../utils/api';
import {
    FETCH_TAGS_REQUEST,
    FETCH_BOARD_TAGS_REQUEST,
    fetchTagsSuccess,
    fetchTagsFailure,
    fetchBoardTagsSuccess,
    fetchBoardTagsFailure
} from './tagsActions';

function* fetchTagsSaga() {
    try {
        const response = yield call(api.get, '/api/tags');
        yield put(fetchTagsSuccess(response));
    } catch (error) {
        yield put(fetchTagsFailure(error.message));
    }
}

function* fetchBoardTagsSaga(action) {
    try {
        console.log('Fetching tags for board ID:', action.payload);
        const response = yield call(api.get, `/api/tags/board/${action.payload}`);
        yield put(fetchBoardTagsSuccess(response));
    } catch (error) {
        console.error('Error fetching board tags:', error);
        yield put(fetchBoardTagsFailure(error.message));
    }
}

export function* tagsSaga() {
    yield takeLatest(FETCH_TAGS_REQUEST, fetchTagsSaga);
    yield takeLatest(FETCH_BOARD_TAGS_REQUEST, fetchBoardTagsSaga);
} 