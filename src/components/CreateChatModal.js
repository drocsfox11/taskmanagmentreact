import React, { useState, useRef, useEffect, useCallback } from 'react';
import '../styles/components/CreateChatModal.css';
import CloseCross from '../assets/icons/close_cross.svg';
import MessengerAva from '../assets/icons/messenger_ava.svg';
import { useSearchUsersQuery } from '../services/api';
import { useCreateChatMutation } from '../services/api';

function CreateChatModal({ isOpen, onClose, onChatCreated }) {
    const [type, setType] = useState('private');
    const [search, setSearch] = useState('');
    const [searchPage, setSearchPage] = useState(0);
    const [selectedUser, setSelectedUser] = useState(null);
    const [groupName, setGroupName] = useState('');
    const [groupAvatar, setGroupAvatar] = useState(null);
    const [groupUsers, setGroupUsers] = useState([]);
    const [createChat, { isLoading: isCreating }] = useCreateChatMutation();
    const modalRef = useRef(null);
    const usersPerPage = 10;

    const { data: searchData, isLoading: isSearching, isFetching } = useSearchUsersQuery(
        { name: search, page: searchPage, size: usersPerPage },
        { skip: !search }
    );
    console.log(searchData);
    const users = searchData?.users || [];
    const hasNext = searchData?.hasNext;
    console.log(users);
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
            setType('private');
            setSearch('');
            setSearchPage(0);
            setSelectedUser(null);
            setGroupName('');
            setGroupAvatar(null);
            setGroupUsers([]);
        }
    }, [isOpen]);

    const handleAddGroupUser = (user) => {
        if (!groupUsers.some(u => u.id === user.id)) {
            setGroupUsers([...groupUsers, user]);
        }
    };
    const handleRemoveGroupUser = (id) => {
        setGroupUsers(groupUsers.filter(u => u.id !== id));
    };
    const handleScroll = useCallback((e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        if (scrollTop + clientHeight >= scrollHeight - 40 && hasNext && !isFetching) {
            setSearchPage(p => p + 1);
        }
    }, [hasNext, isFetching]);
    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) setGroupAvatar(file);
    };
    const handleCreate = async (e) => {
        e.preventDefault();
        if (type === 'private' && selectedUser) {
            await createChat({chat: {
                name: '',
                isGroupChat: false,
                avatarURL: '',
                participantIds: [selectedUser.id]
            }, selectedUser});
            onChatCreated();
        } else if (type === 'group' && groupName && groupUsers.length) {
            let avatarURL = '';
            if (groupAvatar) {
                // TODO: upload avatar and get URL
            }
            await createChat({chat: {
                name: groupName,
                isGroupChat: true,
                avatarURL,
                participantIds: groupUsers.map(u => u.id)
            }, selectedUser: groupUsers});
            onChatCreated();
        }
    };
    return (
        <div className="create-chat-modal-overlay">
            <div className="create-chat-modal" ref={modalRef}>
                <div className="create-chat-modal-header">
                    <h2>Создать чат</h2>
                    <button className="create-chat-modal-close-button" onClick={onClose}>
                        <img src={CloseCross} alt="Закрыть" />
                    </button>
                </div>
                <div className="create-chat-modal-tabs" style={{marginBottom: 24}}>
                    <button
                        className={`create-chat-modal-tab-button${type === 'private' ? ' active' : ''}`}
                        onClick={() => setType('private')}
                    >Личный</button>
                    <button
                        className={`create-chat-modal-tab-button${type === 'group' ? ' active' : ''}`}
                        onClick={() => setType('group')}
                    >Групповой</button>
                    <div
                        className="create-chat-modal-tab-slider"
                        style={{
                            left: type === 'private' ? 0 : '50%',
                        }}
                    />
                </div>
                <form className="create-chat-modal-content" onSubmit={handleCreate}>
                    <div className="create-chat-modal-form-overflow">
                    {type === 'group' && (
                        <div className="create-chat-modal-form-group">
                            <label>Название группы</label>
                            <input
                                type="text"
                                value={groupName}
                                onChange={e => setGroupName(e.target.value)}
                                required
                                maxLength={40}
                                placeholder="Введите название чата"
                            />
                        </div>
                    )}
                    {type === 'group' && (
                        <div className="create-chat-modal-form-group" style={{marginBottom: 16}}>
                            <label>Аватарка (необязательно)</label>
                            <div className="create-chat-modal-avatar-row">
                                <img
                                    src={groupAvatar ? URL.createObjectURL(groupAvatar) : MessengerAva}
                                    alt="Аватарка"
                                    className="create-chat-modal-avatar-img"
                                />
                                <input type="file" accept="image/*" style={{display: 'none'}} id="group-avatar-input" onChange={handleAvatarChange} />
                                <label htmlFor="group-avatar-input" className="create-chat-modal-avatar-btn">Выбрать</label>
                            </div>
                        </div>
                    )}
                    <div className="create-chat-modal-form-group">
                        
                        {type === 'group' && groupUsers.length > 0 && (
                        <div className="create-chat-modal-participants-section">
                            <h3 className="create-chat-modal-participants-title">Участники</h3>
                            <div className="create-chat-modal-participants-list">
                                {groupUsers.map(user => (
                                    <div className="create-chat-modal-participant-item" key={user.id}>
                                        <div className="create-chat-modal-participant-avatar">
                                            <img src={user.avatarURL || MessengerAva} alt="avatar" />
                                        </div>
                                        <div className="create-chat-modal-participant-info">
                                            <span className="create-chat-modal-participant-username">{user.name || user.username}</span>
                                        </div>
                                        <button className="create-chat-modal-remove-participant-btn" type="button" onClick={() => handleRemoveGroupUser(user.id)}>&times;</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <label>{type === 'private' ? 'Пользователь' : 'Добавить участников'}</label>
                        <input
                            type="text"
                            value={search}
                            onChange={e => { setSearch(e.target.value); setSearchPage(0); }}
                            placeholder="Поиск пользователей..."
                            autoFocus
                        />
                        {search && (
                            <div
                                className="create-chat-modal-search-results"
                                onScroll={handleScroll}
                            >
                                {isSearching && <div className="create-chat-modal-search-loading">Загрузка...</div>}
                                {users.map(user => (
                                    <div
                                        key={user.id}
                                        className={`create-chat-modal-search-result-item${(type === 'private' && selectedUser?.id === user.id) || (type === 'group' && groupUsers.some(u => u.id === user.id)) ? ' selected' : ''}`}
                                        onClick={() => {
                                            if (type === 'private') setSelectedUser(user);
                                            else handleAddGroupUser(user);
                                        }}
                                    >
                                        <img src={user.avatarURL || MessengerAva} alt="avatar" className="create-chat-modal-search-avatar" />
                                        <span>{user.name || user.username}</span>
                                    </div>
                                ))}
                                {isFetching && <div className="create-chat-modal-search-loading-more">Загрузка...</div>}
                                {!isSearching && users.length === 0 && <div className="create-chat-modal-search-loading">Не найдено</div>}
                            </div>
                        )}
                    </div>
                    </div>
                    <button
                        className="create-chat-modal-save-btn"
                        type="submit"
                        disabled={isCreating || (type === 'private' ? !selectedUser : !groupName || groupUsers.length === 0)}
                    >
                        {isCreating ? 'Создание...' : 'Создать чат'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default CreateChatModal; 