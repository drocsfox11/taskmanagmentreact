import '../styles/components/TopBar.css'
import Search from '../assets/icons/search.svg'
import Settings from '../assets/icons/settings.svg'
import Notifications from '../assets/icons/notificaitons.svg'
import ProfilePicture from '../assets/icons/profile_picture.svg'
import { useGetCurrentUserQuery } from '../services/api/usersApi'
import { useState } from 'react';
import UserProfileModal from './UserProfileModal';

function TopBar() {
    const { data: currentUser, isLoading } = useGetCurrentUserQuery()
    const avatar = currentUser?.avatar
    const name = currentUser?.name
    const [isProfileOpen, setIsProfileOpen] = useState(false);

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
                    <div id='top-bar-profile-icon-container' onClick={() => setIsProfileOpen(true)} style={{cursor:'pointer'}}>
                        <img src={avatar || ProfilePicture} id='top-bar-profile-icon'/>
                    </div>
                    <div id='top-bar-profile-name' onClick={() => setIsProfileOpen(true)} style={{cursor:'pointer'}}>
                        {isLoading ? "Загрузка..." : (name || "Пользователь")}
                    </div>
                </div>
            </div>
            {isProfileOpen && (
                <UserProfileModal user={currentUser} onClose={() => setIsProfileOpen(false)} />
            )}
        </div>
    );
}

export default TopBar;
