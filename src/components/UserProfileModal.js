import React, { useState } from 'react';
import InvitationsTab from './InvitationsTab'
import '../styles/components/UserProfileModal.css'
import { useGetCurrentUserQuery, useUpdateUserNameMutation } from '../services/api/usersApi';

function UserProfileModal({ onClose }) {
    const [activeTab, setActiveTab] = useState('profile');
    const { data: user, isLoading } = useGetCurrentUserQuery();
    const [updateUser, {error: updateError}] = useUpdateUserNameMutation();
    const [editedName, setEditedName] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    console.log("Error", updateError);
    const [errorMessage, setErrorMessage] = useState(null);
    if (updateError?.data && updateError.data !== errorMessage) {
        setErrorMessage(updateError.data);
    }
    if (!user) return null;

    const handleNameChange = (e) => {
        setEditedName(e.target.value);
    };

    const startEditing = () => {
        setEditedName(user.name || '');
        setIsEditing(true);
    };

    const cancelEditing = () => {
        setIsEditing(false);
    };

    const saveNameChanges = async () => {
        try {
            if (editedName === user.name) {
                return;
            }
            if (!editedName) {
                setErrorMessage("Имя не может быть пустым");
                return;
            }
            await updateUser({
                name: editedName
            });
            setIsEditing(false);
        } catch (error) {
            console.error('Error updating user name:', error);
        }
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'profile':
                return (
                    <>
                        <div className="user-profile-modal-avatar-section">
                            <img src={user.avatarURL} alt="avatar" className="user-profile-modal-avatar"/>
                        </div>

                        {user.name !== undefined && (
                            <div className="user-profile-modal-field">
                                <div className="user-profile-modal-label">Имя</div>
                                {errorMessage && (
                                    <div className="user-profile-error-message">{errorMessage}</div>
                                )}
                                {isEditing ? (
                                    <>
                                        <input 
                                            value={editedName}
                                            onChange={handleNameChange}
                                            className="user-profile-modal-input"
                                            autoFocus
                                        />
                                        <div className="user-profile-modal-buttons">
                                            <button 
                                                className="user-profile-modal-save-button"
                                                onClick={saveNameChanges}
                                            >
                                                Сохранить
                                            </button>
                                            <button 
                                                className="user-profile-modal-cancel-button"
                                                onClick={cancelEditing}
                                            >
                                                Отменить
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <input 
                                        value={user.name || ''} 
                                        className="user-profile-modal-input" 
                                        readOnly
                                        onClick={startEditing}
                                        style={{cursor: 'pointer'}}
                                    />
                                )}
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