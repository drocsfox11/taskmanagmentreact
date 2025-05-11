import ProfileIcon from '../assets/icons/messenger_ava.svg';
import CameraIcon from '../assets/icons/video(1) 1.svg';
import PhoneIcon from '../assets/icons/phone(1) 1.svg';
import ClipIcon from '../assets/icons/clip 1.svg';
import SendIcon from '../assets/icons/send 1.svg';
import LoadingSpinner from './LoadingSpinner';
import { useGetMessagesQuery, useSendMessageMutation, useGetChatByIdQuery } from '../services/api';
import { useEffect, useRef, useState } from 'react';

function formatTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString();
}

function Chat({ chatId }) {
    const [page, setPage] = useState(0);
    const [input, setInput] = useState('');
    const [messagesEndRef, setMessagesEndRef] = useState(null);
    const {
        data: chatData,
        isLoading: isChatLoading,
        error: chatError
    } = useGetChatByIdQuery(chatId);
    const {
        data: messagesData,
        isLoading: isMessagesLoading,
        error: messagesError,
        isFetching
    } = useGetMessagesQuery({ chatId, page, size: 30 });
    const [sendMessage, { isLoading: isSending }] = useSendMessageMutation();
    const messages = messagesData?.messages || [];
    const hasNext = messagesData?.hasNext;
    const [isAtTop, setIsAtTop] = useState(false);
    const messagesContainerRef = useRef(null);

    // Scroll to bottom on new messages
    useEffect(() => {
        if (messagesContainerRef.current && page === 0) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    }, [messagesData, page]);

    // Infinity scroll: load more when at top
    const handleScroll = (e) => {
        if (e.target.scrollTop === 0 && hasNext && !isFetching) {
            setPage((prev) => prev + 1);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;
        try {
            await sendMessage({ chatId, content: input });
            setInput('');
            setPage(0); // сбрасываем пагинацию чтобы увидеть новое сообщение
        } catch (err) {}
    };

    if (isChatLoading) return <LoadingSpinner />;
    if (chatError) return <div className="chat-error">Ошибка загрузки чата</div>;

    return (
        <div id="messenger-main-part-container">
            <div id="messenger-main-part-topbar-container">
                <div id="messenger-main-part-topbar-avatar-container">
                    <div>
                        <img src={chatData?.avatarURL || ProfileIcon} id="messenger-main-part-topbar-avatar"/>
                    </div>
                    <div id="messenger-main-part-topbar-avatar-text-container">
                        <div id="messenger-main-part-topbar-avatar-text-name">{chatData?.name}</div>
                        <div id="messenger-main-part-topbar-avatar-text-status">{chatData?.isGroupChat ? 'Групповой чат' : 'Личный чат'}</div>
                    </div>
                </div>
                <div id="messenger-main-part-topbar-icons-container">
                    <img src={CameraIcon} className="TopBarIcons"/>
                    <img src={PhoneIcon} className="TopBarIcons"/>
                    <img src={ClipIcon} className="TopBarIcons"/>
                </div>
            </div>
            <div
                id="messenger-main-part-topbar-messages-container"
                ref={messagesContainerRef}
                onScroll={handleScroll}
                style={{ overflowY: 'auto', height: 'calc(100vh - 180px)', display: 'flex', flexDirection: 'column-reverse' }}
            >
                {isMessagesLoading && <LoadingSpinner />}
                {messages.length === 0 && !isMessagesLoading && <div className="chat-empty">Нет сообщений</div>}
                {messages.map((msg) => (
                    <div
                        key={msg.id}
                        className={msg.sender?.isCurrentUser ? 'outgoingMessage' : 'incomingMessage'}
                    >
                        <div className="messageAvatar">
                            <img src={msg.sender?.avatarURL || ProfileIcon} alt="avatar" />
                        </div>
                        <div className="messageContentBlock">
                            <div className="messageText">{msg.content}</div>
                            <div className="messageDate">{formatTime(msg.createdAt)}{msg.isEdited ? ' (ред.)' : ''}</div>
                        </div>
                    </div>
                ))}
                {isFetching && <div className="chat-fetching">Загрузка...</div>}
            </div>
            <form id="messenger-send-field-container" onSubmit={handleSend} autoComplete="off">
                <input
                    id="messenger-send-field"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Введите сообщение..."
                    disabled={isSending}
                />
                <div id="messenger-send-field-icons-container">
                    <img src={ClipIcon} className="messngerSendIcon"/>
                    <button type="submit" className="messngerSendIcon send-btn" disabled={isSending}>
                        <img src={SendIcon} alt="send" />
                    </button>
                </div>
            </form>
        </div>
    );
}

export default Chat;
