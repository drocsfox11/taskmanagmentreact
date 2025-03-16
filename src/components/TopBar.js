
import '../styles/components/TopBar.css'
import Search from '../assets/icons/search.svg'
import Settings from '../assets/icons/settings.svg'
import Notifications from '../assets/icons/notificaitons.svg'
import ProfilePicture from '../assets/icons/profile_picture.svg'

function TopBar() {
    return (
        <div id='top-bar-container'>

            <div id='top-bar-search-container'>
                <img src={Search} id='top-bar-search-icon'/>
                <input id='top-bar-search-input' placeholder="Поиск"/>
            </div>
            <div id='top-bar-profile-container'>

                <img src={Settings} id='top-bar-profile-settings'/>
                <img src={Notifications} id='top-bar-profile-notifications'/>
                <div id='top-bar-profile-field-container'>

                    <div id='top-bar-profile-icon-container'>
                        <img src={ProfilePicture} id='top-bar-profile-icon'/>

                    </div>

                    <div id='top-bar-profile-name'>Малькова А.А.</div>

                </div>

            </div>

        </div>
    );
}

export default TopBar;
