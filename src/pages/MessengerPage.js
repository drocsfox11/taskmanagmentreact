import '../styles/pages/MessengerPage.css';
import LeftMenu from "../components/LeftMenu";
import LeftMenuMessenger from "../components/LeftMenuMessenger";
import ClipIcon from '../assets/icons/clip 1.svg'
import CameraIcon from '../assets/icons/video(1) 1.svg'
import PhoneIcon from '../assets/icons/phone(1) 1.svg'
import ProfileIcon from '../assets/icons/messenger_ava.svg'
import SendIcon from '../assets/icons/send 1.svg'
import { useSelector } from 'react-redux';
import LoadingSpinner from "../components/LoadingSpinner";

function MessengerPage() {
    // const isLoading = useSelector(state => state.ui.loading.messages || false);
    const isLoading = false;

    return (
        <div id="messenger-page-container">
            <LeftMenuMessenger></LeftMenuMessenger>

            <div id="messenger-main-part-container">
                <div id="messenger-main-part-topbar-container">
                    <div id="messenger-main-part-topbar-avatar-container">
                        <div>
                            <img src={ProfileIcon} id="messenger-main-part-topbar-avatar"/>
                        </div>

                        <div id="messenger-main-part-topbar-avatar-text-container">
                            <div id="messenger-main-part-topbar-avatar-text-name">FXRGXTTXN</div>
                            <div id="messenger-main-part-topbar-avatar-text-status">был недавно</div>
                        </div>
                    </div>

                    <div id="messenger-main-part-topbar-icons-container">
                        <img src={CameraIcon} className="TopBarIcons"/>
                        <img src={PhoneIcon} className="TopBarIcons"/>
                        <img src={ClipIcon} className="TopBarIcons"/>
                    </div>
                </div>

                <div id="messenger-main-part-topbar-messages-container">
                    {isLoading && <LoadingSpinner />}

                    <div className="incomingMessage">
                        <div className="messageText">Невероятно длинный длинный длинный длинный длинный длинный длинный
                            длинный длинный длинный длинный длинный длинный длинныйдлинный длинный длинный длинный
                            длинный длинный длинныйдлинный длинный длинный длинный длинный длинный длинныйдлинный
                            длинный длинны ответ
                        </div>
                        <div className="messageDate">25.05.2024</div>
                    </div>

                    <div className="outgoingMessage">
                        <div className="messageText">Невероятно длинный длинный длинный длинный длинный длинный длинный
                            длинный длинный длинный длинный длинный длинный длинныйдлинный длинный длинный длинный
                            длинный длинный длинныйдлинный длинный длинный длинный длинный длинный длинныйдлинный
                            длинный длинны ответ
                        </div>
                        <div className="messageDate">25.05.2024</div>
                    </div>

                    <div className="incomingMessage">
                        <div className="messageText">Невероятно длинный длинный длинный длинный длинный длинный длинный
                            длинный длинный длинный длинный длинный длинный длинныйдлинный длинный длинный длинный
                            длинный длинный длинныйдлинный длинный длинный длинный длинный длинный длинныйдлинный
                            длинный длинны ответ
                        </div>
                        <div className="messageDate">25.05.2024</div>
                    </div>

                    <div className="outgoingMessage">
                        <div className="messageText">Невероятно длинный длинный длинный длинный длинный длинный длинный
                            длинный длинный длинный длинный длинный длинный длинныйдлинный длинный длинный длинный
                            длинный длинный длинныйдлинный длинный длинный длинный длинный длинный длинныйдлинный
                            длинный длинны ответ
                        </div>
                        <div className="messageDate">25.05.2024</div>
                    </div>

                    <div className="incomingMessage">
                        <div className="messageText">Невероятно длинный длинный длинный длинный длинный длинный длинный
                            длинный длинный длинный длинный длинный длинный длинныйдлинный длинный длинный длинный
                            длинный длинный длинныйдлинный длинный длинный длинный длинный длинный длинныйдлинный
                            длинный длинны ответ
                        </div>
                        <div className="messageDate">25.05.2024</div>
                    </div>

                    <div className="outgoingMessage">
                        <div className="messageText">Невероятно длинный длинный длинный длинный длинный длинный длинный
                            длинный длинный длинный длинный длинный длинный длинныйдлинный длинный длинный длинный
                            длинный длинный длинныйдлинный длинный длинный длинный длинный длинный длинныйдлинный
                            длинный длинны ответ
                        </div>
                        <div className="messageDate">25.05.2024</div>
                    </div>

                    <div className="incomingMessage">
                        <div className="messageText">Невероятно длинный длинный длинный длинный длинный длинный длинный
                            длинный длинный длинный длинный длинный длинный длинныйдлинный длинный длинный длинный
                            длинный длинный длинныйдлинный длинный длинный длинный длинный длинный длинныйдлинный
                            длинный длинны ответ
                        </div>
                        <div className="messageDate">25.05.2024</div>
                    </div>

                    <div className="outgoingMessage">
                        <div className="messageText">Невероятно длинный длинный длинный длинный длинный длинный длинный
                            длинный длинный длинный длинный длинный длинный длинныйдлинный длинный длинный длинный
                            длинный длинный длинныйдлинный длинный длинный длинный длинный длинный длинныйдлинный
                            длинный длинны ответ
                        </div>
                        <div className="messageDate">25.05.2024</div>
                    </div>
                </div>

                <div id="messenger-send-field-container">
                    <input id="messenger-send-field"/>
                    <div id="messenger-send-field-icons-container">
                        <img src={ClipIcon} className="messngerSendIcon"/>
                        <img src={SendIcon} className="messngerSendIcon"/>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default MessengerPage;