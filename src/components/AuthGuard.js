import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { checkAuth } from '../store/features/currentUser/currentUserSlice';

function AuthGuard({ children }) {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { isAuthenticated, isLoading } = useSelector(state => state.currentUser);

    useEffect(() => {
        console.log('Checking auth');
        dispatch(checkAuth());
    }, [dispatch]);

    useEffect(() => {
        console.log('Auth state changed:', { isAuthenticated, isLoading });
        if (!isLoading && !isAuthenticated) {
            console.log('Navigating to login');
            navigate('/login');
        }
    }, [isLoading, isAuthenticated, navigate]);

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return isAuthenticated ? children : null;
}

export default AuthGuard; 