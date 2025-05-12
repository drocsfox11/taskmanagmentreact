import { call, put, takeEvery } from 'redux-saga/effects';
import { fetchUserStart, fetchUserSuccess, fetchUserFailure } from './usersSlice';

function* fetchUser(action) {
  const username = action.payload;
  
  if (!username) {
    console.error('Попытка загрузить пользователя без указания имени');
    return;
  }
  
  try {
    yield put(fetchUserStart(username));
    
    // Здесь должен быть запрос к API для получения данных пользователя
    // Пока используем заглушку
    const userData = {
      username,
      displayName: username,
      avatarURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
    };
    
    yield put(fetchUserSuccess({ username, userData }));
  } catch (error) {
    console.error('Ошибка при загрузке данных пользователя:', error);
    yield put(fetchUserFailure({ username, error: error.message }));
  }
}

export function* usersSaga() {
  yield takeEvery('users/fetchUser', fetchUser);
} 