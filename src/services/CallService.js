import { getStompClient } from './api/WebSocketService';
import { getCurrentUserFromCache } from './api/usersApi';

let answerApplied = false;

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
    this.pendingIceCandidates = [];
    this.processedIceCandidates = new Set();
    this.connectionTimeout = null;
    this.isSubscribed = false;
    
    window.testMicrophone = this.testMicrophone.bind(this);
  }


  async testMicrophone() {
    console.log('Starting microphone test...');
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Microphone access granted:', stream);
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      console.log('Audio analysis started');
      
      const checkAudio = () => {
        analyser.getByteFrequencyData(dataArray);
        
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        
        const indicator = '|'.repeat(Math.min(50, Math.floor(average)));
        console.log(`Microphone level: ${average.toFixed(2)} ${indicator}`);
        
        if (average < 1) {
          console.warn('WARNING: No sound detected from microphone! Please check your microphone.');
        }
        
        setTimeout(checkAudio, 500);
      };
      
      checkAudio();
      
      console.log('Microphone test started. Type window.stopMicrophoneTest() to stop the test.');
      
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


  setEventHandlers(handlers) {
    const { onIncomingCall, onCallEstablished, onCallEnded, onRemoteMediaStatusChange } = handlers;
    this.onIncomingCall = onIncomingCall;
    this.onCallEstablished = onCallEstablished;
    this.onCallEnded = onCallEnded;
    this.onRemoteMediaStatusChange = onRemoteMediaStatusChange;
  }


  async initializeUserMedia(callType) {
    try {
      const constraints = {
        audio: true,
        video: callType === CALL_TYPE.VIDEO
      };

      console.log("ТИП ЗВОНКА", callType)
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.localStream = stream;
      
      const localAudioTrack = stream.getAudioTracks()[0];
      if (localAudioTrack) {
        console.log('local track muted?', localAudioTrack.muted, 'enabled?', localAudioTrack.enabled);
        localAudioTrack.onmute = () => console.log('LOCAL track muted');
        localAudioTrack.onunmute = () => console.log('LOCAL track un-muted');
        
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
            
            setTimeout(checkAudioLevels, 2000);
          };
          
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


  stopUserMedia() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
  }


  initializePeerConnection() {
    if (this.peerConnection) {
      console.log('Peer connection already exists, cleaning up first');
      this.cleanupPeerConnection();
    }

    console.log('Creating new peer connection');
    this.peerConnection = new RTCPeerConnection(ICE_SERVERS);

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('New ICE candidate:', event.candidate);
        this.sendIceCandidate(event.candidate);
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('ICE connection state changed:', this.peerConnection.iceConnectionState);
      
      if (this.peerConnection.iceConnectionState === 'failed') {
        console.log('ICE connection failed, ending call');
        this.endCall();
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      console.log('Connection state changed:', this.peerConnection.connectionState);
      
      if (this.peerConnection.connectionState === 'failed') {
        console.log('Connection failed, ending call');
        this.endCall();
      }
    };

    this.peerConnection.ontrack = this.handleRemoteTrack.bind(this);

    if (this.localStream) {
      console.log('Adding local tracks to peer connection:', 
        `audio:${this.localStream.getAudioTracks().length}:${this.localStream.getAudioTracks()[0]?.readyState}`);
      
      this.localStream.getTracks().forEach(track => {
          this.peerConnection.addTrack(track, this.localStream);
      });
    }

    this.processIceCandidateQueue();

    this.connectionTimeout = setTimeout(() => {
      if (this.peerConnection && 
          (this.peerConnection.connectionState !== 'connected' && 
           this.peerConnection.connectionState !== 'connecting')) {
        console.log('Connection timeout - no successful connection established');
        this.endCall();
      }
    }, 30000);
  }


  cleanupPeerConnection() {
    if (this.peerConnection) {
      this.peerConnection.oniceconnectionstatechange = null;
      this.peerConnection.onconnectionstatechange = null;
      this.peerConnection.ontrack = null;
      this.peerConnection.onicecandidate = null;
      
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }


  cleanupCall() {
    console.log('Cleaning up call resources and resetting state');
    this.stopUserMedia();
    this.cleanupPeerConnection();
    
    this.remoteStream = null;
    answerApplied = false;
    this.currentCallData = null;
    this.iceCandidateQueue = [];
    this.pendingIceCandidates = [];
    this.processedIceCandidates.clear();
    
    console.log('Call state reset complete');
  }


  handleRemoteTrack(event) {
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
        this.ensureAudioEnabled();
      }
    }
    
    console.log('Track associated stream info:', {
      streamId: event.streams[0]?.id || 'no stream',
      streamTracks: event.streams[0]?.getTracks().length || 0,
      streamActive: event.streams[0]?.active || false
    });
    
    this.remoteStream.addTrack(event.track);
    
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
    
    const transceivers = this.peerConnection.getTransceivers();
    console.log('Current transceivers:', transceivers.map(t => ({
      mid: t.mid,
      direction: t.direction,
      currentDirection: t.currentDirection,
      stopped: t.stopped
    })));
    
    if (event.track.kind === 'audio') {
      event.track.enabled = true;
      console.log('Ensure audio track is enabled:', event.track.enabled);
    }
    
    if (this.onCallEstablished) {
      console.log('Calling onCallEstablished with remote stream containing tracks:', 
        this.remoteStream.getTracks().length);
      this.onCallEstablished(this.remoteStream);
    }
  }


  logConnectionDetails() {
    if (!this.peerConnection) return;

    console.log('Connection details:', {
      iceConnectionState: this.peerConnection.iceConnectionState,
      iceGatheringState: this.peerConnection.iceGatheringState,
      signalingState: this.peerConnection.signalingState,
      connectionState: this.peerConnection.connectionState
    });

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
    
    if (this.localStream) {
      console.log('Local tracks:', 
        this.localStream.getTracks().map(t => `${t.kind}:${t.enabled}:${t.id}`).join(', '));
    }
    
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


  updateCallId(callId) {
    if (!this.currentCallData) {
      console.warn('Cannot update callId: no current call data');
      return;
    }
    
    console.log(`Updating call ID from ${this.currentCallData.callId || 'undefined'} to ${callId}`);
    this.currentCallData.callId = callId;
    
    this.sendQueuedIceCandidates();
  }


  async startCall(chatId, callType = CALL_TYPE.AUDIO) {
    try {
      if (this.currentCallData) {
        console.log('Cleaning up previous call state before starting a new call');
        this.cleanupCall();
      }
      
      console.log(`Starting new ${callType} call to chat ${chatId} (Phase 1: Signaling)`);
      
      this.currentCallData = {
        chatId,
        callType,
        isInitiator: true,
        phase: 1,
        isProcessing: true
      };
      
      console.log('Call initialized with data:', this.currentCallData);
      
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


  async handleCallAccepted(acceptData) {
    try {
      if (!this.currentCallData) {
        console.error('Received CALL_ACCEPTED but no current call data');
        return;
      }
      
      console.log('Call accepted, initiating WebRTC exchange (Phase 3)', acceptData);
      
      await this.initializeUserMedia(this.currentCallData.callType);
      this.initializePeerConnection();
      
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      
      this.currentCallData.phase = 3;
      
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


  async handleIncomingCall(callData) {
    console.log('Processing incoming call data:', callData);
    
    this.currentCallData = {
      ...callData,
      isInitiator: false,
      phase: 1
    };
    
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
      
      if (this.peerConnection.signalingState !== 'have-local-offer') {
        console.warn(`Cannot set remote description in state: ${this.peerConnection.signalingState}`);
        return;
      }
      
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      console.log('Remote description successfully set');
      answerApplied = true;
      
      console.log('Connection state after setting remote description:', {
        iceConnectionState: this.peerConnection.iceConnectionState,
        iceGatheringState: this.peerConnection.iceGatheringState,
        signalingState: this.peerConnection.signalingState,
        connectionState: this.peerConnection.connectionState
      });
      
      this.processIceCandidateQueue();
      
      const transceivers = this.peerConnection.getTransceivers();
      console.log('Transceivers after setting remote description:', 
        transceivers.map(t => ({
          mid: t.mid,
          currentDirection: t.currentDirection,
          direction: t.direction,
          stopped: t.stopped
        }))
      );

      if (this.currentCallData) {
        this.currentCallData.phase = 3;
        this.currentCallData.isActive = true;
      }
      
    } catch (error) {
      console.error('Error setting remote description:', error);

    }
  }


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


  handleCallEnded() {
    this.cleanupCall();
    
    if (this.onCallEnded) {
      this.onCallEnded();
    }
  }


  handleMediaStatusChange(data) {
    if (this.onRemoteMediaStatusChange) {
      this.onRemoteMediaStatusChange(data);
    }
  }


  toggleAudio() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        
        this.sendMediaStatus(MEDIA_STATUS_TYPE.TOGGLE_AUDIO, !audioTrack.enabled);
        
        return !audioTrack.enabled;
      }
    }
    return false;
  }


  toggleVideo() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        
        this.sendMediaStatus(MEDIA_STATUS_TYPE.TOGGLE_VIDEO, !videoTrack.enabled);
        
        return !videoTrack.enabled;
      }
    }
    return false;
  }


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


  sendIceCandidate(candidate) {
    const stompClient = getStompClient();
    
    if (!stompClient || !stompClient.connected || !this.currentCallData) {
      console.warn('Queueing ICE candidate: no STOMP connection or call data');
      this.pendingIceCandidates.push(candidate);
      return;
    }
    
    if (!this.currentCallData.callId) {
      console.warn('Queueing ICE candidate: waiting for callId');
      this.pendingIceCandidates.push(candidate);
      return;
    }
    
    stompClient.publish({
      destination: '/app/call/ice-candidate',
      body: JSON.stringify({
        chatId: this.currentCallData.chatId,
        callId: this.currentCallData.callId,
        candidate
      })
    });
    
    console.log(`Sent ICE candidate with callId: ${this.currentCallData.callId}`);
  }
  

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
      this.pendingIceCandidates.forEach((candidate, index) => {
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
      this.pendingIceCandidates = [];
    } else {
      console.error('Cannot send queued ICE candidates: no STOMP connection');
    }
  }


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
          callId: this.currentCallData.callId,
          statusType,
          isDisabled
        })
      });
      
      console.log('Sent media status with callId:', this.currentCallData.callId);
    } else {
      console.error('Cannot send media status: no current call data or STOMP connection');
    }
  }


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

      if (!callId) {
        console.warn('Ending call without callId');
      }
      
      stompClient.publish({
        destination: '/app/call/end',
        body: JSON.stringify({
          chatId: chatId,
          callId: callId
        })
      });
      
      console.log('Sent end call request');
    }
    
    this.cleanupCall();
    
    if (this.onCallEnded) {
      this.onCallEnded();
    }
  }


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
          callId: callId
        })
      });
      
      console.log('Sent reject call request');
    }
    
    this.cleanupCall();
  }


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
  

  isRemoteAudioEnabled() {
    if (!this.remoteStream) return false;
    
    const audioTracks = this.remoteStream.getAudioTracks();
    if (audioTracks.length === 0) return false;
    
    return audioTracks.every(track => track.enabled);
  }
  

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


  async handleOffer(offerData) {
    if (!this.currentCallData) {
      console.error('Received offer but no current call data');
      return;
    }
    
    console.log('Processing incoming offer (Phase 3):', offerData);
    
    try {
      await this.initializeUserMedia(this.currentCallData.callType);
      this.initializePeerConnection();
      
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
      
      const offerObj = {
        type: 'offer',
        sdp: sdp
      };
      
      console.log('Setting remote description with offer:', offerObj);
      
      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(offerObj)
      );
      console.log('Remote description (offer) set successfully');
      
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      
      this.sendCallAnswer(answer);
      
      this.currentCallData.phase = 3;
      this.currentCallData.isActive = true;
      
      this.processIceCandidateQueue();
      
      return true;
    } catch (error) {
      console.error('Error handling offer:', error);
      this.cleanupCall();
      throw error;
    }
  }
}

