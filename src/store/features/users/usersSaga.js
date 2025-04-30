import { takeEvery, call, put } from 'redux-saga/effects';
import { setUser } from './usersSlice';
import { api } from '../../../utils/api';

function* fetchUserSaga(action) {
  const username = action.payload;
  
  // Проверка на корректность имени пользователя
  if (!username || typeof username !== 'string') {
    console.error('Ошибка: неверный формат имени пользователя', username);
    return;
  }
  
  try {
    console.log(`Запрос данных пользователя: ${username}`);
    const user = yield call(api.get, `/auth/users/${username}`);
    if (user) {
      yield put(setUser(user));
    }
  } catch (e) {
    console.error(`Ошибка при загрузке данных пользователя ${username}:`, e);
  }
}

export default function* usersSaga() {
  yield takeEvery('users/fetchUser', fetchUserSaga);
} 