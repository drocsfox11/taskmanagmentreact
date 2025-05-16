import { getStompClient } from './api/WebSocketService';
import { getCurrentUserFromCache } from './api/usersApi';

// Configuration for ICE servers (STUN/TURN)
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },

    {
      urls: 'turn:relay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:relay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ]
};

// Call types
export const CALL_TYPE = {
  AUDIO: 'AUDIO',
  VIDEO: 'VIDEO'
};

// Call message types
export const CALL_MESSAGE_TYPE = {
  OFFER: 'OFFER',
  ANSWER: 'ANSWER',
  ICE_CANDIDATE: 'ICE_CANDIDATE',
  CALL_ENDED: 'CALL_ENDED',
  MEDIA_STATUS: 'MEDIA_STATUS',
  CALL_NOTIFICATION: 'CALL_NOTIFICATION'
};

// Media status types
export const MEDIA_STATUS_TYPE = {
  TOGGLE_AUDIO: 'TOGGLE_AUDIO',
  TOGGLE_VIDEO: 'TOGGLE_VIDEO'
};

class CallService {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.currentCallData = null;
    this.onIncomingCall = null;
    this.onCallEstablished = null;
    this.onCallEnded = null;
    this.onRemoteMediaStatusChange = null;
    this.iceCandidateQueue = [];
    this.pendingIceCandidates = []; // Queue for candidates waiting for callId
  }

  /**
   * Set event handlers for call events
   */
  setEventHandlers(handlers) {
    const { onIncomingCall, onCallEstablished, onCallEnded, onRemoteMediaStatusChange } = handlers;
    this.onIncomingCall = onIncomingCall;
    this.onCallEstablished = onCallEstablished;
    this.onCallEnded = onCallEnded;
    this.onRemoteMediaStatusChange = onRemoteMediaStatusChange;
  }

  /**
   * Initialize user media devices (camera and/or microphone)
   */
  async initializeUserMedia(callType = CALL_TYPE.AUDIO) {
    try {
      const constraints = {
        audio: true,
        video: callType === CALL_TYPE.VIDEO
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.localStream = stream;
      
      // Add listeners to detect mute events on local audio track
      const localAudioTrack = stream.getAudioTracks()[0];
      if (localAudioTrack) {
        console.log('local track muted?', localAudioTrack.muted, 'enabled?', localAudioTrack.enabled);
        localAudioTrack.onmute = () => console.log('LOCAL track muted');
        localAudioTrack.onunmute = () => console.log('LOCAL track un-muted');
        
        // Monitor audio levels to detect if microphone is actually capturing sound
        try {
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const source = audioContext.createMediaStreamSource(stream);
          const analyser = audioContext.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          
          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          
          const checkAudioLevels = () => {
            if (!this.localStream) {
              console.log('Local stream gone, stopping audio monitoring');
              return;
            }
            
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            
            console.log(`Local audio level: ${average.toFixed(2)}`);
            if (average < 1) {
              console.warn('WARNING: Very low or no audio detected from microphone');
            }
            
            // Check again after delay
            setTimeout(checkAudioLevels, 2000);
          };
          
          // Start monitoring after a short delay
          setTimeout(checkAudioLevels, 1000);
        } catch (e) {
          console.error('Could not create audio analyser:', e);
        }
      }
      
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }

  /**
   * Release user media devices
   */
  stopUserMedia() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
  }

  /**
   * Initialize peer connection
   */
  initializePeerConnection() {
    this.peerConnection = new RTCPeerConnection(ICE_SERVERS);
    
    // Add local tracks to the peer connection
    if (this.localStream) {
      console.log('Adding local tracks to peer connection:', 
        this.localStream.getTracks().map(t => `${t.kind}:${t.enabled}:${t.readyState}`).join(', '));
      
      this.localStream.getTracks().forEach(track => {
        console.log(`Adding ${track.kind} track to peer connection`);
        this.peerConnection.addTrack(track, this.localStream);
      });
    } else {
      console.error('No local stream available when initializing peer connection');
    }
    
    // Remote stream handling
    this.remoteStream = new MediaStream();
    console.log('Created new empty MediaStream for remote tracks');
    
    // Log selected ICE candidate pair
    const logSelectedCandidatePair = async () => {
      try {
        const stats = await this.peerConnection.getStats();
        stats.forEach(report => {
          if (report.type === 'transport') {
            console.log('WebRTC transport:', report);
          } else if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            console.log('Selected ICE candidate pair:', report);
          }
        });
      } catch (e) {
        console.error('Error getting stats:', e);
      }
    };
    
    // Monitor ICE connection state
    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection.iceConnectionState;
      console.log(`ICE connection state changed: ${state}`);
      
      if (state === 'connected' || state === 'completed') {
        logSelectedCandidatePair();
      } else if (state === 'failed') {
        console.error('ICE connection failed - trying to restart ICE');
        try {
          this.peerConnection.restartIce();
        } catch (e) {
          console.error('Failed to restart ICE:', e);
        }
      }
    };
    
    // Важно: используем ontrack вместо устаревших методов
    this.peerConnection.ontrack = (event) => {
      console.log(`Received ${event.track.kind} track from remote peer:`, 
        event.track.readyState, event.track.enabled);
      
      // Подробное логирование входящего трека
      console.log('Track details:', {
        kind: event.track.kind,
        id: event.track.id,
        readyState: event.track.readyState,
        enabled: event.track.enabled,
        muted: event.track.muted,
        hasAudioLevel: typeof event.track.getSettings().audioLevel !== 'undefined',
        settings: event.track.getSettings(),
        constraints: event.track.getConstraints()
      });
      
      // Add mute/unmute listeners to the remote track
      if (event.track.kind === 'audio') {
        console.log('remote muted?', event.track.muted, 'enabled?', event.track.enabled);
        event.track.onmute = () => console.log('REMOTE track muted');
        event.track.onunmute = () => {
          console.log('REMOTE track un-muted');
          // Try to re-establish audio when unmuted
          this.ensureAudioEnabled();
        }
      }
      
      // Логируем информацию о потоке, к которому относится трек
      console.log('Track associated stream info:', {
        streamId: event.streams[0]?.id || 'no stream',
        streamTracks: event.streams[0]?.getTracks().length || 0,
        streamActive: event.streams[0]?.active || false
      });
      
      // Немедленно добавляем трек в удаленный поток
      this.remoteStream.addTrack(event.track);
      
      // Логируем обновленный remoteStream
      console.log('Updated remoteStream:', {
        id: this.remoteStream.id,
        active: this.remoteStream.active,
        tracks: this.remoteStream.getTracks().map(t => ({
          kind: t.kind,
          id: t.id,
          enabled: t.enabled,
          readyState: t.readyState,
          muted: t.muted
        }))
      });
      
      // Check for transceivers and their status
      const transceivers = this.peerConnection.getTransceivers();
      console.log('Current transceivers:', transceivers.map(t => ({
        mid: t.mid,
        direction: t.direction,
        currentDirection: t.currentDirection,
        stopped: t.stopped
      })));
      
      // Обеспечиваем, что у аудиодорожки включен звук
      if (event.track.kind === 'audio') {
        event.track.enabled = true;
        console.log('Ensure audio track is enabled:', event.track.enabled);
      }
      
      // Отправляем обновленный поток в UI
      if (this.onCallEstablished) {
        console.log('Calling onCallEstablished with remote stream containing tracks:', 
          this.remoteStream.getTracks().length);
        this.onCallEstablished(this.remoteStream);
      }
    };
    
    // ICE candidate handling
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendIceCandidate(event.candidate);
      }
    };
    
    // Connection state change
    this.peerConnection.onconnectionstatechange = () => {
      console.log(`Connection state changed: ${this.peerConnection.connectionState}`);
      
      if (this.peerConnection.connectionState === 'connected') {
        console.log('Peer connection established - checking streams and tracks');
        
        // Подробно логируем состояние соединения
        console.log('Connection details:', {
          iceConnectionState: this.peerConnection.iceConnectionState,
          iceGatheringState: this.peerConnection.iceGatheringState,
          signalingState: this.peerConnection.signalingState,
          connectionState: this.peerConnection.connectionState
        });
        
        // Перечисляем все приемники (receivers)
        const receivers = this.peerConnection.getReceivers();
        console.log('Active receivers:', receivers.length);
        receivers.forEach((receiver, idx) => {
          console.log(`Receiver ${idx}:`, {
            trackKind: receiver.track?.kind || 'no track',
            trackId: receiver.track?.id || 'no id',
            trackEnabled: receiver.track?.enabled || false,
            params: receiver.getParameters()
          });
        });
        
        // Проверка локальных треков
        if (this.localStream) {
          console.log('Local tracks:', 
            this.localStream.getTracks().map(t => `${t.kind}:${t.enabled}:${t.id}`).join(', '));
        }
        
        // Проверка удаленных треков
        if (this.remoteStream) {
          console.log('Remote stream details:', {
            id: this.remoteStream.id,
            active: this.remoteStream.active,
            tracks: this.remoteStream.getTracks().map(t => ({
              kind: t.kind,
              id: t.id,
              enabled: t.enabled,
              readyState: t.readyState,
              muted: t.muted
            }))
          });
          
          // Попытка реактивировать аудиотреки, если они есть
          const audioTracks = this.remoteStream.getAudioTracks();
          if (audioTracks.length > 0) {
            audioTracks.forEach(track => {
              if (!track.enabled) {
                console.log(`Re-enabling audio track ${track.id}`);
                track.enabled = true;
              }
            });
          } else {
            console.warn('No audio tracks found in remote stream after connection!');
          }
        } else {
          console.warn('No remote stream available after connection!');
        }
      }
      
      if (this.peerConnection.connectionState === 'disconnected' || 
          this.peerConnection.connectionState === 'failed') {
        this.endCall();
      }
    };
    
    // Process any queued ICE candidates
    this.processIceCandidateQueue();
  }

  /**
   * Process queued ICE candidates
   */
  processIceCandidateQueue() {
    if (this.peerConnection && this.iceCandidateQueue.length > 0) {
      this.iceCandidateQueue.forEach(candidate => {
        this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      });
      this.iceCandidateQueue = [];
    }
  }

  /**
   * Start a call
   */
  async startCall(chatId, callType = CALL_TYPE.AUDIO) {
    try {
      // Make sure we have a clean state before starting a new call
      if (this.currentCallData) {
        console.log('Cleaning up previous call state before starting a new call');
        this.cleanupCall();
      }
      
      console.log(`Starting new ${callType} call to chat ${chatId}`);
      await this.initializeUserMedia(callType);
      this.initializePeerConnection();
      
      // Create offer
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      
      // Save current call data
      this.currentCallData = {
        chatId,
        callType,
        isInitiator: true,
        offer // Store the offer in current call data
      };
      
      console.log('Call initialized with data:', this.currentCallData);
      
      // Send offer to signaling server
      this.sendCallOffer(chatId, callType, offer);
      
      return true;
    } catch (error) {
      console.error('Error starting call:', error);
      this.cleanupCall();
      throw error;
    }
  }

  /**
   * Handle incoming call
   */
  async handleIncomingCall(callData) {
    console.log('CallService.handleIncomingCall called with:', callData);
    
    // Early validation
    if (!callData || !callData.chatId) {
      console.error('Invalid call data received (missing chatId):', callData);
      return;
    }
    
    // Create caller object if missing but we have senderId/senderName
    if (!callData.caller && callData.senderId) {
      callData.caller = {
        id: callData.senderId,
        name: callData.senderName || 'Unknown Caller'
      };
      console.log('Created caller object in CallService:', callData.caller);
    }
    
    // Still require caller at this point
    if (!callData.caller) {
      console.error('Invalid call data received (missing caller and senderId):', callData);
      return;
    }
    
    // Проверяем, не является ли это собственным вызовом
    let currentUserId = localStorage.getItem('userId');
    
    // Более надежный способ определения текущего пользователя
    const currentUser = getCurrentUserFromCache();
    if (currentUser && currentUser.id) {
      currentUserId = currentUser.id.toString();
    }
    
    // Проверяем ID отправителя против ID текущего пользователя
    if (callData.senderId && currentUserId && 
        (callData.senderId.toString() === currentUserId || 
         callData.senderId === parseInt(currentUserId))) {
      console.log('Ignoring own call in CallService');
      return;
    }
    
    // Check if we already have an active call
    if (this.currentCallData && (this.currentCallData.isActive || this.currentCallData.isProcessing)) {
      console.log('Already processing a call, ignoring new incoming call');
      return;
    }
    
    const { chatId, callType = 'AUDIO', offer, caller, sdp, callId } = callData;
    
    console.log(`Processing incoming ${callType} call from ${caller.name} in chat ${chatId}, callId: ${callId}`);
    console.log(`SDP available: ${!!sdp}, length: ${sdp ? sdp.length : 0}`);
    
    // Create a proper offer object if we only have SDP string
    let offerObj = offer;
    if (!offerObj && sdp) {
      offerObj = {
        type: 'offer',
        sdp: sdp
      };
      console.log('Created offer object from SDP string');
    }
    
    // Check if we have an offer to work with
    if (!offerObj) {
      console.error('No offer or SDP available for incoming call - cannot establish connection');
      
      // We'll still save the call data for the UI, but it won't have an offer
      console.warn('Call will be displayed but cannot be accepted without an offer');
    }
    
    // Save current call data - handle both formats (OFFER and CALL_NOTIFICATION)
    this.currentCallData = {
      chatId,
      callType,
      isInitiator: false,
      caller,
      offer: offerObj,
      callId, // Store the callId we received from the server
      isProcessing: true // Mark as being processed to avoid duplicate notifications
    };
    
    console.log('Saved call data, triggering UI update:', this.currentCallData);
    
    if (this.onIncomingCall) {
      console.log('Calling onIncomingCall handler with data:', this.currentCallData);
      this.onIncomingCall(this.currentCallData);
    } else {
      console.error('No incoming call handler registered - call window will not appear');
    }
  }

  /**
   * Handle remote SDP answer
   */
  async handleRemoteAnswer(answer) {
    if (!this.peerConnection) {
      console.error('No peer connection established');
      return;
    }
    
    try {
      // Проверка валидности объекта ответа
      if (!answer) {
        console.error('Invalid answer object: null or undefined');
        return;
      }
      
      if (!answer.type || !answer.sdp) {
        console.error('Invalid answer object format. Missing type or sdp:', answer);
        return;
      }
      
      console.log('Setting remote description with answer:', answer);
      console.log('SDP content length:', answer.sdp.length);
      console.log('SDP preview:', answer.sdp.substring(0, 100) + '...');
      
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      console.log('Remote description successfully set');
      
      // Логируем состояние соединения после установки удаленного описания
      console.log('Connection state after setting remote description:', {
        iceConnectionState: this.peerConnection.iceConnectionState,
        iceGatheringState: this.peerConnection.iceGatheringState,
        signalingState: this.peerConnection.signalingState,
        connectionState: this.peerConnection.connectionState
      });
      
      // Логируем transceiver'ы и их направления
      const transceivers = this.peerConnection.getTransceivers();
      console.log('Transceivers after setting remote description:', 
        transceivers.map(t => ({
          mid: t.mid,
          currentDirection: t.currentDirection,
          direction: t.direction,
          stopped: t.stopped
        }))
      );
    } catch (error) {
      console.error('Error setting remote description:', error);
    }
  }

  /**
   * Handle remote ICE candidate
   */
  handleRemoteIceCandidate(candidate) {
    if (this.peerConnection && this.peerConnection.remoteDescription) {
      this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } else {
      this.iceCandidateQueue.push(candidate);
    }
  }

  /**
   * Handle call ended event
   */
  handleCallEnded() {
    this.cleanupCall();
    
    if (this.onCallEnded) {
      this.onCallEnded();
    }
  }

  /**
   * Handle media status change
   */
  handleMediaStatusChange(data) {
    if (this.onRemoteMediaStatusChange) {
      this.onRemoteMediaStatusChange(data);
    }
  }

  /**
   * Toggle audio (mute/unmute)
   */
  toggleAudio() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        
        // Notify other party about media status change
        this.sendMediaStatus(MEDIA_STATUS_TYPE.TOGGLE_AUDIO, !audioTrack.enabled);
        
        return !audioTrack.enabled; // Return the new muted state
      }
    }
    return false;
  }

  /**
   * Toggle video (enable/disable)
   */
  toggleVideo() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        
        // Notify other party about media status change
        this.sendMediaStatus(MEDIA_STATUS_TYPE.TOGGLE_VIDEO, !videoTrack.enabled);
        
        return !videoTrack.enabled; // Return the new disabled state
      }
    }
    return false;
  }

  /**
   * Send call offer to signaling server
   */
  sendCallOffer(chatId, callType, offer) {
    const stompClient = getStompClient();
    if (stompClient && stompClient.connected) {
      stompClient.publish({
        destination: '/app/call/start',
        body: JSON.stringify({
          chatId,
          callType,
          offer,
          sdp: offer.sdp // Explicitly include the SDP for CALL_NOTIFICATION
        })
      });
    }
  }

  /**
   * Send call answer to signaling server
   */
  sendCallAnswer(answer) {
    const stompClient = getStompClient();
    if (stompClient && stompClient.connected && this.currentCallData) {
      if (!this.currentCallData.callId) {
        console.error('Cannot send call answer: callId is missing');
        return;
      }
      
      stompClient.publish({
        destination: '/app/call/answer',
        body: JSON.stringify({
          chatId: this.currentCallData.chatId,
          callId: this.currentCallData.callId, // Include the callId from server
          answer
        })
      });
      
      console.log('Sent call answer with callId:', this.currentCallData.callId);
    } else {
      console.error('Cannot send call answer: no current call data or STOMP connection');
    }
  }

  /**
   * Send ICE candidate to signaling server
   */
  sendIceCandidate(candidate) {
    const stompClient = getStompClient();
    
    // Store candidate if we have no connection or call data
    if (!stompClient || !stompClient.connected || !this.currentCallData) {
      console.warn('Queueing ICE candidate: no STOMP connection or call data');
      this.pendingIceCandidates.push(candidate);
      return;
    }
    
    // If no callId yet, queue the candidate for later
    if (!this.currentCallData.callId) {
      console.warn('Queueing ICE candidate: waiting for callId');
      this.pendingIceCandidates.push(candidate);
      return;
    }
    
    // Now we can send the candidate
    stompClient.publish({
      destination: '/app/call/ice-candidate',
      body: JSON.stringify({
        chatId: this.currentCallData.chatId,
        callId: this.currentCallData.callId, // Include the callId from server
        candidate
      })
    });
    
    console.log(`Sent ICE candidate with callId: ${this.currentCallData.callId}`);
  }
  
  /**
   * Send any queued ICE candidates now that we have a callId
   */
  sendQueuedIceCandidates() {
    if (!this.currentCallData) {
      console.warn('Cannot send queued ICE candidates: no current call data');
      return;
    }
    
    if (!this.currentCallData.callId) {
      console.warn('Cannot send queued ICE candidates: callId is missing');
      return;
    }
    
    if (this.pendingIceCandidates.length === 0) {
      console.log('No queued ICE candidates to send');
      return;
    }
    
    console.log(`Sending ${this.pendingIceCandidates.length} queued ICE candidates with callId: ${this.currentCallData.callId}`);
    
    const stompClient = getStompClient();
    if (stompClient && stompClient.connected) {
      // Send all queued candidates
      this.pendingIceCandidates.forEach(candidate => {
        stompClient.publish({
          destination: '/app/call/ice-candidate',
          body: JSON.stringify({
            chatId: this.currentCallData.chatId,
            callId: this.currentCallData.callId,
            candidate
          })
        });
      });
      
      console.log(`Sent ${this.pendingIceCandidates.length} queued ICE candidates with callId: ${this.currentCallData.callId}`);
      this.pendingIceCandidates = []; // Clear the queue
    } else {
      console.error('Cannot send queued ICE candidates: no STOMP connection');
    }
  }

  /**
   * Send media status change to signaling server
   */
  sendMediaStatus(statusType, isDisabled) {
    const stompClient = getStompClient();
    if (stompClient && stompClient.connected && this.currentCallData) {
      if (!this.currentCallData.callId) {
        console.error('Cannot send media status: callId is missing');
        return;
      }
      
      stompClient.publish({
        destination: '/app/call/media-status',
        body: JSON.stringify({
          chatId: this.currentCallData.chatId,
          callId: this.currentCallData.callId, // Include the callId from server
          statusType,
          isDisabled
        })
      });
      
      console.log('Sent media status with callId:', this.currentCallData.callId);
    } else {
      console.error('Cannot send media status: no current call data or STOMP connection');
    }
  }

  /**
   * End active call
   */
  endCall() {
    if (!this.currentCallData) {
      console.warn('No call to end');
      return;
    }
    
    console.log('Ending call');
    const chatId = this.currentCallData.chatId;
    const callId = this.currentCallData.callId;
    
    const stompClient = getStompClient();
    if (stompClient && stompClient.connected) {
      // Still try to end the call even if we don't have a callId
      // but log a warning
      if (!callId) {
        console.warn('Ending call without callId');
      }
      
      stompClient.publish({
        destination: '/app/call/end',
        body: JSON.stringify({
          chatId: chatId,
          callId: callId // Include the callId if available
        })
      });
      
      console.log('Sent end call request');
    }
    
    this.cleanupCall();
    
    if (this.onCallEnded) {
      this.onCallEnded();
    }
  }

  /**
   * Clean up call resources
   */
  cleanupCall() {
    console.log('Cleaning up call resources and resetting state');
    this.stopUserMedia();
    
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    this.remoteStream = null;
    this.currentCallData = null;
    this.iceCandidateQueue = [];
    this.pendingIceCandidates = []; // Clear pending candidates for the next call
    
    console.log('Call state reset complete');
  }

  /**
   * Accept incoming call
   */
  async acceptCall() {
    try {
      if (!this.currentCallData) {
        throw new Error('No active incoming call');
      }
      
      console.log('Accepting call with data:', this.currentCallData);
      
      // Check if we have an offer to work with
      if (!this.currentCallData.offer) {
        console.error('Cannot accept call: No offer or SDP available');
        throw new Error('Cannot accept call: Missing offer/SDP data required for WebRTC connection');
      }
      
      // Инициализируем медиа устройства перед созданием соединения
      const stream = await this.initializeUserMedia(this.currentCallData.callType);
      console.log('Media initialized with tracks:', 
        stream.getTracks().map(t => `${t.kind}:${t.enabled}`).join(', '));
      
      // Подробно логируем полученные треки
      stream.getTracks().forEach((track, idx) => {
        console.log(`Local track ${idx} details:`, {
          kind: track.kind,
          id: track.id,
          enabled: track.enabled,
          readyState: track.readyState,
          muted: track.muted,
          constraints: track.getConstraints(),
          settings: track.getSettings()
        });
      });
        
      // Проверяем аудиодорожку и явно включаем ее
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = true;
        console.log('Explicitly enabled audio track:', audioTrack.enabled);
      } else {
        console.warn('No audio track found in local stream');
      }
      
      // Инициализируем peer connection
      this.initializePeerConnection();
      
      // Логируем содержимое offer SDP
      console.log('Offer SDP length:', this.currentCallData.offer.sdp.length);
      console.log('Offer SDP preview:', this.currentCallData.offer.sdp.substring(0, 100) + '...');
      
      // Set remote description (offer)
      if (this.currentCallData.offer) {
        console.log('Setting remote description with offer:', this.currentCallData.offer);
        await this.peerConnection.setRemoteDescription(
          new RTCSessionDescription(this.currentCallData.offer)
        );
        console.log('Remote description (offer) set successfully');
        
        // Логируем состояние соединения после установки удаленного описания
        console.log('Connection state after setting remote offer:', {
          iceConnectionState: this.peerConnection.iceConnectionState,
          iceGatheringState: this.peerConnection.iceGatheringState,
          signalingState: this.peerConnection.signalingState
        });
        
        // Create answer
        const answer = await this.peerConnection.createAnswer();
        console.log('Created answer:', answer);
        console.log('Answer SDP length:', answer.sdp.length);
        console.log('Answer SDP preview:', answer.sdp.substring(0, 100) + '...');
        
        await this.peerConnection.setLocalDescription(answer);
        console.log('Local description (answer) set successfully');
        
        // Send answer to signaling server
        this.sendCallAnswer(answer);
        
        // Устанавливаем флаг активного звонка
        this.currentCallData.isActive = true;
        this.currentCallData.isProcessing = false;
      } else {
        console.error('Cannot accept call without an offer');
        throw new Error('No offer available in call data');
      }
      
      return true;
    } catch (error) {
      console.error('Error accepting call:', error);
      this.cleanupCall();
      throw error;
    }
  }

  /**
   * Reject incoming call
   */
  rejectCall() {
    if (!this.currentCallData) {
      console.warn('No call to reject');
      return;
    }
    
    console.log('Rejecting call');
    const chatId = this.currentCallData.chatId;
    const callId = this.currentCallData.callId;
    
    const stompClient = getStompClient();
    if (stompClient && stompClient.connected) {
      stompClient.publish({
        destination: '/app/call/reject',
        body: JSON.stringify({
          chatId: chatId,
          callId: callId // Include callId if available
        })
      });
      
      console.log('Sent reject call request');
    }
    
    this.cleanupCall();
  }

  /**
   * Make sure audio is working (can be called from UI)
   */
  ensureAudioEnabled() {
    if (!this.remoteStream) {
      console.warn('Cannot ensure audio enabled: no remote stream');
      return false;
    }
    
    const audioTracks = this.remoteStream.getAudioTracks();
    if (audioTracks.length === 0) {
      console.warn('No audio tracks found in remote stream');
      return false;
    }
    
    console.log('Ensuring audio tracks are enabled');
    audioTracks.forEach(track => {
      if (!track.enabled) {
        console.log(`Enabling audio track ${track.id}`);
        track.enabled = true;
      }
    });
    
    return true;
  }
  
  /**
   * Check if remote audio is enabled
   */
  isRemoteAudioEnabled() {
    if (!this.remoteStream) return false;
    
    const audioTracks = this.remoteStream.getAudioTracks();
    if (audioTracks.length === 0) return false;
    
    // Check if all audio tracks are enabled
    return audioTracks.every(track => track.enabled);
  }
  
  /**
   * Get debug info about the current call
   */
  getCallDebugInfo() {
    return {
      hasRemoteStream: !!this.remoteStream,
      hasLocalStream: !!this.localStream,
      remoteStreamActive: this.remoteStream ? this.remoteStream.active : false,
      remoteAudioTracks: this.remoteStream ? this.remoteStream.getAudioTracks().length : 0,
      remoteVideoTracks: this.remoteStream ? this.remoteStream.getVideoTracks().length : 0,
      localAudioTracks: this.localStream ? this.localStream.getAudioTracks().length : 0,
      localVideoTracks: this.localStream ? this.localStream.getVideoTracks().length : 0,
      iceConnectionState: this.peerConnection ? this.peerConnection.iceConnectionState : 'none',
      connectionState: this.peerConnection ? this.peerConnection.connectionState : 'none',
      receivers: this.peerConnection ? this.peerConnection.getReceivers().length : 0
    };
  }
}

