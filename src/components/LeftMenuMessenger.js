import '../styles/components/LeftMenuMessenger.css';
import MessengerAva from '../assets/icons/messenger_ava.svg';
import Search from "../assets/icons/search.svg";
import { useGetPagedChatsQuery, useGetCurrentUserQuery } from '../services/api';
import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useCallback } from 'react';

function formatTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString();
}

function LeftMenuMessenger({ onCreateChat }) {
    const { data: chatsData, isLoading } = useGetPagedChatsQuery({ offset: 0, size: 30 });
    const navigate = useNavigate();
    const { chatId } = useParams();

    const handleNewMessage = useCallback((event) => {
        
        console.log('New message received in chat list:', event);
    }, []);

    console.log(chatsData);



    return (
        <div className="left-menu-messenger-container">
            <div className="left-menu-messenger-search-and-title-container">
                <div className="left-menu-messenger-search-and-title-title">Сообщения</div>
                <div className="top-bar-search-container" >
                    <img src={Search} className="top-bar-search-icon"/>
                    <input className="top-bar-search-input" placeholder="Поиск"/>
                </div>
            </div>
            <div className="left-menu-messenger-chats-container">
                {isLoading && <div className="messenger-chats-loading">Загрузка...</div>}
                {!isLoading && chatsData?.chats?.length === 0 && <div className="messenger-chats-empty">Нет чатов</div>}
                {chatsData?.chats?.map(chat => (
                    <div
                        key={chat.id}
                        className={`left-menu-messenger-chat-card${String(chatId) === String(chat.id) ? ' selected' : ''}${chat.unreadCount > 0 ? ' unread' : ''}`}
                        onClick={() => {
                            navigate(`/system/messenger/${chat.id}`);
                        }}>
                        <img src={chat.avatarURL || MessengerAva} className="left-menu-messenger-chat-card-image"/>
                        <div className="left-menu-messenger-chat-card-text-container">
                            <div className="left-menu-messenger-chat-card-top-row">
                                <div className="left-menu-messenger-chat-card-chat-name">{chat.name}</div>
                                {chat.unreadCount > 0 && (
                                    <div className="left-menu-messenger-chat-card-unread-badge">
                                        {chat.unreadCount}
                                    </div>
                                )}
                            </div>
                            <div className="left-menu-messenger-chat-card-chat-message-container">
                                <div className="left-menu-messenger-chat-card-chat-message">
                                    {chat.lastMessage?.content || 'Нет сообщений'}
                                </div>
                                <div className="left-menu-messenger-chat-card-chat-message-date">
                                    {formatTime(chat.lastMessage?.createdAt)}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <button
                className="messenger-create-chat-btn"
                title="Создать чат"
                onClick={onCreateChat}
            >
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="14" cy="14" r="14" fill="#4F8CFF"/>
                    <rect x="13" y="7" width="2" height="14" rx="1" fill="white"/>
                    <rect x="7" y="13" width="14" height="2" rx="1" fill="white"/>
                </svg>
            </button>
        </div>
    );
}

export default LeftMenuMessenger;