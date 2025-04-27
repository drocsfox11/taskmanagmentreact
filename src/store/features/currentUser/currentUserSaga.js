import { takeLatest, put, call } from 'redux-saga/effects';
import { setCurrentUser, updateLastLogin, setError, checkAuth, clearCurrentUser, logout as logoutAction } from './currentUserSlice';
import { api } from '../../../utils/api';

// Mock API call - replace with actual API call later
const loginApi = async (username, password) => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mock successful login
  if (username && password) {
    return {
      username,
      name: 'Test User',
      avatar: null
    };
  }
  throw new Error('Invalid credentials');
};

function* handleCheckAuth() {
    try {
        console.log('Checking auth with /me endpoint');

        const userData = yield call(api.get, '/auth/me');
        console.log('Auth check response:', userData);

        // Преобразуем avatarURL -> avatar
        const normalizedUser = {
            ...userData,
            avatar: userData.avatarURL || null,
        };
        yield put(setCurrentUser(normalizedUser));
    } catch (error) {
        console.error('Auth check FAILED:', error);

        yield put(clearCurrentUser());

        yield put(setError('Сессия истекла, войдите снова'));
    }
}


function* handleLogin(action) {
    try {
        const { username, password } = action.payload;
        const userData = yield call(api.post, '/auth/login', { username, password });
        
        // Преобразуем avatarURL -> avatar
        const normalizedUser = {
            ...userData,
            avatar: userData.avatarURL || null,
        };
        yield put(setCurrentUser(normalizedUser));
        yield put(updateLastLogin());
    } catch (error) {
        console.log('Login error:', error);
        // Reset error state and set new error
        yield put(setError(error.message === 'Unauthorized' 
            ? 'Неверный логин или пароль' 
            : 'Произошла ошибка при входе. Попробуйте позже.'));
    }
}

function* handleRegister(action) {
    try {
        const { username, password, confirmPassword } = action.payload;
        
        if (password !== confirmPassword) {
            yield put(setError('Пароли не совпадают'));
            return;
        }

        const userData = yield call(api.post, '/auth/register', { username, password });
        
        // Преобразуем avatarURL -> avatar
        const normalizedUser = {
            ...userData,
            avatar: userData.avatarURL || null,
        };
        yield put(setCurrentUser(normalizedUser));
        yield put(updateLastLogin());
    } catch (error) {
        console.log('Register error:', error);
        if (error.status === 409) {
            yield put(setError('Пользователь с таким логином уже существует'));
        } else {
            yield put(setError(error.message === 'Unauthorized' 
                ? 'Ошибка при регистрации' 
                : 'Произошла ошибка при регистрации. Попробуйте позже.'));
        }
    }
}

function* handleLogout() {
    try {
        yield call(api.logout);
    } catch (error) {
        yield put(setError('Ошибка при выходе из системы'));
    }
    yield put(clearCurrentUser());
    window.location.href = '/login';
}

export function* currentUserSaga() {
    yield takeLatest('currentUser/checkAuth', handleCheckAuth);
    yield takeLatest('currentUser/login', handleLogin);
    yield takeLatest('currentUser/register', handleRegister);
    yield takeLatest('currentUser/logout', handleLogout);
} 