import React from 'react';
import '../styles/components/IncomingCallNotification.css';
import { CallType } from '../services/api/CallService';
import ProfileIcon from '../assets/icons/messenger_ava.svg';

// Call control icons
import AcceptCallIcon from '../assets/icons/accept-call.svg';
import RejectCallIcon from '../assets/icons/reject-call.svg';

const IncomingCallNotification = ({ 
  callEvent, 
  onAccept, 
  onReject
}) => {
  if (!callEvent) return null;

  const isVideoCall = callEvent.callType === CallType.VIDEO;
  const callerName = callEvent.senderName || 'Unknown';
  const callerAvatar = callEvent.senderAvatar || ProfileIcon;

  // Handle call acceptance
  const handleAccept = () => {
    if (onAccept) onAccept(callEvent);
  };

  // Handle call rejection
  const handleReject = () => {
    if (onReject) onReject(callEvent);
  };

  return (
    <div className="incoming-call-notification">
      <div className="incoming-call-header">
        <h3>Входящий {isVideoCall ? 'видео' : 'аудио'} звонок</h3>
      </div>
      
      <div className="incoming-call-content">
        <div className="incoming-call-avatar">
          <img src={callerAvatar} alt={callerName} />
        </div>
        
        <div className="incoming-call-info">
          <div className="incoming-call-name">{callerName}</div>
          <div className="incoming-call-type">{isVideoCall ? 'Видеозвонок' : 'Аудиозвонок'}</div>
        </div>
      </div>
      
      <div className="incoming-call-actions">
        <button 
          className="call-action-button reject-call"
          onClick={handleReject}
        >
          <img src={RejectCallIcon} alt="Reject call" />
          <span>Отклонить</span>
        </button>
        
        <button 
          className="call-action-button accept-call"
          onClick={handleAccept}
        >
          <img src={AcceptCallIcon} alt="Accept call" />
          <span>Ответить</span>
        </button>
      </div>
    </div>
  );
};

export default IncomingCallNotification; 