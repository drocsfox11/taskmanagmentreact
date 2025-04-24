import { useNavigate } from 'react-router-dom';
import { useState }   from 'react';
import '../styles/pages/LoginPage.css';

import LoginFieldIcon    from '../assets/icons/login_email_field_icon.svg';
import PasswordFieldIcon from '../assets/icons/login_password_field_icon.svg';

function LoginPage() {
    const navigate = useNavigate();
    const [email,    setEmail]    = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = () => {
        navigate('/system');
    };

    return (
        <div id="login-page-container">

            <div id="login-page-logo">
                <div id="login-page-logo-text">T</div>
            </div>

            <div id="login-page-login-form">

                <div id="login-page-login-form-email-field-title">Логин входа</div>
                <div id="login-page-login-form-email-field-container">
                    <img src={LoginFieldIcon} alt="Login" id="login-page-login-form-email-field-icon" />
                    <input
                        placeholder="example@mail.ru"
                        id="login-page-login-form-email-field-container-input"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
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
                    />
                </div>

                {/* Кнопка входа */}
                <div
                    id="login-page-login-form-submit-button"
                    onClick={handleLogin}
                    role="button"
                    tabIndex={0}
                >
                    <div id="login-page-login-form-submit-button-text">Войти</div>
                </div>

            </div>
        </div>
    );
}

export default LoginPage;
