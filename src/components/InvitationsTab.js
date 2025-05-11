import React from 'react';
import { useGetMyInvitationsQuery, useAcceptInvitationMutation, useRejectInvitationMutation } from '../services/api';
import { useGetProjectsQuery } from '../services/api';
import '../styles/components/InvitationsTab.css';

function InvitationsTab() {
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

    // Фильтруем приглашения по статусу - только активные (PENDING)
    const activeInvitations = invitations?.filter(inv => inv.status === 'PENDING') || [];

    const renderInvitationsList = (invitationsList) => {
        if (invitationsList.length === 0) {
            return <div className="no-invitations">Нет активных приглашений</div>;
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
                                Статус: Ожидает ответа
                            </div>
                        </div>
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
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="invitations-tab">
            <div className="invitations-tab-content">
                <h3 className="invitations-title">Активные приглашения</h3>
                {renderInvitationsList(activeInvitations)}
            </div>
        </div>
    );
}

export default InvitationsTab; 