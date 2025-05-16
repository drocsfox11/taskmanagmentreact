import React, { useState, useEffect, useRef } from 'react';
import '../styles/components/CallUI.css';
import { CallType, CallEventType } from '../services/api/CallService';
import webRTCService from '../services/WebRTCService';

// Icons for call controls
import MicOnIcon from '../assets/icons/mic-on.svg';
import MicOffIcon from '../assets/icons/mic-off.svg';
import VideoOnIcon from '../assets/icons/video-on.svg';
import VideoOffIcon from '../assets/icons/video-off.svg';
import EndCallIcon from '../assets/icons/end-call.svg';
import ScreenShareIcon from '../assets/icons/screen-share.svg';
import StopScreenShareIcon from '../assets/icons/stop-screen-share.svg';

const CallUI = ({ 
  callData, 
  onEndCall, 
  chatParticipants = [],
  connectionStatus = 'connected'
}) => {
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callData?.callType === CallType.VIDEO);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [activeParticipants, setActiveParticipants] = useState([]);
  const [callStatus, setCallStatus] = useState('connecting');
  
  const localVideoRef = useRef(null);
  const remoteVideoRefs = useRef({});
  
  // Initialize the call UI
  useEffect(() => {
    if (!callData) return;
    
    // Set up handlers for WebRTC events
    webRTCService.onLocalStreamCreated = (stream) => {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    };
    
    webRTCService.onRemoteStreamAdded = (stream, participantId) => {
      console.log(`Remote stream added for participant ${participantId}`);
      
      // Find the participant info
      const participant = chatParticipants.find(p => p.id === parseInt(participantId));
      
      if (participant) {
        setActiveParticipants(prev => {
          // Don't add duplicates
          if (prev.some(p => p.id === participant.id)) {
            return prev;
          }
          return [...prev, participant];
        });
      }
      
      // Set the stream to the video element
      if (remoteVideoRefs.current[participantId]) {
        remoteVideoRefs.current[participantId].srcObject = stream;
      }
    };
    
    webRTCService.onRemoteStreamRemoved = (participantId) => {
      console.log(`Remote stream removed for participant ${participantId}`);
      
      setActiveParticipants(prev => 
        prev.filter(p => p.id !== parseInt(participantId))
      );
    };
    
    webRTCService.onCallStateChange = (state) => {
      console.log(`Call state changed to: ${state}`);
      
      switch (state) {
        case 'connected':
          setCallStatus('connected');
          break;
        case 'disconnected':
        case 'failed':
        case 'closed':
          setCallStatus('disconnected');
          break;
        default:
          setCallStatus('connecting');
          break;
      }
    };
    
    return () => {
      // Clean up event handlers
      webRTCService.onLocalStreamCreated = null;
      webRTCService.onRemoteStreamAdded = null;
      webRTCService.onRemoteStreamRemoved = null;
      webRTCService.onCallStateChange = null;
    };
  }, [callData, chatParticipants]);
  
  // Update connection status in UI
  useEffect(() => {
    if (connectionStatus === 'disconnected') {
      setCallStatus('connection-lost');
    } else if (callStatus === 'connection-lost' && connectionStatus === 'connected') {
      setCallStatus('reconnected');
      
      // Give a brief "reconnected" status before going back to normal status
      const timer = setTimeout(() => {
        setCallStatus(webRTCService.peerConnection && 
                     webRTCService.peerConnection.connectionState === 'connected' 
                     ? 'connected' : 'connecting');
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [connectionStatus, callStatus]);
  
  // Set up refs for any new participants
  useEffect(() => {
    if (callData?.callType === CallType.AUDIO) return;
    
    remoteVideoRefs.current = {};
    
    // Create refs for each participant
    activeParticipants.forEach(participant => {
      if (!remoteVideoRefs.current[participant.id]) {
        remoteVideoRefs.current[participant.id] = document.createElement('video');
        remoteVideoRefs.current[participant.id].autoplay = true;
        remoteVideoRefs.current[participant.id].playsInline = true;
      }
    });
  }, [activeParticipants, callData?.callType]);

  const handleToggleAudio = () => {
    const newState = webRTCService.toggleAudio();
    setIsAudioEnabled(newState);
  };

  const handleToggleVideo = () => {
    if (callData?.callType !== CallType.VIDEO) return;
    
    const newState = webRTCService.toggleVideo();
    setIsVideoEnabled(newState);
  };

  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      const success = await webRTCService.stopScreenSharing();
      if (success) {
        setIsScreenSharing(false);
      }
    } else {
      const success = await webRTCService.startScreenSharing();
      if (success) {
        setIsScreenSharing(true);
      }
    }
  };

  const handleEndCall = () => {
    webRTCService.endCurrentCall();
    if (onEndCall) onEndCall();
  };

  // Get the call status text
  const getCallStatusText = () => {
    // Проверяем, инициатор ли текущий пользователь
    const isInitiator = webRTCService.isInitiator;
    
    switch (callStatus) {
      case 'connected':
        return 'Разговор';
      case 'disconnected':
        return 'Завершен';
      case 'connection-lost':
        return 'Соединение потеряно...';
      case 'reconnected':
        return 'Соединение восстановлено';
      case 'connecting':
        // Отображаем разные статусы для инициатора и получателя звонка
        return isInitiator ? 'Вызов...' : 'Соединение...';
      default:
        return 'Соединение...';
    }
  };

  // Render audio-only call UI
  if (callData?.callType === CallType.AUDIO) {
    return (
      <div className="call-ui audio-only">
        <div className="call-header">
          <h2>Аудиозвонок</h2>
          <div className={`call-status ${callStatus === 'connection-lost' ? 'status-error' : ''}`}>
            {getCallStatusText()}
          </div>
        </div>
        
        <div className="call-participants">
          {activeParticipants.map(participant => (
            <div key={participant.id} className="call-participant">
              <div className="participant-avatar">
                <img src={participant.avatarURL} alt={participant.name} />
              </div>
              <div className="participant-name">{participant.name}</div>
            </div>
          ))}
        </div>
        
        <div className="call-controls">
          <button 
            className={`control-button ${!isAudioEnabled ? 'disabled' : ''}`}
            onClick={handleToggleAudio}
            disabled={callStatus === 'connection-lost'}
          >
            <img src={isAudioEnabled ? MicOnIcon : MicOffIcon} alt="Toggle microphone" />
          </button>
          
          <button 
            className="control-button end-call"
            onClick={handleEndCall}
          >
            <img src={EndCallIcon} alt="End call" />
          </button>
        </div>
      </div>
    );
  }

  // Render video call UI
  return (
    <div className="call-ui video-call">
      <div className="call-header">
        <h2>Видеозвонок</h2>
        <div className={`call-status ${callStatus === 'connection-lost' ? 'status-error' : ''}`}>
          {getCallStatusText()}
        </div>
      </div>
      
      <div className="video-container">
        <div className="remote-video-grid">
          {activeParticipants.map(participant => (
            <div key={participant.id} className="remote-video-wrapper">
              <video
                ref={el => { remoteVideoRefs.current[participant.id] = el; }}
                autoPlay
                playsInline
                className="remote-video"
              />
              <div className="participant-name-overlay">{participant.name}</div>
            </div>
          ))}
          
          {callStatus === 'connection-lost' && (
            <div className="connection-lost-overlay">
              <div className="connection-lost-message">
                Соединение потеряно. Пытаемся восстановить...
              </div>
            </div>
          )}
        </div>
        
        <div className="local-video-wrapper">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="local-video"
          />
          <div className="participant-name-overlay">Вы</div>
        </div>
      </div>
      
      <div className="call-controls">
        <button 
          className={`control-button ${!isAudioEnabled ? 'disabled' : ''}`}
          onClick={handleToggleAudio}
          disabled={callStatus === 'connection-lost'}
        >
          <img src={isAudioEnabled ? MicOnIcon : MicOffIcon} alt="Toggle microphone" />
        </button>
        
        <button 
          className={`control-button ${!isVideoEnabled ? 'disabled' : ''}`}
          onClick={handleToggleVideo}
          disabled={callStatus === 'connection-lost'}
        >
          <img src={isVideoEnabled ? VideoOnIcon : VideoOffIcon} alt="Toggle video" />
        </button>
        
        <button 
          className={`control-button ${isScreenSharing ? 'active' : ''}`}
          onClick={handleToggleScreenShare}
          disabled={callStatus === 'connection-lost'}
        >
          <img src={isScreenSharing ? StopScreenShareIcon : ScreenShareIcon} alt="Share screen" />
        </button>
        
        <button 
          className="control-button end-call"
          onClick={handleEndCall}
        >
          <img src={EndCallIcon} alt="End call" />
        </button>
      </div>
    </div>
  );
};

export default CallUI; 