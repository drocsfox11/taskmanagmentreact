import { takeLatest, put, call } from 'redux-saga/effects';
import { setCurrentUser, updateLastLogin, setError, checkAuth, clearCurrentUser } from './currentUserSlice';
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
        yield put(setCurrentUser(userData));
    } catch (error) {
        console.log('Auth check error:', error);
        yield put(clearCurrentUser());
    } finally {
        // Ensure loading state is set to false after the check
        yield put(setError(null));
    }
}

function* handleLogin(action) {
    try {
        const { username, password } = action.payload;
        const userData = yield call(api.post, '/auth/login', { username, password });
        
        yield put(setCurrentUser(userData));
        yield put(updateLastLogin());
        
        // Navigate to dashboard after successful login
        window.location.href = '/system';
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
        
        yield put(setCurrentUser(userData));
        yield put(updateLastLogin());
        
        // Navigate to dashboard after successful registration
        window.location.href = '/system';
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

export function* currentUserSaga() {
    yield takeLatest('currentUser/checkAuth', handleCheckAuth);
    yield takeLatest('currentUser/login', handleLogin);
    yield takeLatest('currentUser/register', handleRegister);
} 