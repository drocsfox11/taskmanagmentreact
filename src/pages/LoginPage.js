import '../styles/pages/LoginPage.css';
import LoginFieldIcon from '../assets/icons/login_email_field_icon.svg'
import PasswordFieldIcon from '../assets/icons/login_password_field_icon.svg'

function LoginPage() {
    return (
        <div id='login-page-container'>

            <div id='login-page-logo'>
                <div id='login-page-logo-text'>T</div>
            </div>

            <div id='login-page-login-form'>

                <div id='login-page-login-form-email-field-title'>Логин входа</div>

                <div id='login-page-login-form-email-field-container'>

                    <img src={LoginFieldIcon} alt="LoginIcon" id='login-page-login-form-email-field-icon' />
                    <input placeholder="example@mail.ru" id='login-page-login-form-email-field-container-input'></input>

                </div>

                <div id='login-page-login-form-password-field-title'>Пароль входа</div>

                <div id='login-page-login-form-password-field-container'>

                    <img src={PasswordFieldIcon} alt="PasswordIcon" id='login-page-login-form-password-field-icon'/>
                    <input placeholder="password" id='login-page-login-form-password-field-container-input'></input>

                </div>


                <div id='login-page-login-form-submit-button'>
                    <div id='login-page-login-form-submit-button-text'>Войти</div>
                </div>

            </div>

        </div>
    );
}

export default LoginPage;
