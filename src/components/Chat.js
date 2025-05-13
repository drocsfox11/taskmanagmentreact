import ProfileIcon from '../assets/icons/messenger_ava.svg';
import CameraIcon from '../assets/icons/video(1) 1.svg';
import PhoneIcon from '../assets/icons/phone(1) 1.svg';
import ClipIcon from '../assets/icons/clip 1.svg';
import SendIcon from '../assets/icons/send 1.svg';
import LoadingSpinner from './LoadingSpinner';
import {
    useGetMessagesQuery,
    useSendMessageMutation,
    useSendMessageWithAttachmentsMutation,
    useGetChatDetailsQuery,
    useGetCurrentUserQuery
} from '../services/api';
import React, { useEffect, useRef, useState } from 'react';
import '../styles/components/Chat.css';
import { v4 as uuidv4 } from 'uuid';

function formatTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString();
}

function getFileIcon(fileType) {
    if (!fileType) return '📄';
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.startsWith('video/')) return '🎬';
    if (fileType.startsWith('audio/')) return '🎵';
    if (fileType.includes('pdf')) return '📕';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('excel') || fileType.includes('sheet')) return '📊';
    if (fileType.includes('powerpoint') || fileType.includes('presentation')) return '📊';
    if (fileType.includes('zip') || fileType.includes('archive')) return '📦';
    return '📄';
}

function formatFileSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function Chat({ chatId }) {
    const [offset, setOffset] = useState(0);
    const [input, setInput] = useState('');
    const [files, setFiles] = useState([]);
    const [showParticipants, setShowParticipants] = useState(false);
    const fileInputRef = useRef(null);
    
    const {
        data: chatData,
        isLoading: isChatLoading,
        error: chatError
    } = useGetChatDetailsQuery(chatId);
    
    const {
        data: messagesData,
        isLoading: isMessagesLoading,
        error: messagesError,
        isFetching
    } = useGetMessagesQuery({ 
        chatId, 
        offset, 
        size: 30
    });

    const [sendMessage, { isLoading: isSendingText }] = useSendMessageMutation();
    const [sendMessageWithAttachments, { isLoading: isSendingWithAttachments }] = useSendMessageWithAttachmentsMutation();
    // const [markAsRead] = useMarkAsReadMutation();
    
    const isSending = isSendingText || isSendingWithAttachments;
    const { data: currentUser } = useGetCurrentUserQuery();

    const messages = (messagesData?.messages || []).toReversed();
    const hasNext = messagesData?.hasNext;
    const messagesContainerRef = useRef(null);

    const getParticipantById = (id) => {
        return chatData?.participants.find((p) => p.id === id);
    }

    const handleFileSelect = async (e) => {
        const selectedFiles = Array.from(e.target.files);
        setFiles(prev => [...prev, ...selectedFiles]);
        
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleRemoveFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    useEffect(() => {
        if (messagesContainerRef.current && offset === 0 && messages.length > 0) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    }, [messagesData, offset]);

    // Auto-scroll to bottom and mark messages as read when new messages arrive
    useEffect(() => {
        if (messages.length > 0 && messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
            
            // Mark unread messages as read
            const unreadMessages = messages.filter(msg => 
                msg.senderId !== currentUser?.id && !msg.isReaded
            );
            
            // if (unreadMessages.length > 0) {
            //     unreadMessages.forEach(msg => {
            //         markAsRead({ chatId, messageId: msg.id }).catch(console.error);
            //     });
            // }
        }
    }, [messages, currentUser, chatId]);

    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        
        if (scrollTop < 100 && hasNext && !isFetching) {
            setOffset(offset + messages.length);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() && files.length === 0) return;
        
        const tempId = uuidv4();
        try {
            if (files.length > 0) {
                await sendMessageWithAttachments({
                    chatId,
                    content: input.trim(),
                    tempId,
                    files
                });
            } else {
                await sendMessage({
                    chatId,
                    content: input.trim(),
                    tempId
                });
            }
            
            setInput('');
            setFiles([]);
        } catch (err) {
            console.error('Failed to send message:', err);
        }
    };

    const chatName = chatData?.isGroupChat
        ? chatData.name 
        : chatData?.participants.find(p => p.id !== currentUser.id)?.name || 'Чат';

    const chatAvatar = chatData?.isGroupChat
        ? chatData.avatarURL
        : chatData?.participants.find(p => p.id !== currentUser.id)?.avatarURL;

    if (isChatLoading) return <LoadingSpinner />;
    if (chatError) return <div className="chat-error">Ошибка загрузки чата</div>;

    return (
        <div className="chat-container">
            <div className="chat-header">
                <div className="chat-header-user">
                    <div className="chat-header-avatar">
                        <img 
                            src={chatAvatar || ProfileIcon} 
                            alt="avatar" 
                            className="chat-avatar"
                            onClick={() => setShowParticipants(!showParticipants)}
                        />
                    </div>
                    <div className="chat-header-info">
                        <div className="chat-header-name">{chatName}</div>
                        {chatData?.isGroupChat &&
                            (<div className="chat-header-status">
                                {chatData.participants.length} участников
                        </div>)}
                    </div>
                </div>
                <div className="chat-header-actions">
                    <img src={CameraIcon} alt="video" className="chat-header-icon"/>
                    <img src={PhoneIcon} alt="call" className="chat-header-icon"/>
                </div>
            </div>
            
            {showParticipants && (
                <div className="chat-participants">
                    <div className="chat-participants-header">
                        <h3>Участники чата</h3>
                        <button 
                            className="chat-participants-close"
                            onClick={() => setShowParticipants(false)}
                        >
                            ×
                        </button>
                    </div>
                    <div className="chat-participants-list">
                        {chatData?.participants.map(participant => (
                            <div key={participant.id} className="chat-participant">
                                <img 
                                    src={participant.avatarURL} 
                                    alt="avatar" 
                                    className="chat-participant-avatar"
                                />
                                <div className="chat-participant-info">
                                    <div className="chat-participant-name">{participant.name}</div>
                                    <div className="chat-participant-role">{participant.role}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            <div
                className="chat-messages"
                ref={messagesContainerRef}
                onScroll={handleScroll}
            >
                {isMessagesLoading && messages.length === 0 && <LoadingSpinner />}
                {messages.length === 0 && !isMessagesLoading && (
                    <div className="chat-empty">Нет сообщений</div>
                )}
                
                {isFetching && offset > 0 && (
                    <div className="chat-loading-more">Загрузка предыдущих сообщений...</div>
                )}
                
                {messages.map((msg, index) => {
                    const isCurrentUser = msg.senderId === currentUser.id;
                    const sender = getParticipantById(msg.senderId);


                    return (
                        <div
                            key={msg.id}
                            className={`chat-message ${isCurrentUser ? 'outgoing' : 'incoming'} ${msg.isLocal ? 'local' : ''}`}
                        >
                            {!isCurrentUser && (
                                <div className="chat-message-avatar">
                                    <img src={sender?.avatarURL} alt="avatar" />
                                </div>
                            )}
                            <div className="chat-message-content">
                                {!isCurrentUser && (
                                    <div className="chat-message-sender">{sender?.name}</div>
                                )}
                                
                                {msg.content && (
                                    <div className="chat-message-text">{msg.content}</div>
                                )}
                                
                                {msg.attachments && msg.attachments.length > 0 && (
                                    <div className="chat-message-attachments">
                                        {msg.attachments.map(attachment => (
                                            <a 
                                                key={attachment.id} 
                                                href={attachment.isLocal ? '#' : `${process.env.REACT_APP_API_BASE_URL}${attachment.downloadUrl}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="chat-attachment"
                                                download={attachment.originalFileName}
                                            >
                                                <div className="chat-attachment-icon">
                                                    {getFileIcon(attachment.fileType)}
                                                </div>
                                                <div className="chat-attachment-info">
                                                    <div className="chat-attachment-name">
                                                        {attachment.originalFileName}
                                                    </div>
                                                    <div className="chat-attachment-size">
                                                        {formatFileSize(attachment.fileSize)}
                                                    </div>
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                )}
                                
                                <div className="chat-message-meta">
                                    <span className="chat-message-time">
                                        {formatTime(msg.createdAt)}
                                    </span>
                                    {msg.isEdited && (
                                        <span className="chat-message-edited"> (ред.)</span>
                                    )}
                                    {isCurrentUser && (
                                        <span className="chat-message-status">
                                            {msg.isReaded ? '✓✓' : '✓'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            {files.length > 0 && (
                <div className="chat-attachments-preview">
                    {files.map((file, index) => (
                        <div key={index} className="chat-attachment-preview">
                            <div className="chat-attachment-preview-icon">
                                {getFileIcon(file.type)}
                            </div>
                            <div className="chat-attachment-preview-info">
                                <div className="chat-attachment-preview-name">{file.name}</div>
                                <div className="chat-attachment-preview-size">{formatFileSize(file.size)}</div>
                            </div>
                            <button 
                                className="chat-attachment-preview-remove"
                                onClick={() => handleRemoveFile(index)}
                                type="button"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}
            
            <form className="chat-input-container" onSubmit={handleSend} autoComplete="off">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                    multiple
                />
                <button 
                    type="button" 
                    className="chat-attachment-button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSending}
                >
                    <img src={ClipIcon} alt="attach" />
                </button>
                <input
                    className="chat-input"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder="Введите сообщение..."
                    disabled={isSending}
                />
                <button 
                    type="submit" 
                    className="chat-send-button" 
                    disabled={isSending || (input.trim() === '' && files.length === 0)}
                >
                    <img src={SendIcon} alt="send" />
                </button>
            </form>
        </div>
    );
}

export default Chat;