const callServiceInstance = new CallService();

window.handleCallNotification = (event) => {
  console.log('Global call notification handler called with event:', event);
  
  if (event.type === CALL_MESSAGE_TYPE.CALL_ACCEPTED) {
    console.log('Received CALL_ACCEPTED in global handler:', event);
    if (callServiceInstance.currentCallData && callServiceInstance.currentCallData.isInitiator) {
      callServiceInstance.handleCallAccepted(event);
    }
    return;
  }
  

  const callData = event.payload || event;
  
  if (event.chatId && !callData.chatId) callData.chatId = event.chatId;
  if (event.callId && !callData.callId) callData.callId = event.callId;
  if (event.senderId && !callData.senderId) {
    callData.senderId = event.senderId;
    callData.senderName = event.senderName;
  }
  
  if (callData && callData.callId) {
    console.log(`Received callId: ${callData.callId}`);
    
    if (callServiceInstance.currentCallData) {
      const callIdChanged = callServiceInstance.currentCallData.callId !== callData.callId;
      
      callServiceInstance.currentCallData.callId = callData.callId;
      console.log(`Saved callId to current call: ${callData.callId}`);
      

    }
  }
  

  
  let currentUserId = localStorage.getItem('userId');
  
  const currentUser = getCurrentUserFromCache();
  if (currentUser && currentUser.id) {
    currentUserId = currentUser.id.toString();
  }
  else if (window.store && window.store.getState) {
    const state = window.store.getState();
    if (state.api && state.api.queries) {
      const currentUserQuery = Object.values(state.api.queries).find(
        query => query?.data && query.endpointName === 'getCurrentUser'
      );
      if (currentUserQuery && currentUserQuery.data && currentUserQuery.data.id) {
        currentUserId = currentUserQuery.data.id.toString();
      }
    }
  }
  
  if (!currentUserId) {
    try {
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
  
  let isOwnCall = false;
  if (callData && callData.senderId && currentUserId &&
      (callData.senderId.toString() === currentUserId || 
       callData.senderId === parseInt(currentUserId))) {
    console.log(`Detected own call notification. Current user ID: ${currentUserId}, Sender ID: ${callData.senderId}`);
    isOwnCall = true;
  }
  

  if (isOwnCall) {
    console.log('Not showing UI for own call notification - but callId was processed');
    return;
  }
  
  console.log(`Processing call notification from another user. Current user ID: ${currentUserId}, Sender ID: ${callData?.senderId}`);
  
  if (callData && callData.senderId && !callData.caller) {
    console.log('Creating caller object from senderId and senderName');
    callData.caller = {
      id: callData.senderId,
      name: callData.senderName || 'Unknown Caller'
    };
  }
  
  const formattedCallData = {
    chatId: callData.chatId,
    callType: callData.callType || 'AUDIO',
    caller: {
      id: callData.senderId,
      name: callData.senderName
    },
    callId: callData.callId,
    phase: 1
  };
  
  callServiceInstance.handleIncomingCall(formattedCallData);
};

export default callServiceInstance;  