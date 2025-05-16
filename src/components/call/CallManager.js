import React, { useEffect, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import { subscribeToUserPrivateQueue } from '../../services/api/WebSocketService';
import CallService, { CALL_TYPE, CALL_MESSAGE_TYPE } from '../../services/CallService';
import IncomingCallModal from './IncomingCallModal';
import OutgoingCallModal from './OutgoingCallModal';
import ActiveCallScreen from './ActiveCallScreen';
import '../../styles/components/call/CallManager.css';

const CallManager = forwardRef((props, ref) => {
  // Call state
  const [callState, setCallState] = useState({
    isIncomingCall: false,
    isOutgoingCall: false,
    isCallActive: false,
    callType: null,
    chatId: null,
    chatName: '',
    caller: null
  });
  
  // Media state
  const [mediaState, setMediaState] = useState({
    localStream: null,
    remoteStream: null,
    isAudioMuted: false,
    isVideoDisabled: false
  });
  
  // Create a memoized handler function so it doesn't change on re-renders
  const handleCallMessage = useCallback((message) => {
    if (!message || !message.type) return;
    
    console.log('CallManager received message:', message);
    
    switch (message.type) {
      case CALL_MESSAGE_TYPE.CALL_NOTIFICATION:
        // Handle call notification (similar to OFFER but without SDP)
        console.log('Received CALL_NOTIFICATION:', message);
        
        // Extract the payload depending on the message format
        const callData = message.payload || message;
        
        // If the payload doesn't have the necessary call info but the parent message does
        if (!callData.chatId && message.chatId) {
          callData.chatId = message.chatId;
        }
        if (!callData.callId && message.callId) {
          callData.callId = message.callId;
        }
        if (!callData.senderId && message.senderId) {
          callData.senderId = message.senderId;
          callData.senderName = message.senderName;
        }
        
        // Check for SDP in different locations
        if (!callData.sdp && message.payload && message.payload.sdp) {
          callData.sdp = message.payload.sdp;
        }
        
        // Ensure caller object exists for UI
        if (!callData.caller && callData.senderId) {
          callData.caller = {
            id: callData.senderId,
            name: callData.senderName || 'Unknown Caller'
          };
          console.log('Created caller object:', callData.caller);
        }
        
        CallService.handleIncomingCall(callData);
        break;
        
      case CALL_MESSAGE_TYPE.OFFER:
        console.log('Received OFFER:', message);
        const offerData = message.payload || message;
        
        // Ensure caller object exists for OFFER messages too
        if (!offerData.caller && offerData.senderId) {
          offerData.caller = {
            id: offerData.senderId,
            name: offerData.senderName || 'Unknown Caller'
          };
          console.log('Created caller object for OFFER:', offerData.caller);
        }
        
        CallService.handleIncomingCall(offerData);
        break;
        
      case CALL_MESSAGE_TYPE.ANSWER:
        console.log('Received ANSWER:', message);
        
        // Проверяем, есть ли уже предварительно отформатированный объект ответа из usersApi
        if (message.formattedAnswer) {
          console.log('Using pre-formatted answer object:', message.formattedAnswer);
          CallService.handleRemoteAnswer(message.formattedAnswer);
        } else {
          // Если нет, создаем его здесь (как запасной вариант)
          const answerData = message.payload || message;
          
          // Создаем правильный объект RTCSessionDescription
          const answerObj = {
            type: 'answer',  // это должно быть строчными буквами для WebRTC
            sdp: answerData.sdp || (answerData.payload && answerData.payload.sdp)
          };
          
          // Проверяем наличие SDP
          if (!answerObj.sdp) {
            console.error('No SDP found in ANSWER message:', message);
            break;
          }
          
          console.log('Formatted answer object:', answerObj);
          CallService.handleRemoteAnswer(answerObj);
        }
        
        setCallState(prev => ({
          ...prev,
          isOutgoingCall: false,
          isCallActive: true
        }));
        break;
        
      case CALL_MESSAGE_TYPE.ICE_CANDIDATE:
        console.log('Received ICE_CANDIDATE:', message);
        const candidateData = message.payload || message;
        CallService.handleRemoteIceCandidate(candidateData.candidate);
        break;
        
      case CALL_MESSAGE_TYPE.CALL_ENDED:
        console.log('Received CALL_ENDED:', message);
        CallService.handleCallEnded();
        break;
        
      case CALL_MESSAGE_TYPE.MEDIA_STATUS:
        console.log('Received MEDIA_STATUS:', message);
        const mediaData = message.payload || message;
        CallService.handleMediaStatusChange(mediaData);
        break;
        
      default:
        console.log('Unknown call message type:', message.type);
    }
  }, []);
  
  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    startCall: async (chatId, chatName, callType) => {
      await startCall(chatId, chatName, callType);
    },
    _handleCallMessage: (message) => {
      handleCallMessage(message);
    }
  }));
  
  // Initialize call service event handlers
  useEffect(() => {
    console.log('CallManager: initializing event handlers');
    
    // Set up the call service event handlers
    CallService.setEventHandlers({
      onIncomingCall: handleIncomingCall,
      onCallEstablished: handleCallEstablished,
      onCallEnded: handleCallEnded,
      onRemoteMediaStatusChange: handleRemoteMediaStatusChange
    });
    
    // Subscribe to private queue for call events
    // This is a component-level subscription as a fallback
    // The main subscription is now in App.js
    const privateQueueSubscription = subscribeToUserPrivateQueue(handleCallMessage);
    
    // Cleanup on unmount
    return () => {
      console.log('CallManager: cleaning up');
      
      // End any active calls when unmounting
      if (callState.isCallActive || callState.isOutgoingCall) {
        CallService.endCall();
      }
    };
  }, [handleCallMessage]);
  
  // Handle incoming call
  const handleIncomingCall = (callData) => {
    console.log('Handling incoming call:', callData);
    const { chatId, callType, caller, senderId } = callData;
    
    // Ensure caller data is valid to prevent UI errors
    if (!caller || !caller.name) {
      console.error('Invalid caller data received:', callData);
      return;
    }
    
    // Проверяем, не является ли это собственным вызовом
    // Получаем ID текущего пользователя из localStorage или другого источника
    const currentUserId = localStorage.getItem('userId');
    
    // Если текущий пользователь является инициатором вызова, игнорируем
    if ((senderId && currentUserId && senderId.toString() === currentUserId) || 
        (caller.id && currentUserId && caller.id.toString() === currentUserId)) {
      console.log('Ignoring own call notification in CallManager');
      return;
    }
    
    // Check if we're already handling a call
    if (callState.isIncomingCall || callState.isOutgoingCall || callState.isCallActive) {
      console.log('Already handling a call - ignoring new incoming call');
      return;
    }
    
    console.log('Setting call state to show incoming call UI');
    setCallState({
      isIncomingCall: true,
      isOutgoingCall: false,
      isCallActive: false,
      callType: callType || 'AUDIO',
      chatId,
      chatName: caller.name,
      caller
    });
  };
  
  // Handle call established
  const handleCallEstablished = (remoteStream) => {
    console.log('Call established, received remote stream');
    setMediaState(prev => ({
      ...prev,
      remoteStream
    }));
  };
  
  // Handle call ended
  const handleCallEnded = () => {
    console.log('Call ended');
    setCallState({
      isIncomingCall: false,
      isOutgoingCall: false,
      isCallActive: false,
      callType: null,
      chatId: null,
      chatName: '',
      caller: null
    });
    
    setMediaState({
      localStream: null,
      remoteStream: null,
      isAudioMuted: false,
      isVideoDisabled: false
    });
  };
  
  // Handle remote media status change
  const handleRemoteMediaStatusChange = (data) => {
    console.log('Remote media status changed:', data);
    // You can add UI indicators for remote media status if needed
  };
  
  // Start a call
  const startCall = async (chatId, chatName, callType) => {
    console.log(`Starting ${callType} call to ${chatName} (${chatId})`);
    try {
      // Initialize local media before creating peer connection
      const localStream = await CallService.initializeUserMedia(callType);
      
      setMediaState(prev => ({
        ...prev,
        localStream
      }));
      
      setCallState({
        isIncomingCall: false,
        isOutgoingCall: true,
        isCallActive: false,
        callType,
        chatId,
        chatName,
        caller: null
      });
      
      await CallService.startCall(chatId, callType);
    } catch (error) {
      console.error('Failed to start call:', error);
      handleCallEnded();
    }
  };
  
  // Accept incoming call
  const acceptCall = async () => {
    console.log('Accepting incoming call');
    try {
      // Initialize local media and accept the call
      const localStream = await CallService.initializeUserMedia(callState.callType);
      
      setMediaState(prev => ({
        ...prev,
        localStream
      }));
      
      await CallService.acceptCall();
      
      setCallState(prev => ({
        ...prev,
        isIncomingCall: false,
        isCallActive: true
      }));
    } catch (error) {
      console.error('Failed to accept call:', error);
      CallService.rejectCall();
      handleCallEnded();
    }
  };
  
  // Reject incoming call
  const rejectCall = () => {
    console.log('Rejecting incoming call');
    CallService.rejectCall();
    handleCallEnded();
  };
  
  // End active call
  const endCall = () => {
    console.log('Ending active call');
    CallService.endCall();
  };
  
  // Cancel outgoing call
  const cancelCall = () => {
    console.log('Canceling outgoing call');
    CallService.endCall();
  };
  
  // Toggle audio mute
  const toggleAudio = () => {
    const isMuted = CallService.toggleAudio();
    setMediaState(prev => ({
      ...prev,
      isAudioMuted: isMuted
    }));
  };
  
  // Toggle video
  const toggleVideo = () => {
    const isDisabled = CallService.toggleVideo();
    setMediaState(prev => ({
      ...prev,
      isVideoDisabled: isDisabled
    }));
  };
  
  // Render null if no call activity
  if (!callState.isIncomingCall && !callState.isOutgoingCall && !callState.isCallActive) {
    return null;
  }
  
  return (
    <div className="call-manager">
      {/* Incoming Call Modal */}
      {callState.isIncomingCall && (
        <IncomingCallModal 
          caller={callState.caller}
          callType={callState.callType}
          onAccept={acceptCall}
          onReject={rejectCall}
        />
      )}
      
      {/* Outgoing Call Modal */}
      {callState.isOutgoingCall && (
        <OutgoingCallModal 
          chatName={callState.chatName}
          callType={callState.callType}
          onCancel={cancelCall}
        />
      )}
      
      {/* Active Call Screen */}
      {callState.isCallActive && (
        <ActiveCallScreen 
          remoteStream={mediaState.remoteStream}
          localStream={mediaState.localStream}
          callType={callState.callType}
          chatName={callState.chatName}
          isAudioMuted={mediaState.isAudioMuted}
          isVideoDisabled={mediaState.isVideoDisabled}
          onToggleAudio={toggleAudio}
          onToggleVideo={toggleVideo}
          onEndCall={endCall}
          callService={CallService}
        />
      )}
    </div>
  );
});

export default CallManager; 