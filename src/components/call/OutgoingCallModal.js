import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPhoneSlash } from '@fortawesome/free-solid-svg-icons';
import '../../styles/components/call/OutgoingCallModal.css';

const OutgoingCallModal = ({ chatName, callType, onCancel }) => {
  return (
    <div className="outgoing-call-modal-overlay">
      <div className="outgoing-call-modal">
        <div className="outgoing-call-header">
          <h3>Исходящий {callType === 'VIDEO' ? 'видеозвонок' : 'аудиозвонок'}</h3>
        </div>
        
        <div className="outgoing-call-body">
          <div className="outgoing-call-info">
            <h4>{chatName}</h4>
            <p>Вызов...</p>
          </div>
          
          <div className="outgoing-call-animation">
            <div className="outgoing-call-ripple">
              <div></div>
              <div></div>
              <div></div>
            </div>
          </div>
        </div>
        
        <div className="outgoing-call-actions">
          <button 
            className="outgoing-call-cancel-btn" 
            onClick={onCancel}
            title="Отменить"
          >
            <FontAwesomeIcon icon={faPhoneSlash} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default OutgoingCallModal; 