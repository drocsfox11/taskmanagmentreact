import '../styles/pages/RegisterPage.css';
import LoginFieldIcon from '../assets/icons/login_email_field_icon.svg'
import PasswordFieldIcon from '../assets/icons/login_password_field_icon.svg'
import {useNavigate} from "react-router-dom";

function RegisterPage() {
    const navigate = useNavigate();

    const handleRegister = () => {
        navigate('/system');
    };

    return (
        <div id='register-page-container'>

            <div id='register-page-logo'>
                <div id='register-page-logo-text'>T</div>
            </div>

            <div id='register-page-register-form'>

                <div id='register-page-register-form-email-field-title'>Логин</div>

                <div id='register-page-register-form-email-field-container'>

                    <img src={LoginFieldIcon} alt="RegisterLoginIcon"
                         id='register-page-register-form-email-field-icon'/>
                    <input placeholder="example@mail.ru"
                           id='register-page-register-form-email-field-container-input'></input>

                </div>

                <div id='register-page-register-form-password-field-title'>Пароль</div>

                <div id='register-page-register-form-password-field-container'>

                    <img src={PasswordFieldIcon} alt="PasswordIcon"
                         id='register-page-register-form-password-field-icon'/>
                    <input placeholder="password"
                           id='register-page-register-form-password-field-container-input'></input>

                </div>

                <div id='register-page-register-form-password-field-title'>Пароль еще раз</div>

                <div id='register-page-register-form-password-field-container'>

                    <img src={PasswordFieldIcon} alt="PasswordIcon"
                         id='register-page-register-form-password-field-icon'/>
                    <input placeholder="password"
                           id='register-page-register-form-password-field-container-input'></input>

                </div>


                <div id='register-page-register-form-submit-button'                     onClick={handleRegister}>
                    <div id='register-page-register-form-submit-button-text'>Зарегистрироваться</div>
                </div>

            </div>

        </div>
    );
}

export default RegisterPage;
