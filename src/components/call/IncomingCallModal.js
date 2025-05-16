import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPhone, faPhoneSlash } from '@fortawesome/free-solid-svg-icons';
import '../../styles/components/call/IncomingCallModal.css';

const IncomingCallModal = ({ caller, callType, onAccept, onReject }) => {
  return (
    <div className="incoming-call-modal-overlay">
      <div className="incoming-call-modal">
        <div className="incoming-call-header">
          <h3>Входящий {callType === 'VIDEO' ? 'видеозвонок' : 'аудиозвонок'}</h3>
        </div>
        
        <div className="incoming-call-body">
          <div className="incoming-call-avatar">
            {caller.avatarURL ? (
              <img src={caller.avatarURL} alt={caller.name} />
            ) : (
              <div className="incoming-call-avatar-placeholder">
                {caller.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          
          <div className="incoming-call-caller-info">
            <h4>{caller.name}</h4>
            <p>Вызывает вас...</p>
          </div>
        </div>
        
        <div className="incoming-call-actions">
          <button 
            className="incoming-call-reject-btn" 
            onClick={onReject}
            title="Отклонить"
          >
            <FontAwesomeIcon icon={faPhoneSlash} />
          </button>
          
          <button 
            className="incoming-call-accept-btn" 
            onClick={onAccept}
            title="Принять"
          >
            <FontAwesomeIcon icon={faPhone} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal; 