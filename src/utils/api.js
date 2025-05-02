import store from '../store';
import { clearCurrentUser, setError } from '../store/features/currentUser/currentUserSlice';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

const handleUnauthorized = () => {
    store.dispatch(clearCurrentUser());
    store.dispatch(setError('Сессия истекла, войдите снова'));
    window.location.href = '/login';
};

export const fetchWithAuth = async (endpoint, options = {}) => {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            credentials: 'include',
            ...options,
        });
        console.log(response);
        console.log(response.status);

        // Обрабатываем только 401 для не-auth эндпоинтов
        if (response.status === 401 && !endpoint.startsWith('/auth/')) {
            handleUnauthorized();
            throw new Error('Unauthorized');
        }

        if (!response.ok) {
            const error = new Error(`API call failed: ${response.statusText}`);
            error.status = response.status;
            throw error;
        }

        const text = await response.text();
        if (!text) return null;
        return JSON.parse(text);
    } catch (error) {
        throw error;
    }
};

export const api = {
    get: (endpoint) => fetchWithAuth(endpoint, { method: 'GET' }),
    post: (endpoint, data) => fetchWithAuth(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    }),
    put: (endpoint, data) => fetchWithAuth(endpoint, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    }),
    delete: (endpoint) => fetchWithAuth(endpoint, { method: 'DELETE' }),
    logout: () => fetchWithAuth('/auth/logout', { method: 'POST' }),
}; 