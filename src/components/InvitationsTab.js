import React, { useState } from 'react';
import { useGetMyInvitationsQuery, useAcceptInvitationMutation, useRejectInvitationMutation } from '../services/api';
import { useGetProjectsQuery } from '../services/api';
import '../styles/components/InvitationsTab.css';

function InvitationsTab() {
    const [activeTab, setActiveTab] = useState('active');
    const { data: invitations, isLoading, error } = useGetMyInvitationsQuery();
    const [acceptInvitation] = useAcceptInvitationMutation();
    const [rejectInvitation] = useRejectInvitationMutation();
    const { refetch: refetchProjects } = useGetProjectsQuery();

    const handleAccept = async (invitationId) => {
        try {
            await acceptInvitation(invitationId);
            await refetchProjects();
        } catch (error) {
            console.error('Error accepting invitation:', error);
        }
    };

    const handleReject = async (invitationId) => {
        try {
            await rejectInvitation(invitationId);
        } catch (error) {
            console.error('Error rejecting invitation:', error);
        }
    };

    if (isLoading) return <div className="invitations-loading">Загрузка приглашений...</div>;
    if (error) return <div className="invitations-error">Ошибка загрузки приглашений</div>;

    // Фильтруем приглашения по статусу
    const activeInvitations = invitations?.filter(inv => inv.status === 'PENDING') || [];
    const archivedInvitations = invitations?.filter(inv => inv.status === 'ACCEPTED' || inv.status === 'REJECTED') || [];

    const renderInvitationsList = (invitationsList) => {
        if (invitationsList.length === 0) {
            return <div className="no-invitations">Нет приглашений</div>;
        }

        return (
            <div className="invitations-list">
                {invitationsList.map((invitation) => (
                    <div key={invitation.id} className="invitation-card">
                        <div className="invitation-info">
                            <div className="invitation-project">
                                Проект: {invitation.projectTitle}
                            </div>
                            <div className="invitation-sender">
                                От: {invitation.senderUsername}
                            </div>
                            <div className="invitation-status">
                                Статус: {invitation.status === 'PENDING' ? 'Ожидает ответа' : 
                                        invitation.status === 'ACCEPTED' ? 'Принято' : 
                                        invitation.status === 'REJECTED' ? 'Отклонено' : invitation.status}
                            </div>
                        </div>
                        {invitation.status === 'PENDING' && (
                            <div className="invitation-actions">
                                <button
                                    className="accept-button"
                                    onClick={() => handleAccept(invitation.id)}
                                >
                                    Принять
                                </button>
                                <button
                                    className="reject-button"
                                    onClick={() => handleReject(invitation.id)}
                                >
                                    Отклонить
                                </button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="invitations-tab">
            <div className="invitations-tab-header">
                <button 
                    className={`invitations-tab-button ${activeTab === 'active' ? 'active' : ''}`}
                    onClick={() => setActiveTab('active')}
                >
                    Активные ({activeInvitations.length})
                </button>
                <button 
                    className={`invitations-tab-button ${activeTab === 'archived' ? 'active' : ''}`}
                    onClick={() => setActiveTab('archived')}
                >
                    Архив ({archivedInvitations.length})
                </button>
            </div>
            <div className="invitations-tab-content">
                {activeTab === 'active' ? (
                    <>
                        <h3 className="invitations-title">Активные приглашения</h3>
                        {renderInvitationsList(activeInvitations)}
                    </>
                ) : (
                    <>
                        <h3 className="invitations-title">Архив приглашений</h3>
                        {renderInvitationsList(archivedInvitations)}
                    </>
                )}
            </div>
        </div>
    );
}

export default InvitationsTab; 