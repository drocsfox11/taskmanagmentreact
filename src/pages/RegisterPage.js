import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { register, resetError, setError } from '../store/features/currentUser/currentUserSlice';
import '../styles/pages/RegisterPage.css';
import LoginFieldIcon from '../assets/icons/login_username_field_icon.svg'
import PasswordFieldIcon from '../assets/icons/login_password_field_icon.svg'

function RegisterPage() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { isLoading, error, username } = useSelector(state => state.currentUser);
    
    const [usernameInput, setUsernameInput] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    useEffect(() => {
        dispatch(resetError());
    }, [dispatch]);

    const handleRegister = (e) => {
        e.preventDefault();
        console.log('Registration attempt started');
        console.log('Username:', usernameInput);
        console.log('Password:', password);
        console.log('Confirm Password:', confirmPassword);
        
        dispatch(setError(null));

        if (!usernameInput || !password || !confirmPassword) {
            console.log('Empty fields detected:', { username: !usernameInput, password: !password, confirmPassword: !confirmPassword });
            return;
        }

        console.log('Proceeding with registration');
        dispatch(register({ username: usernameInput, password, confirmPassword }));
    };

    useEffect(() => {
        if (username) {
            navigate('/system');
        }
    }, [username, navigate]);

    return (
        <div className="register-page-container">
            <div className="register-page-logo">
                <div className="register-page-logo-text">T</div>
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
                        id="register-page-register-form-username-field"
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
                        id="register-page-register-form-confirm-password-field"
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
