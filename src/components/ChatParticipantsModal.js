import React, { useState, useEffect, useRef, useCallback } from 'react';
import '../styles/components/ChatParticipantsModal.css';
import CloseCross from '../assets/icons/close_cross.svg';
import MessengerAva from '../assets/icons/messenger_ava.png';
import TrashIcon from '../assets/icons/delete.svg';
import { 
    useSearchUsersQuery, 
    useGetCurrentUserQuery,
    useDeleteChatMutation,
    useRemoveParticipantMutation,
    useAddParticipantMutation,
    useChangeParticipantRoleMutation
} from '../services/api/';

function ChatParticipantsModal({ chatId, chat, onClose, isOpen = false }) {
    const [selectedUser, setSelectedUser] = useState(null);
    const [search, setSearch] = useState('');
    const [searchPage, setSearchPage] = useState(0);
    const [showAddUser, setShowAddUser] = useState(false);
    const [activeTab, setActiveTab] = useState('participants');
    const modalRef = useRef(null);
    
    const { data: currentUser } = useGetCurrentUserQuery();
    const [deleteChat] = useDeleteChatMutation();
    const [removeParticipant] = useRemoveParticipantMutation();
    const [addParticipant] = useAddParticipantMutation();
    const [changeParticipantRole] = useChangeParticipantRoleMutation();
    
    const usersPerPage = 10;
    
    const { data: searchData, isLoading: isSearching, isFetching } = useSearchUsersQuery(
        { name: search, page: searchPage, size: usersPerPage },
        { skip: !search || !showAddUser }
    );
    
    const users = searchData?.users?.filter(user => 
        (currentUser ? user.id !== currentUser.id : true) && 
        !chat?.participants.some(p => p.id === user.id)
    ) || [];
    
    const hasNext = searchData?.hasNext;
    
    const currentUserRole = chat?.participants.find(p => p.id === currentUser?.id)?.role || 'MEMBER';
    const isOwner = currentUserRole === 'OWNER';
    const isModerator = currentUserRole === 'MODERATOR';
    const hasAdminRights = isOwner || isModerator;
    
    useEffect(() => {
        function handleClickOutside(e) {
            if (modalRef.current && !modalRef.current.contains(e.target)) {
                onClose();
            }
        }
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose]);
    
    useEffect(() => {
        if (isOpen) {
            setSearch('');
            setSearchPage(0);
            setSelectedUser(null);
            setShowAddUser(false);
            setActiveTab('participants');
        }
    }, [isOpen]);
    
    const handleScroll = useCallback((e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        if (scrollTop + clientHeight >= scrollHeight - 40 && hasNext && !isFetching) {
            setSearchPage(p => p + 1);
        }
    }, [hasNext, isFetching]);
    
    const handleDeleteChat = async () => {
        if (window.confirm('Вы уверены, что хотите удалить этот чат? Это действие нельзя отменить.')) {
            try {
                await deleteChat(chatId);
                onClose();
            } catch (error) {
                console.error('Failed to delete chat:', error);
            }
        }
    };
    
    const handleRemoveParticipant = async (userId) => {
        if (window.confirm('Вы уверены, что хотите удалить этого участника из чата?')) {
            try {
                await removeParticipant({ chatId, userId });
            } catch (error) {
                console.error('Failed to remove participant:', error);
            }
        }
    };
    
    const handleAddParticipant = async (user) => {
        try {
            await addParticipant({ chatId, user });
            setSearch('');
            setShowAddUser(false);
        } catch (error) {
            console.error('Failed to add participant:', error);
        }
    };
    
    const handleChangeRole = async (userId, newRole) => {
        try {
            await changeParticipantRole({ chatId, userId, role: newRole });
        } catch (error) {
            console.error('Failed to change participant role:', error);
        }
    };
    
    const canManageUser = (targetUser) => {
        if (!hasAdminRights) return false;
        if (isOwner) return true;
        
        const targetUserRole = chat?.participants.find(p => p.id === targetUser.id)?.role;
        return targetUserRole === 'MEMBER';
    };
    
    if (!chat) return null;
    
    return (
        <div className="chat-participants-modal-overlay">
            <div className="chat-participants-modal" ref={modalRef}>
                <div className="chat-participants-modal-header">
                    <h2>{chat.name || 'Чат'}</h2>
                    <button className="chat-participants-modal-close-button" onClick={onClose}>
                        <img src={CloseCross} alt="Закрыть" />
                    </button>
                </div>
                
                <div className="chat-participants-modal-tabs">
                    <button
                        className={`chat-participants-modal-tab-button${activeTab === 'participants' ? ' active' : ''}`}
                        onClick={() => setActiveTab('participants')}
                    >
                        Участники
                    </button>
                    {hasAdminRights && (
                        <button
                            className={`chat-participants-modal-tab-button${activeTab === 'settings' ? ' active' : ''}`}
                            onClick={() => setActiveTab('settings')}
                        >
                            Настройки
                        </button>
                    )}
                </div>
                
                <div className="chat-participants-modal-content">
                    {activeTab === 'participants' && (
                        <div className="chat-participants-tab">
                            {hasAdminRights && (
                                <div className="chat-participants-actions">
                                    <button 
                                        className="chat-add-participant-button"
                                        onClick={() => setShowAddUser(!showAddUser)}
                                    >
                                        {showAddUser ? 'Отменить' : 'Добавить участника'}
                                    </button>
                                </div>
                            )}
                            
                            {showAddUser && (
                                <div className="chat-add-participant-section">
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={e => { setSearch(e.target.value); setSearchPage(0); }}
                                        placeholder="Поиск пользователей..."
                                        autoFocus
                                    />
                                    
                                    {search && (
                                        <div
                                            className="chat-participants-search-results"
                                            onScroll={handleScroll}
                                        >
                                            {isSearching && <div className="chat-participants-search-loading">Загрузка...</div>}
                                            {users.map(user => (
                                                <div
                                                    key={user.id}
                                                    className="chat-participants-search-result-item"
                                                    onClick={() => handleAddParticipant(user)}
                                                >
                                                    <img src={user.avatarURL || MessengerAva} alt="avatar" className="chat-participants-search-avatar" />
                                                    <span>{user.name || user.username}</span>
                                                </div>
                                            ))}
                                            {isFetching && <div className="chat-participants-search-loading-more">Загрузка...</div>}
                                            {!isSearching && users.length === 0 && <div className="chat-participants-search-loading">Не найдено</div>}
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            <div className="chat-participants-list">
                                {chat.participants.map(participant => (
                                    <div key={participant.id} className="chat-participant">
                                        <img 
                                            src={participant.avatarURL || MessengerAva} 
                                            alt="avatar" 
                                            className="chat-participant-avatar"
                                        />
                                        <div className="chat-participant-info">
                                            <div className="chat-participant-name">
                                                {participant.name}
                                                {participant.id === currentUser?.id && ' (Вы)'}
                                            </div>
                                            <div className="chat-participant-role">{participant.role}</div>
                                        </div>
                                        
                                        {hasAdminRights && participant.id !== currentUser?.id && canManageUser(participant) && (
                                            <div className="chat-participant-actions">
                                                {isOwner && <select
                                                    className="chat-participant-role-select"
                                                    value={participant.role}
                                                    onChange={(e) => handleChangeRole(participant.id, e.target.value)}
                                                >
                                                    <option value="MEMBER">Участник</option>
                                                    <option value="MODERATOR">Модератор</option>
                                                </select>}
                                                
                                                <button 
                                                    className="chat-remove-participant-button"
                                                    onClick={() => handleRemoveParticipant(participant.id)}
                                                >
                                                    <img src={TrashIcon} alt="Удалить" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {activeTab === 'settings' && (
                        <div className="chat-settings-tab">
                            {isOwner && (
                                <div className="chat-danger-zone">
                                    <h3>Опасная зона</h3>
                                    <button 
                                        className="modal-chat-delete-button"
                                        onClick={handleDeleteChat}
                                    >
                                        Удалить чат
                                    </button>
                                    <p className="chat-danger-warning">
                                        Это действие нельзя отменить. Все сообщения будут удалены.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ChatParticipantsModal; 