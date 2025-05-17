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
    caller: null,
    isWaitingForOffer: false,
    phase: 1 // Track the current phase of the call
  });
  
  // Media state
  const [mediaState, setMediaState] = useState({
    localStream: null,
    remoteStream: null,
    isAudioMuted: false,
    isVideoDisabled: false
  });
  
  // Create a memoized handler function so it doesn't change on re-renders
  const handleCallMessage = useCallback(async (message) => {
    if (!message || !message.type) return;
    
    console.log('CallManager received message:', message);
    
    switch (message.type) {
      case CALL_MESSAGE_TYPE.CALL_NOTIFICATION:
        console.log('Received CALL_NOTIFICATION:', message);
        
        // Extract call data from message
        const callData = {
          chatId: message.chatId,
          callId: message.callId,
          callType: message.callType || 'AUDIO',
          senderId: message.senderId,
          senderName: message.senderName,
          phase: 1 // Phase 1: Initial notification
        };
        
        // First, update the callId in the CallService
        if (message.callId) {
          console.log('Updating callId to:', message.callId);
          CallService.updateCallId(message.callId);
        }
        
        // Make sure we have sender info
        if (!callData.senderId && message.senderId) {
          callData.senderId = message.senderId;
          callData.senderName = message.senderName;
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
        
      case 'CALL_ACCEPTED':
        console.log('Received CALL_ACCEPTED:', message);
        
        // If we're the call initiator, we need to start the WebRTC process
        if (callState.isOutgoingCall) {
          // Phase 3: Start WebRTC exchange
          CallService.handleCallAccepted(message);
        }
        break;
        
      case CALL_MESSAGE_TYPE.OFFER:
        console.log('Received OFFER:', message);
        
        try {
          // Now we're in Phase 3, process the offer to establish WebRTC connection
          await CallService.handleOffer(message);
          
          // Get the local and remote streams from CallService
          setMediaState({
            localStream: CallService.localStream,
            remoteStream: CallService.remoteStream,
            isAudioMuted: false,
            isVideoDisabled: false
          });
          
          // Update the call state to active
          setCallState(prev => ({
            ...prev,
            isIncomingCall: false,
            isWaitingForOffer: false,
            isCallActive: true,
            phase: 3
          }));
        } catch (error) {
          console.error('Error handling offer:', error);
          handleCallEnded();
        }
        break;
        
      case CALL_MESSAGE_TYPE.ANSWER:
        console.log('Received ANSWER:', message);
        
        // Check if we have a pre-formatted answer object
        if (message.formattedAnswer) {
          console.log('Using pre-formatted answer object:', message.formattedAnswer);
          CallService.handleRemoteAnswer(message.formattedAnswer);
        } else {
          // Create answer object if needed
          const answerData = message.payload || message;
          const answerObj = {
            type: 'answer',
            sdp: answerData.sdp || (answerData.payload && answerData.payload.sdp)
          };
          
          if (!answerObj.sdp) {
            console.error('No SDP found in ANSWER message:', message);
            break;
          }
          
          console.log('Formatted answer object:', answerObj);
          CallService.handleRemoteAnswer(answerObj);
        }

        // Don't mark call as active yet! We'll wait for ontrack event
        // Just mark that we're no longer in outgoing call mode
        setCallState(prev => ({
          ...prev,
          isOutgoingCall: false,
          // We'll leave isCallActive as false until we get remote stream
          phase: 3 // Still update the phase
        }));
        
        // Set localStream in the mediaState if it's not already set
        // This ensures we have the local stream UI when waiting
        if (CallService.localStream && !mediaState.localStream) {
          setMediaState(prev => ({
            ...prev,
            localStream: CallService.localStream
          }));
        }
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
  }, [callState.isOutgoingCall]);
  
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
      //
      // // End any active calls when unmounting
      // if (callState.isCallActive || callState.isOutgoingCall) {
      //   CallService.endCall();
      // }
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
    
    // Now mark the call as active since we have the remote stream
    setCallState(prev => ({
      ...prev,
      isCallActive: true,
      isWaitingForOffer: false
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
      caller: null,
      isWaitingForOffer: false,
      phase: 1
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
      // In Phase 1, we don't initialize media yet
      // We just update the UI and send the call start notification
      setCallState({
        isIncomingCall: false,
        isOutgoingCall: true,
        isCallActive: false,
        callType,
        chatId,
        chatName,
        caller: null,
        isWaitingForOffer: false,
        phase: 1
      });
      
      // This will only send the call notification, not create media streams yet
      await CallService.startCall(chatId, callType);
    } catch (error) {
      console.error('Failed to start call:', error);
      handleCallEnded();
    }
  };
  
  // Accept incoming call
  const acceptCall = async () => {
    console.log('Accepting incoming call (Phase 2)');
    try {
      // In Phase 2, we don't initialize media yet
      // We just send the accept message
      await CallService.acceptCall();
      
      // Update UI to show we're waiting for the offer
      setCallState(prev => ({
        ...prev,
        isIncomingCall: false,
        isWaitingForOffer: true,
        phase: 2
      }));
      
      // The media will be initialized when we receive the offer (Phase 3)
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
  if (!callState.isIncomingCall && !callState.isOutgoingCall && !callState.isCallActive && !callState.isWaitingForOffer &&
      !(callState.phase === 3 && !mediaState.remoteStream)) {
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
      
      {/* Waiting for Offer Screen */}
      {callState.isWaitingForOffer && (
        <div className="call-waiting-screen">
          <div className="call-waiting-container">
            <div className="call-waiting-status">
              <span className="call-waiting-spinner"></span>
              <h3>Connecting call...</h3>
              <p>Waiting for {callState.chatName} to connect</p>
            </div>
            <button className="call-end-button" onClick={endCall}>
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {/* Connecting Screen (post-ANSWER but pre-remote-track) */}
      {callState.phase === 3 && !mediaState.remoteStream && !callState.isCallActive && (
        <div className="call-waiting-screen">
          <div className="call-waiting-container">
            <div className="call-waiting-status">
              <span className="call-waiting-spinner"></span>
              <h3>Call connecting...</h3>
              <p>Establishing media connection</p>
            </div>
            <button className="call-end-button" onClick={endCall}>
              Cancel
            </button>
          </div>
        </div>
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