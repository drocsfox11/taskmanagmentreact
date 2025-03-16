import { useState } from 'react';
import '../styles/components/LeftMenu.css';
import WorkActive from '../assets/icons/work_active.svg';
import WorkPassive from '../assets/icons/work_passive.svg';
import MessengerActive from '../assets/icons/messenger_active.svg';
import MessengerPassive from '../assets/icons/messenger_passive.svg';
import CalendarActive from '../assets/icons/calender_active.svg';
import CalendarPassive from '../assets/icons/calender_passive.svg';
import Logout from '../assets/icons/logout.svg';

function LeftMenu() {
    const [activeIcon, setActiveIcon] = useState('work');

    const handleIconClick = (icon) => {
        setActiveIcon(icon);
    };

    return (
        <div id="left-menu-container">
            <div>
                <div id="left-menu-logo">
                    <div id="left-menu-logo-text">T</div>
                </div>

                <div id="left-menu-main-icons-container">
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

            <div id="left-menu-logout">
                <img src={Logout} alt="Logout" />
            </div>
        </div>
    );
}

export default LeftMenu;