// Export singleton instance
const callServiceInstance = new CallService();

// Create a global handler to be accessible from anywhere in the app
window.handleCallNotification = (event) => {
  console.log('Global call notification handler called with event:', event);
  
  // Extract call data from the event - handle different message formats
  // Call messages can come from:
  // 1. Chat topics: {type: 'CALL_NOTIFICATION', payload: {...}}
  // 2. Private queue: {type: 'CALL_NOTIFICATION', chatId: 123, ...}
  // 3. Direct handler calls: {...callData}
  const callData = event.payload || event;
  
  // Ensure we have all necessary data regardless of format
  if (event.chatId && !callData.chatId) callData.chatId = event.chatId;
  if (event.callId && !callData.callId) callData.callId = event.callId;
  if (event.senderId && !callData.senderId) {
    callData.senderId = event.senderId;
    callData.senderName = event.senderName;
  }
  
  // Extract callId immediately if it exists and we have an ongoing call
  if (callData && callData.callId && callServiceInstance.currentCallData) {
    const callIdChanged = callServiceInstance.currentCallData.callId !== callData.callId;
    
    // Save callId to our current call data regardless of who initiated the call
    // This is critical for ICE candidates to work
    callServiceInstance.currentCallData.callId = callData.callId;
    console.log(`Saved callId to current call: ${callData.callId}`);
    
    // If we just got the callId OR we have pending candidates, send them
    // This ensures candidates are sent even during a new call after cleanup
    if (callIdChanged || callServiceInstance.pendingIceCandidates.length > 0) {
      console.log(`Checking for pending ICE candidates to send (${callServiceInstance.pendingIceCandidates.length} found)`);
      callServiceInstance.sendQueuedIceCandidates();
    }
  }
  
  // Check if this is a self-initiated call (current user is the caller)
  // We need to ignore notifications for calls we initiated ourselves - but only after saving the callId
  
  // Get current user ID from multiple sources to be more reliable
  let currentUserId = localStorage.getItem('userId');
  
  // Try to get from helper function first (most reliable)
  const currentUser = getCurrentUserFromCache();
  if (currentUser && currentUser.id) {
    currentUserId = currentUser.id.toString();
  }
  // If not found, try from Redux store directly
  else if (window.store && window.store.getState) {
    const state = window.store.getState();
    // Look for current user in the API slice of Redux store
    if (state.api && state.api.queries) {
      // Find the current user query result
      const currentUserQuery = Object.values(state.api.queries).find(
        query => query?.data && query.endpointName === 'getCurrentUser'
      );
      if (currentUserQuery && currentUserQuery.data && currentUserQuery.data.id) {
        currentUserId = currentUserQuery.data.id.toString();
      }
    }
  }
  
  // Fallback to session storage if still not found
  if (!currentUserId) {
    try {
      // Try to get user info from session storage
      const sessionUser = sessionStorage.getItem('user');
      if (sessionUser) {
        const userData = JSON.parse(sessionUser);
        if (userData && userData.id) {
          currentUserId = userData.id.toString();
        }
      }
    } catch (error) {
      console.error('Error accessing session storage:', error);
    }
  }
  
  // Compare the sender ID with current user ID - only for filtering incoming calls,
  // not for extracting the callId which we need regardless
  if (callData && callData.senderId && currentUserId &&
      (callData.senderId.toString() === currentUserId || 
       callData.senderId === parseInt(currentUserId))) {
    console.log(`Ignoring self-initiated call notification UI processing. Current user ID: ${currentUserId}, Sender ID: ${callData.senderId}`);
    // Note: We already saved the callId above if needed, so returning now is fine
    return;
  }
  
  console.log(`Processing call notification. Current user ID: ${currentUserId}, Sender ID: ${callData?.senderId}`);
  
  // Ensure caller details for UI are properly set
  if (callData && callData.senderId && !callData.caller) {
    console.log('Creating caller object from senderId and senderName');
    callData.caller = {
      id: callData.senderId,
      name: callData.senderName || 'Unknown Caller'
    };
  }
  
  // Check for SDP in various locations
  let sdpData = null;
  if (callData.sdp) {
    // Direct SDP field
    sdpData = callData.sdp;
  } else if (callData.payload && callData.payload.sdp) {
    // SDP in payload object
    sdpData = callData.payload.sdp;
    console.log('Found SDP in payload object');
  } else if (event.payload && event.payload.sdp) {
    // SDP in parent's payload
    sdpData = event.payload.sdp;
    console.log('Found SDP in parent payload object');
  }
  
  // Format the call data to match what handleIncomingCall expects
  const formattedCallData = {
    chatId: callData.chatId,
    callType: callData.callType || 'AUDIO',
    caller: {
      id: callData.senderId,
      name: callData.senderName
    },
    // Handle offer data prioritizing proper SDP format
    offer: callData.offer || null,
    sdp: sdpData,
    callId: callData.callId
  };
  
  // Log the SDP information for debugging
  console.log(`Call notification SDP information:`, {
    hasSdp: !!formattedCallData.sdp,
    hasOffer: !!formattedCallData.offer,
    sdpLength: formattedCallData.sdp ? formattedCallData.sdp.length : 0,
    hasCallId: !!formattedCallData.callId
  });
  
  // Process the incoming call
  callServiceInstance.handleIncomingCall(formattedCallData);
};

export default callServiceInstance;  