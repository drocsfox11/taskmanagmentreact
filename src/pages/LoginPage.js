import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { login } from '../store/features/currentUser/currentUserSlice';
import '../styles/pages/LoginPage.css';

import LoginFieldIcon from '../assets/icons/login_username_field_icon.svg';
import PasswordFieldIcon from '../assets/icons/login_password_field_icon.svg';

function LoginPage() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { isLoading, error, isAuthenticated } = useSelector(state => state.currentUser);
    
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = (e) => {
        e.preventDefault();
        if (!username || !password) {
            return;
        }
        dispatch(login({ username, password }));
    };

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/system');
        }
    }, [isAuthenticated, navigate]);

    return (
        <div id="login-page-container">
            <div id="login-page-logo">
                <div id="login-page-logo-text">T</div>
            </div>

            <div id="login-page-login-form">
                {error && (
                    <div id="login-page-error">
                        {error}
                    </div>
                )}

                <div id="login-page-login-form-username-field-title">Логин входа</div>
                <div id="login-page-login-form-username-field-container">
                    <img src={LoginFieldIcon} alt="Login" id="login-page-login-form-username-field-icon" />
                    <input
                        placeholder="username"
                        id="login-page-login-form-username-field-container-input"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        disabled={isLoading}
                    />
                </div>

                <div id="login-page-login-form-password-field-title">Пароль входа</div>
                <div id="login-page-login-form-password-field-container">
                    <img src={PasswordFieldIcon} alt="Password" id="login-page-login-form-password-field-icon" />
                    <input
                        type="password"
                        placeholder="password"
                        id="login-page-login-form-password-field-container-input"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                    />
                </div>

                <div
                    id="login-page-login-form-submit-button"
                    onClick={handleLogin}
                    role="button"
                    tabIndex={0}
                    style={{ opacity: isLoading ? 0.7 : 1, cursor: isLoading ? 'not-allowed' : 'pointer' }}
                >
                    <div id="login-page-login-form-submit-button-text">
                        {isLoading ? 'Загрузка...' : 'Войти'}
                    </div>
                </div>

                <div id="login-page-register-link" onClick={() => navigate('/register')}>
                    Нет аккаунта? Зарегистрироваться
                </div>
            </div>
        </div>
    );
}

export default LoginPage;
