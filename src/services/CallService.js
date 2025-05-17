import { getStompClient } from './api/WebSocketService';
import { getCurrentUserFromCache } from './api/usersApi';

let answerApplied = false;   // вне класса (модульная переменная)

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

export const CALL_TYPE = {
  AUDIO: 'AUDIO',
  VIDEO: 'VIDEO'
};

export const CALL_MESSAGE_TYPE = {
  OFFER: 'OFFER',
  ANSWER: 'ANSWER',
  ICE_CANDIDATE: 'ICE_CANDIDATE',
  CALL_ENDED: 'CALL_ENDED',
  MEDIA_STATUS: 'MEDIA_STATUS',
  CALL_NOTIFICATION: 'CALL_NOTIFICATION',
  CALL_ACCEPTED: 'CALL_ACCEPTED'
};

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
    this.processedIceCandidates = new Set(); // Track processed ICE candidates
    this.connectionTimeout = null;
    this.isSubscribed = false;
    
    window.testMicrophone = this.testMicrophone.bind(this);
  }


  async testMicrophone() {
    console.log('Starting microphone test...');
    
    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Microphone access granted:', stream);
      
      // Create audio context for analysis
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      console.log('Audio analysis started');
      
      // Start checking audio levels
      const checkAudio = () => {
        analyser.getByteFrequencyData(dataArray);
        
        // Calculate average volume
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        
        // Log audio level with visual indicator
        const indicator = '|'.repeat(Math.min(50, Math.floor(average)));
        console.log(`Microphone level: ${average.toFixed(2)} ${indicator}`);
        
        if (average < 1) {
          console.warn('WARNING: No sound detected from microphone! Please check your microphone.');
        }
        
        setTimeout(checkAudio, 500);
      };
      
      // Start monitoring
      checkAudio();
      
      // Show how to stop the test
      console.log('Microphone test started. Type window.stopMicrophoneTest() to stop the test.');
      
      // Add a method to stop the test
      window.stopMicrophoneTest = () => {
        console.log('Stopping microphone test...');
        stream.getTracks().forEach(track => track.stop());
        delete window.stopMicrophoneTest;
        console.log('Microphone test stopped');
      };
      
      return true;
    } catch (error) {
      console.error('Error testing microphone:', error);
      return false;
    }
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
  async initializeUserMedia(callType) {
    try {
      const constraints = {
        audio: true,
        video: callType === CALL_TYPE.VIDEO
      };

      console.log("ТИП ЗВОНКА", callType)
      
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
    if (this.peerConnection) {
      console.log('Peer connection already exists, cleaning up first');
      this.cleanupPeerConnection();
    }

    console.log('Creating new peer connection');
    this.peerConnection = new RTCPeerConnection(ICE_SERVERS);

    // Set up event handlers
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('New ICE candidate:', event.candidate);
        this.sendIceCandidate(event.candidate);
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('ICE connection state changed:', this.peerConnection.iceConnectionState);
      
      // Only end call on failed state, not on disconnected
      if (this.peerConnection.iceConnectionState === 'failed') {
        console.log('ICE connection failed, ending call');
        this.endCall();
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      console.log('Connection state changed:', this.peerConnection.connectionState);
      
      // Only end call on failed state
      if (this.peerConnection.connectionState === 'failed') {
        console.log('Connection failed, ending call');
        this.endCall();
      }
    };

    this.peerConnection.ontrack = this.handleRemoteTrack.bind(this);

    // Add local tracks if we have them
    if (this.localStream) {
      console.log('Adding local tracks to peer connection:', 
        `audio:${this.localStream.getAudioTracks().length}:${this.localStream.getAudioTracks()[0]?.readyState}`);
      
      this.localStream.getTracks().forEach(track => {
          this.peerConnection.addTrack(track, this.localStream);
      });
    }

    // Process any queued ICE candidates
    this.processIceCandidateQueue();

    // Set connection timeout
    this.connectionTimeout = setTimeout(() => {
      if (this.peerConnection && 
          (this.peerConnection.connectionState !== 'connected' && 
           this.peerConnection.connectionState !== 'connecting')) {
        console.log('Connection timeout - no successful connection established');
        this.endCall();
      }
    }, 30000); // 30 second timeout
  }

  /**
   * Clean up peer connection and its event handlers
   */
  cleanupPeerConnection() {
    if (this.peerConnection) {
      // Remove all event handlers
      this.peerConnection.oniceconnectionstatechange = null;
      this.peerConnection.onconnectionstatechange = null;
      this.peerConnection.ontrack = null;
      this.peerConnection.onicecandidate = null;
      
      // Close the connection
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Clear connection timeout
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }

  /**
   * Clean up call resources
   */
  cleanupCall() {
    console.log('Cleaning up call resources and resetting state');
    this.stopUserMedia();
    this.cleanupPeerConnection();
    
    this.remoteStream = null;
    answerApplied = false;
    this.currentCallData = null;
    this.iceCandidateQueue = [];
    this.pendingIceCandidates = []; // Clear pending candidates for the next call
    this.processedIceCandidates.clear(); // Clear processed candidates set
    
    console.log('Call state reset complete');
  }

  /**
   * Handle remote track
   */
  handleRemoteTrack(event) {
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
    
    if (!this.remoteStream) {
      console.log('Initializing new remote stream');
      this.remoteStream = new MediaStream();
    }
    
    if (event.track.kind === 'audio') {
      console.log('remote muted?', event.track.muted, 'enabled?', event.track.enabled);
      event.track.onmute = () => console.log('REMOTE track muted');
      event.track.onunmute = () => {
        console.log('REMOTE track un-muted');
        // Try to re-establish audio when unmuted
        this.ensureAudioEnabled();
      }
    }
    
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
  }

  /**
   * Log connection details
   */
  logConnectionDetails() {
    if (!this.peerConnection) return;
    
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

  /**
   * Log selected ICE candidate pair
   */
  async logSelectedCandidatePair() {
    if (!this.peerConnection) return;
    
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
  }

  /**
   * Process ICE candidate queue
   */
  processIceCandidateQueue() {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) {
      console.log('Cannot process ICE candidates: no peer connection or remote description');
      return;
    }

    console.log(`Processing ${this.iceCandidateQueue.length} queued ICE candidates`);
    
    while (this.iceCandidateQueue.length > 0) {
      const candidate = this.iceCandidateQueue.shift();
      try {
        this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
          .then(() => {
            console.log('Successfully added queued ICE candidate');
          })
          .catch(error => {
            console.error('Error adding queued ICE candidate:', error);
          });
      } catch (error) {
        console.error('Error processing queued ICE candidate:', error);
      }
    }
  }

  /**
   * Update call ID and process any pending ICE candidates
   * @param {string} callId - The call ID from the server
   */
  updateCallId(callId) {
    if (!this.currentCallData) {
      console.warn('Cannot update callId: no current call data');
      return;
    }
    
    console.log(`Updating call ID from ${this.currentCallData.callId || 'undefined'} to ${callId}`);
    this.currentCallData.callId = callId;
    
    // Now that we have the callId, send any pending ICE candidates
    this.sendQueuedIceCandidates();
  }

  /**
   * Start a call - Phase 1: Signaling only
   */
  async startCall(chatId, callType = CALL_TYPE.AUDIO) {
    try {
      // Make sure we have a clean state before starting a new call
      if (this.currentCallData) {
        console.log('Cleaning up previous call state before starting a new call');
        this.cleanupCall();
      }
      
      console.log(`Starting new ${callType} call to chat ${chatId} (Phase 1: Signaling)`);
      
      // Save current call data - but without media streams or peer connection yet
      this.currentCallData = {
        chatId,
        callType,
        isInitiator: true,
        phase: 1, // Track the phase we're in
        isProcessing: true
      };
      
      console.log('Call initialized with data:', this.currentCallData);
      
      // Send notification to signaling server - no SDP in Phase 1
      const stompClient = getStompClient();
      if (stompClient && stompClient.connected) {
        stompClient.publish({
          destination: '/app/call/start',
          body: JSON.stringify({
            chatId,
            callType
          })
        });
        console.log('Sent call start notification (Phase 1)');
      } else {
        throw new Error('Cannot send call start: no STOMP connection');
      }
      
      return true;
    } catch (error) {
      console.error('Error starting call (Phase 1):', error);
      this.cleanupCall();
      throw error;
    }
  }

  /**
   * Accept incoming call - Phase 2: Call acceptance
   */
  async acceptCall() {
    if (!this.currentCallData) {
      throw new Error('No call to accept');
    }

    console.log('Accepting call (Phase 2)');
    
    const stompClient = getStompClient();
    if (stompClient && stompClient.connected) {
      stompClient.publish({
        destination: '/app/call/accept',
        body: JSON.stringify({
          chatId: this.currentCallData.chatId,
          callId: this.currentCallData.callId
        })
      });
      console.log('Sent call accept notification (Phase 2)');
    } else {
      throw new Error('Cannot send call accept: no STOMP connection');
    }
  }

  /**
   * Handle CALL_ACCEPTED event - initiates Phase 3 (WebRTC exchange)
   */
  async handleCallAccepted(acceptData) {
    try {
      if (!this.currentCallData) {
        console.error('Received CALL_ACCEPTED but no current call data');
        return;
      }
      
      console.log('Call accepted, initiating WebRTC exchange (Phase 3)', acceptData);
      
      // Now we can create media and peer connection
      await this.initializeUserMedia(this.currentCallData.callType);
      this.initializePeerConnection();
      
      // Create and send offer
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      
      // Update call phase
      this.currentCallData.phase = 3;
      
      // Send offer to signaling server
      this.sendCallOffer(
        this.currentCallData.chatId, 
        this.currentCallData.callType, 
        this.currentCallData.callId, 
        offer
      );
      
      return true;
    } catch (error) {
      console.error('Error handling call accepted:', error);
      this.cleanupCall();
      throw error;
    }
  }

  /**
   * Handle incoming call notification - Phase 1
   */
  async handleIncomingCall(callData) {
    console.log('Processing incoming call data:', callData);
    
    // Store the call data
    this.currentCallData = {
      ...callData,
      isInitiator: false,
      phase: 1
    };
    
    // Update current callId if it's included in the event
    if (callData.callId) {
      console.log(`Setting callId from incoming call data: ${callData.callId}`);
      this.currentCallData.callId = callData.callId;
    }
    
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

    if (answerApplied) {
      console.log('Duplicate ANSWER ignored');
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
      
      // Check if we're in a valid state to set the remote description
      if (this.peerConnection.signalingState !== 'have-local-offer') {
        console.warn(`Cannot set remote description in state: ${this.peerConnection.signalingState}`);
        return;
      }
      
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      console.log('Remote description successfully set');
      answerApplied = true;
      
      // Логируем состояние соединения после установки удаленного описания
      console.log('Connection state after setting remote description:', {
        iceConnectionState: this.peerConnection.iceConnectionState,
        iceGatheringState: this.peerConnection.iceGatheringState,
        signalingState: this.peerConnection.signalingState,
        connectionState: this.peerConnection.connectionState
      });
      
      // Process any queued ICE candidates now that we have a remote description
      this.processIceCandidateQueue();
      
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

      // Update call phase and state
      if (this.currentCallData) {
        this.currentCallData.phase = 3;
        this.currentCallData.isActive = true;
      }
      
    } catch (error) {
      console.error('Error setting remote description:', error);
      // Don't cleanup here - let the connection state change handler handle failures
    }
  }

  /**
   * Handle remote ICE candidate
   */
  handleRemoteIceCandidate(candidate) {
    if (!this.peerConnection) {
      console.warn('No peer connection when receiving ICE candidate - queueing');
      this.iceCandidateQueue.push(candidate);
      return;
    }
    
    if (!this.peerConnection.remoteDescription) {
      console.log('No remote description when receiving ICE candidate - queueing');
      this.iceCandidateQueue.push(candidate);
      return;
    }

    // Skip дубликаты от двойной подписки
    const candidateKey = `${candidate.sdpMid}-${candidate.sdpMLineIndex}-${candidate.candidate}`;
    if (this.processedIceCandidates.has(candidateKey)) {
      console.log('Skipping duplicate ICE candidate');
      return;
    }

    try {
      console.log('Adding ICE candidate to peer connection');
      this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
        .then(() => {
          console.log('Successfully added ICE candidate');
          this.processedIceCandidates.add(candidateKey);
        })
        .catch(error => {
          console.error('Error adding ICE candidate:', error);
        });
    } catch (error) {
      console.error('Error processing ICE candidate:', error);
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
          callId: this.currentCallData.callId,
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
      this.pendingIceCandidates.forEach((candidate, index) => {
        // Log more details about the candidate
        console.log(`Sending queued ICE candidate ${index+1}/${this.pendingIceCandidates.length}:`, {
          type: candidate.type,
          protocol: candidate.protocol,
          address: candidate.address || candidate.ip,
          port: candidate.port,
          candidateType: candidate.candidateType || candidate.type,
          sdpMid: candidate.sdpMid,
          sdpMLineIndex: candidate.sdpMLineIndex
        });
        
        stompClient.publish({
          destination: '/app/call/ice-candidate',
          body: JSON.stringify({
            chatId: this.currentCallData.chatId,
            callId: this.currentCallData.callId,
            candidate
          })
        });
      });
      
      console.log(`Successfully sent ${this.pendingIceCandidates.length} queued ICE candidates with callId: ${this.currentCallData.callId}`);
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

  /**
   * Send call offer to signaling server
   */
  sendCallOffer(chatId, callType, callId, offer) {
    const stompClient = getStompClient();
    if (stompClient && stompClient.connected) {
      stompClient.publish({
        destination: '/app/call/offer',
        body: JSON.stringify({
          chatId,
          callId,
          callType,
          offer,
          sdp: offer.sdp
        })
      });
      console.log(`Sent call offer with callId: ${callId}`);
    } else {
      console.error('Cannot send call offer: no STOMP connection');
    }
  }

  /**
   * Handle incoming offer (Phase 3)
   */
  async handleOffer(offerData) {
    if (!this.currentCallData) {
      console.error('Received offer but no current call data');
      return;
    }
    
    console.log('Processing incoming offer (Phase 3):', offerData);
    
    try {
      // Initialize media and peer connection
      await this.initializeUserMedia(this.currentCallData.callType);
      this.initializePeerConnection();
      
      // Extract SDP from the correct location in the offer data
      let sdp = null;
      if (offerData.payload && offerData.payload.sdp) {
        sdp = offerData.payload.sdp;
      } else if (offerData.sdp) {
        sdp = offerData.sdp;
      }
      
      if (!sdp) {
        console.error('Invalid offer data, missing SDP:', offerData);
        return;
      }
      
      // Create offer object
      const offerObj = {
        type: 'offer',
        sdp: sdp
      };
      
      console.log('Setting remote description with offer:', offerObj);
      
      // Set remote description (offer)
      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(offerObj)
      );
      console.log('Remote description (offer) set successfully');
      
      // Create answer
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      
      // Send answer to signaling server
      this.sendCallAnswer(answer);
      
      // Update call phase
      this.currentCallData.phase = 3;
      this.currentCallData.isActive = true;
      
      // Process any queued ICE candidates now that we have a remote description
      this.processIceCandidateQueue();
      
      return true;
    } catch (error) {
      console.error('Error handling offer:', error);
      this.cleanupCall();
      throw error;
    }
  }
}

// Export singleton instance
const callServiceInstance = new CallService();

// Create a global handler to be accessible from anywhere in the app
window.handleCallNotification = (event) => {
  console.log('Global call notification handler called with event:', event);
  
  // First, handle special message types directly
  if (event.type === CALL_MESSAGE_TYPE.CALL_ACCEPTED) {
    console.log('Received CALL_ACCEPTED in global handler:', event);
    // If we're the initiator of the call, start WebRTC process
    if (callServiceInstance.currentCallData && callServiceInstance.currentCallData.isInitiator) {
      callServiceInstance.handleCallAccepted(event);
    }
    return;
  }
  
  // For other messages, continue with normal processing
  
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
  
  // Extract callId immediately if it exists
  if (callData && callData.callId) {
    console.log(`Received callId: ${callData.callId}`);
    
    // If we have an ongoing call, update its callId
    if (callServiceInstance.currentCallData) {
      const callIdChanged = callServiceInstance.currentCallData.callId !== callData.callId;
      
      callServiceInstance.currentCallData.callId = callData.callId;
      console.log(`Saved callId to current call: ${callData.callId}`);
      
      // In the two-phase approach, we shouldn't have pending ICE candidates yet
      // because we don't create WebRTC objects until Phase 3
    }
  }
  
  // Check if this is a self-initiated call (current user is the caller)
  // We need to ignore UI notifications for calls we initiated ourselves - but STILL EXTRACT THE CALL ID
  
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
  
  // Check if this is our own call notification
  let isOwnCall = false;
  if (callData && callData.senderId && currentUserId &&
      (callData.senderId.toString() === currentUserId || 
       callData.senderId === parseInt(currentUserId))) {
    console.log(`Detected own call notification. Current user ID: ${currentUserId}, Sender ID: ${callData.senderId}`);
    isOwnCall = true;
  }
  
  // If it's our own call, we've already extracted and saved the callId above
  // Just skip showing the incoming call UI
  if (isOwnCall) {
    console.log('Not showing UI for own call notification - but callId was processed');
    return;
  }
  
  // For calls from other users, continue with normal processing
  console.log(`Processing call notification from another user. Current user ID: ${currentUserId}, Sender ID: ${callData?.senderId}`);
  
  // Ensure caller details for UI are properly set
  if (callData && callData.senderId && !callData.caller) {
    console.log('Creating caller object from senderId and senderName');
    callData.caller = {
      id: callData.senderId,
      name: callData.senderName || 'Unknown Caller'
    };
  }
  
  // Format the call data to match what handleIncomingCall expects
  const formattedCallData = {
    chatId: callData.chatId,
    callType: callData.callType || 'AUDIO',
    caller: {
      id: callData.senderId,
      name: callData.senderName
    },
    callId: callData.callId,
    phase: 1 // This is Phase 1 notification
  };
  
  // Process the incoming call
  callServiceInstance.handleIncomingCall(formattedCallData);
};

export default callServiceInstance;  