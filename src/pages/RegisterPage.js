import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useRegisterMutation } from '../services/api';
import '../styles/pages/RegisterPage.css';
import LoginFieldIcon from '../assets/icons/login_username_field_icon.svg'
import PasswordFieldIcon from '../assets/icons/login_password_field_icon.svg'

function RegisterPage() {
    const navigate = useNavigate();
    const [register, { isLoading, error, isSuccess }] = useRegisterMutation();
    
    const [usernameInput, setUsernameInput] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [localError, setLocalError] = useState(null);

    let errorMessage = error?.data;

    const handleRegister = async (e) => {
        e.preventDefault();
        setLocalError(null);

        if (!usernameInput || !password || !confirmPassword) {
            return;
        }

        if (password !== confirmPassword) {
            setLocalError('Пароли не совпадают');
            return;
        }
        
        try {
            const result = await register({ username: usernameInput, password }).unwrap();
            
            if (result) {
                navigate('/system');
            }
        } catch (err) {
            console.error('Registration failed:', err);
        }
    };

    useEffect(() => {
        if (isSuccess) {
            navigate('/system');
        }
    }, [isSuccess, navigate]);

    return (
        <div className="register-page-container">
            <div className="register-page-logo">
                <div className="register-page-logo-text">T</div>
            </div>

            <div className='register-page-register-form'>
                {(errorMessage || localError) && (
                    <div className='register-page-error'>
                        {errorMessage || localError}
                    </div>
                )}

                <div className='register-page-register-form-username-field-title'>Логин</div>

                <div className='register-page-register-form-username-field-container'>

                    <img src={LoginFieldIcon} alt="RegisterLoginIcon"
                         className='register-page-register-form-username-field-icon'/>
                    <input 
                        type="text"
                        placeholder="username"
                        className="register-page-register-form-username-field-container-input"
                        value={usernameInput}
                        onChange={(e) => setUsernameInput(e.target.value)}
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
                        placeholder="confirm password"
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
