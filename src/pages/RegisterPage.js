import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { register } from '../store/features/currentUser/currentUserSlice';
import '../styles/pages/RegisterPage.css';
import LoginFieldIcon from '../assets/icons/login_username_field_icon.svg'
import PasswordFieldIcon from '../assets/icons/login_password_field_icon.svg'
import {setError } from '../store/features/currentUser/currentUserSlice';

function RegisterPage() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { isLoading, error } = useSelector(state => state.currentUser);
    
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleRegister = (e) => {
        e.preventDefault();
        console.log('Registration attempt started');
        console.log('Username:', username);
        console.log('Password:', password);
        console.log('Confirm Password:', confirmPassword);
        
        dispatch(setError(null));

        if (!username || !password || !confirmPassword) {
            console.log('Empty fields detected:', { username: !username, password: !password, confirmPassword: !confirmPassword });
            return;
        }

        console.log('Proceeding with registration');
        dispatch(register({ username, password, confirmPassword }));
    };

    return (
        <div className='register-page-container'>

            <div className='register-page-logo'>
                <div className='register-page-logo-text'>T</div>
            </div>

            <div className='register-page-register-form'>
                {error && (
                    <div className='register-page-error'>
                        {error}
                    </div>
                )}

                <div className='register-page-register-form-username-field-title'>Логин</div>

                <div className='register-page-register-form-username-field-container'>

                    <img src={LoginFieldIcon} alt="RegisterLoginIcon"
                         className='register-page-register-form-username-field-icon'/>
                    <input 
                        type="text"
                        placeholder="username"
                        className='register-page-register-form-username-field-container-input'
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        disabled={isLoading}
                    />

                </div>

                <div className='register-page-register-form-password-field-title'>Пароль</div>

                <div className='register-page-register-form-password-field-container'>

                    <img src={PasswordFieldIcon} alt="PasswordIcon"
                         className='register-page-register-form-password-field-icon'/>
                    <input 
                        type="password"
                        placeholder="password"
                        className='register-page-register-form-password-field-container-input'
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                    />

                </div>

                <div className='register-page-register-form-password-field-title'>Пароль еще раз</div>

                <div className='register-page-register-form-password-field-container'>

                    <img src={PasswordFieldIcon} alt="PasswordIcon"
                         className='register-page-register-form-password-field-icon'/>
                    <input 
                        type="password"
                        placeholder="password"
                        className='register-page-register-form-password-field-container-input'
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={isLoading}
                    />
                </div>


                <div 
                    className='register-page-register-form-submit-button' 
                    onClick={handleRegister}
                    style={{ opacity: isLoading ? 0.7 : 1, cursor: isLoading ? 'not-allowed' : 'pointer' }}
                >
                    <div className='register-page-register-form-submit-button-text'>
                        {isLoading ? 'Загрузка...' : 'Зарегистрироваться'}
                    </div>
                </div>

                <div className="register-page-login-link" onClick={() => navigate('/login')}>
                    Уже есть аккаунт? Войти
                </div>

            </div>

        </div>
    );
}

export default RegisterPage;
