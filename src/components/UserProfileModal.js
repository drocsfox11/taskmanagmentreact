import React, { useState } from 'react';
import InvitationsTab from './InvitationsTab'
import '../styles/components/UserProfileModal.css'
import { useGetCurrentUserQuery } from '../services/api/usersApi';
function UserProfileModal({ onClose }) {
    const [activeTab, setActiveTab] = useState('profile');
    const { data: user, isLoading } = useGetCurrentUserQuery();
    if (!user) return null;
    console.log(user);
    const renderContent = () => {
        switch (activeTab) {
            case 'profile':
                return (
                    <>
                        <div className="user-profile-modal-avatar-section">
                            <img src={user.avatarURL} alt="avatar" className="user-profile-modal-avatar"/>
                            <button className="user-profile-modal-edit-button">Редактировать</button>
                            <button className="user-profile-modal-delete-button">Удалить</button>
                        </div>
                        <div className="user-profile-modal-field">
                            <div className="user-profile-modal-label">Имя пользователя</div>
                            <input value={user.username || ''} disabled className="user-profile-modal-input"/>
                        </div>
                        <div className="user-profile-modal-field">
                            <div className="user-profile-modal-label">Почтовый адрес</div>
                            <input value={user.email || ''} disabled className="user-profile-modal-input"/>
                        </div>
                        {user.name && (
                            <div className="user-profile-modal-field">
                                <div className="user-profile-modal-label">Имя</div>
                                <input value={user.name} disabled className="user-profile-modal-input"/>
                            </div>
                        )}
                    </>
                );
            case 'invitations':
                return <InvitationsTab />;
            default:
                return null;
        }
    };

    return (
        <div className="user-profile-modal-overlay">
            <div className="user-profile-modal">
                <div className="user-profile-modal-header">
                    <div className="user-profile-modal-title">Настройки</div>
                    <span className="user-profile-modal-close" onClick={onClose}>×</span>
                </div>
                <div className="user-profile-modal-content">
                    <div className="user-profile-modal-sidebar">
                        <div 
                            className={`user-profile-modal-tab ${activeTab === 'profile' ? 'active' : ''}`}
                            onClick={() => setActiveTab('profile')}
                        >
                            👤 Профиль
                        </div>
                        <div 
                            className={`user-profile-modal-tab ${activeTab === 'invitations' ? 'active' : ''}`}
                            onClick={() => setActiveTab('invitations')}
                        >
                            💌 Приглашения
                        </div>
                    </div>
                    <div className="user-profile-modal-main">
                        {renderContent()}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default UserProfileModal; 