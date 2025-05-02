import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { login, resetError } from '../store/features/currentUser/currentUserSlice';
import '../styles/pages/LoginPage.css';

import LoginFieldIcon from '../assets/icons/login_username_field_icon.svg';
import PasswordFieldIcon from '../assets/icons/login_password_field_icon.svg';

function LoginPage() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { isLoading, error, username } = useSelector(state => state.currentUser);
    
    const [usernameInput, setUsernameInput] = useState('');
    const [password, setPassword] = useState('');

    useEffect(() => {
        dispatch(resetError());
    }, [dispatch]);

    const handleLogin = (e) => {
        e.preventDefault();
        if (!usernameInput || !password) {
            return;
        }
        dispatch(login({ username: usernameInput, password }));
    };

    useEffect(() => {
        if (username) {
            navigate('/system');
        }
    }, [username, navigate]);

    return (
        <div className="login-page-container">
            <div className="login-page-logo">
                <div className="login-page-logo-text">T</div>
            </div>

            <div className="login-page-login-form">
                {error && (
                    <div className="login-page-error">
                        {error}
                    </div>
                )}

                <div className="login-page-login-form-username-field-title">Логин входа</div>
                <div className="login-page-login-form-username-field-container">
                    <img src={LoginFieldIcon} alt="Login" className="login-page-login-form-username-field-icon" />
                    <input
                        placeholder="username"
                        className="login-page-login-form-username-field-container-input"
                        value={usernameInput}
                        onChange={(e) => setUsernameInput(e.target.value)}
                        disabled={isLoading}
                    />
                </div>

                <div className="login-page-login-form-password-field-title">Пароль входа</div>
                <div className="login-page-login-form-password-field-container">
                    <img src={PasswordFieldIcon} alt="Password" className="login-page-login-form-password-field-icon" />
                    <input
                        type="password"
                        placeholder="password"
                        className="login-page-login-form-password-field-container-input"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                    />
                </div>

                <div
                    className="login-page-login-form-submit-button"
                    onClick={handleLogin}
                    style={{ opacity: isLoading ? 0.7 : 1, cursor: isLoading ? 'not-allowed' : 'pointer' }}
                >
                    <div className="login-page-login-form-submit-button-text">
                        {isLoading ? 'Загрузка...' : 'Войти'}
                    </div>
                </div>

                <div className="login-page-register-link" onClick={() => navigate('/register')}>
                    Нет аккаунта? Зарегистрироваться
                </div>
            </div>
        </div>
    );
}

export default LoginPage;
