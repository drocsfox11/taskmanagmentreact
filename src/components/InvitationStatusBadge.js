import React from 'react';
import '../styles/components/InvitationStatusBadge.css';

function InvitationStatusBadge({ status }) {
    const getStatusInfo = () => {
        switch (status) {
            case 'PENDING':
                return { text: 'Приглашен', className: 'pending' };
            case 'ACCEPTED':
                return { text: 'Принято', className: 'accepted' };
            case 'REJECTED':
                return { text: 'Отклонено', className: 'rejected' };
            case 'EXPIRED':
                return { text: 'Истекло', className: 'expired' };
            case null:
                return { text: 'Участник', className: 'member' };
            default:
                return { text: 'Неизвестно', className: 'unknown' };
        }
    };

    const { text, className } = getStatusInfo();

    return (
        <span className={`invitation-status-badge ${className}`}>
            {text}
        </span>
    );
}

export default InvitationStatusBadge; 