import { useState, useEffect } from 'react';
import '../styles/components/LeftMenu.css';
import WorkActive from '../assets/icons/work_active.svg';
import WorkPassive from '../assets/icons/work_passive.svg';
import MessengerActive from '../assets/icons/messenger_active.svg';
import MessengerPassive from '../assets/icons/messenger_passive.svg';
import CalendarActive from '../assets/icons/calender_active.svg';
import CalendarPassive from '../assets/icons/calender_passive.svg';
import Logout from '../assets/icons/logout.svg';
import {useNavigate, useLocation} from "react-router-dom";
import { useLogoutMutation } from '../services/api';

function LeftMenu() {
    const [activeIcon, setActiveIcon] = useState('work');
    const navigate = useNavigate();
    const location = useLocation();
    const [logout, { isLoading, error, isSuccess }] = useLogoutMutation();

    const routeMap = {
        work:       '/system/project',
        messenger:  '/system/messenger/',
        calendar:   '/system/calendar'
    };

    useEffect(() => {
        if (location.pathname.startsWith('/system/calendar')) {
            setActiveIcon('calendar');
        } else if (location.pathname.startsWith('/system/messenger')) {
            setActiveIcon('messenger');
        } else {
            setActiveIcon('work');
        }
    }, [location.pathname]);

    const handleIconClick = (icon) => {
        setActiveIcon(icon);
        navigate(routeMap[icon], { replace: true });
    };

    const handleLogout = async () => {
        await logout();
    };

    useEffect(() => {
        if (isSuccess) {
            navigate('/login');
        }
    }, [isSuccess, navigate]);

    return (
        <div className="left-menu-container">
            <div>
                <div className="left-menu-logo">
                    <div className="left-menu-logo-text">T</div>
                </div>

                <div className="left-menu-main-icons-container">
                    <img
                        src={activeIcon === 'work' ? WorkActive : WorkPassive}
                        onClick={() => handleIconClick('work')}
                        alt="Work"
                    />
                    <img
                        src={activeIcon === 'messenger' ? MessengerActive : MessengerPassive}
                        onClick={() => handleIconClick('messenger')}
                        alt="Messenger"
                    />
                    <img
                        src={activeIcon === 'calendar' ? CalendarActive : CalendarPassive}
                        onClick={() => handleIconClick('calendar')}
                        alt="Calendar"
                    />
                </div>
            </div>

            <div className="left-menu-logout">
                <img src={Logout} alt="Logout" onClick={handleLogout} style={{ cursor: 'pointer' }} />
            </div>
        </div>
    );
}

export default LeftMenu;