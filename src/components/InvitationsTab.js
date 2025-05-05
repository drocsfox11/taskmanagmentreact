import React from 'react';
import { useGetMyInvitationsQuery, useAcceptInvitationMutation, useRejectInvitationMutation } from '../services/api';
import '../styles/components/InvitationsTab.css';

function InvitationsTab() {
    const { data: invitations, isLoading, error } = useGetMyInvitationsQuery();
    const [acceptInvitation] = useAcceptInvitationMutation();
    const [rejectInvitation] = useRejectInvitationMutation();

    const handleAccept = async (invitationId) => {
        try {
            await acceptInvitation(invitationId);
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

    return (
        <div className="invitations-tab">
            <h3 className="invitations-title">Мои приглашения</h3>
            {invitations?.length === 0 ? (
                <div className="no-invitations">У вас нет приглашений</div>
            ) : (
                <div className="invitations-list">
                    {invitations?.map((invitation) => (
                        <div key={invitation.id} className="invitation-card">
                            <div className="invitation-info">
                                <div className="invitation-project">
                                    Проект: {invitation.projectTitle}
                                </div>
                                <div className="invitation-sender">
                                    От: {invitation.senderUsername}
                                </div>
                                <div className="invitation-status">
                                    Статус: {invitation.status}
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
            )}
        </div>
    );
}

export default InvitationsTab; 