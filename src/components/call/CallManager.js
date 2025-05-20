import React, { useEffect, useState, forwardRef, useImperativeHandle, useCallback } from 'react';
import { subscribeToUserPrivateQueue } from '../../services/api/WebSocketService';
import CallService, { CALL_TYPE, CALL_MESSAGE_TYPE } from '../../services/CallService';
import IncomingCallModal from './IncomingCallModal';
import OutgoingCallModal from './OutgoingCallModal';
import ActiveCallScreen from './ActiveCallScreen';
import '../../styles/components/call/CallManager.css';

const CallManager = forwardRef((props, ref) => {
  const [callState, setCallState] = useState({
    isIncomingCall: false,
    isOutgoingCall: false,
    isCallActive: false,
    callType: null,
    chatId: null,
    chatName: '',
    caller: null,
    isWaitingForOffer: false,
    phase: 1,
    isBusy: false
  });
  
  const [mediaState, setMediaState] = useState({
    localStream: null,
    remoteStream: null,
    isAudioMuted: false,
    isVideoDisabled: false
  });
  
  const handleCallMessage = useCallback(async (message) => {
    if (!message || !message.type) return;
    
    console.log('CallManager received message:', message);
    
    switch (message.type) {
      case CALL_MESSAGE_TYPE.CALL_NOTIFICATION:
        console.log('Received CALL_NOTIFICATION:', message);
        
        const callData = {
          chatId: message.chatId,
          callId: message.callId,
          callType: message.callType || 'AUDIO',
          senderId: message.senderId,
          senderName: message.senderName,
          phase: 1
        };
        
        if (message.callId) {
          console.log('Updating callId to:', message.callId);
          CallService.updateCallId(message.callId);
        }
        
        if (!callData.senderId && message.senderId) {
          callData.senderId = message.senderId;
          callData.senderName = message.senderName;
        }
        
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
        
        if (callState.isOutgoingCall) {
          CallService.handleCallAccepted(message);
        }
        break;
        
      case CALL_MESSAGE_TYPE.OFFER:
        console.log('Received OFFER:', message);
        
        try {
          await CallService.handleOffer(message);
          
          setMediaState({
            localStream: CallService.localStream,
            remoteStream: CallService.remoteStream,
            isAudioMuted: false,
            isVideoDisabled: false
          });
          
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
        
        if (message.formattedAnswer) {
          console.log('Using pre-formatted answer object:', message.formattedAnswer);
          CallService.handleRemoteAnswer(message.formattedAnswer);
        } else {
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


        setCallState(prev => ({
          ...prev,
          isOutgoingCall: false,
          phase: 3
        }));
        

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
        
      case 'CALL_BUSY':
        console.log('Received CALL_BUSY:', message);
        setCallState(prev => ({
          ...prev,
          isBusy: true
        }));
        setTimeout(() => {
          handleCallEnded();
        }, 2000);
        break;
        
      default:
        console.log('Unknown call message type:', message.type);
    }
  }, [callState.isOutgoingCall]);
  
  useImperativeHandle(ref, () => ({
    startCall: async (chatId, chatName, callType) => {
      await startCall(chatId, chatName, callType);
    },
    _handleCallMessage: (message) => {
      handleCallMessage(message);
    }
  }));
  
  useEffect(() => {
    console.log('CallManager: initializing event handlers');
    
    CallService.setEventHandlers({
      onIncomingCall: handleIncomingCall,
      onCallEstablished: handleCallEstablished,
      onCallEnded: handleCallEnded,
      onRemoteMediaStatusChange: handleRemoteMediaStatusChange
    });
    

    const privateQueueSubscription = subscribeToUserPrivateQueue(handleCallMessage);
    
    return () => {
      console.log('CallManager: cleaning up');
      //
      // // End any active calls when unmounting
      // if (callState.isCallActive || callState.isOutgoingCall) {
      //   CallService.endCall();
      // }
    };
  }, [handleCallMessage]);
  
  const handleIncomingCall = (callData) => {
    console.log('Handling incoming call:', callData);
    const { chatId, callType, caller, senderId } = callData;
    
    if (!caller || !caller.name) {
      console.error('Invalid caller data received:', callData);
      return;
    }
    

    const currentUserId = localStorage.getItem('userId');
    
    if ((senderId && currentUserId && senderId.toString() === currentUserId) ||
        (caller.id && currentUserId && caller.id.toString() === currentUserId)) {
      console.log('Ignoring own call notification in CallManager');
      return;
    }
    
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
  
  const handleCallEstablished = (remoteStream) => {
    console.log('Call established, received remote stream');
    setMediaState(prev => ({
      ...prev,
      remoteStream
    }));
    
    setCallState(prev => ({
      ...prev,
      isCallActive: true,
      isWaitingForOffer: false
    }));
  };
  
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
      phase: 1,
      isBusy: false
    });
    
    setMediaState({
      localStream: null,
      remoteStream: null,
      isAudioMuted: false,
      isVideoDisabled: false
    });
  };
  
  const handleRemoteMediaStatusChange = (data) => {
    console.log('Remote media status changed:', data);
  };
  
  const startCall = async (chatId, chatName, callType) => {
    console.log(`Starting ${callType} call to ${chatName} (${chatId})`);
    try {

      setCallState({
        isIncomingCall: false,
        isOutgoingCall: true,
        isCallActive: false,
        callType,
        chatId,
        chatName,
        caller: null,
        isWaitingForOffer: false,
        phase: 1,
        isBusy: false
      });
      
      await CallService.startCall(chatId, callType);
    } catch (error) {
      console.error('Failed to start call:', error);
      handleCallEnded();
    }
  };
  
  const acceptCall = async () => {
    console.log('Accepting incoming call (Phase 2)');
    try {

      await CallService.acceptCall();
      
      setCallState(prev => ({
        ...prev,
        isIncomingCall: false,
        isWaitingForOffer: true,
        phase: 2
      }));
      
    } catch (error) {
      console.error('Failed to accept call:', error);
      CallService.rejectCall();
      handleCallEnded();
    }
  };
  
  const rejectCall = () => {
    console.log('Rejecting incoming call');
    CallService.rejectCall();
    handleCallEnded();
  };
  
  const endCall = () => {
    console.log('Ending active call');
    CallService.endCall();
  };
  
  const cancelCall = () => {
    console.log('Canceling outgoing call');
    CallService.endCall();
  };
  
  const toggleAudio = () => {
    const isMuted = CallService.toggleAudio();
    setMediaState(prev => ({
      ...prev,
      isAudioMuted: isMuted
    }));
  };
  
  const toggleVideo = () => {
    const isDisabled = CallService.toggleVideo();
    setMediaState(prev => ({
      ...prev,
      isVideoDisabled: isDisabled
    }));
  };
  
  if (!callState.isIncomingCall && !callState.isOutgoingCall && !callState.isCallActive && !callState.isWaitingForOffer &&
      !(callState.phase === 3 && !mediaState.remoteStream)) {
    return null;
  }
  
  return (
    <div className="call-manager">
      {callState.isIncomingCall && (
        <IncomingCallModal 
          caller={callState.caller}
          callType={callState.callType}
          onAccept={acceptCall}
          onReject={rejectCall}
        />
      )}
      
      {callState.isOutgoingCall && (
        <OutgoingCallModal 
          chatName={callState.chatName}
          callType={callState.callType}
          onCancel={cancelCall}
          isBusy={callState.isBusy}
        />
      )}
      
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