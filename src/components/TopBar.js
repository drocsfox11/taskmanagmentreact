import '../styles/components/TopBar.css'
import Settings from '../assets/icons/settings.svg'
import Notifications from '../assets/icons/notificaitons.svg'
import { useGetCurrentUserQuery } from '../services/api/usersApi'
import { useState } from 'react';
import UserProfileModal from './UserProfileModal';

function TopBar() {
    const { data: currentUser, isLoading } = useGetCurrentUserQuery()
    const avatar = currentUser?.avatarURL
    const name = currentUser?.name
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    return (
        <div className='top-bar-container'>
            <div className='top-bar-profile-container'>
                <img src={Settings} className='top-bar-profile-settings'/>
                <img src={Notifications} className='top-bar-profile-notifications'/>
                <div className='top-bar-profile-field-container'>
                    <div className='top-bar-profile-icon-container' onClick={() => setIsProfileOpen(true)} style={{cursor:'pointer'}}>
                        <img src={avatar} className='top-bar-profile-icon'/>
                    </div>
                    <div className='top-bar-profile-name' onClick={() => setIsProfileOpen(true)} style={{cursor:'pointer'}}>
                        {isLoading ? "Загрузка..." : (name)}
                    </div>
                </div>
            </div>
            {isProfileOpen && (
                <UserProfileModal onClose={() => setIsProfileOpen(false)} />
            )}
        </div>
    );
}

export default TopBar;
