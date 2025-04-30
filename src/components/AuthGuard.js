import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { checkAuth } from '../store/features/currentUser/currentUserSlice';

function AuthGuard({ children }) {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { isAuthenticated, isLoading, username } = useSelector(state => state.currentUser);

    useEffect(() => {
        console.log('Проверка авторизации');
        

        if (username) {
            console.log('Сессия восстановлена из localStorage, проверяем актуальность');
        } else {
            console.log('Сессия не найдена, проверяем через API');
        }
        
        dispatch(checkAuth());
    }, [dispatch, username]);

    useEffect(() => {
        console.log('Состояние авторизации изменилось:', { isAuthenticated, isLoading });
        
        if (!isLoading && !isAuthenticated) {
            console.log('Перенаправление на страницу входа');
            navigate('/login');
        }
    }, [isLoading, isAuthenticated, navigate]);

    if (isLoading) {
        return <div>Загрузка...</div>;
    }

    return isAuthenticated ? children : null;
}

export default AuthGuard; 