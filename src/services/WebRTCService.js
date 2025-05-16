import { 
  CallEventType, 
  sendIceCandidate, 
  startCall, 
  answerCall, 
  endCall, 
  rejectCall,
  updateMediaStatus
} from './api/CallService';
import { ChatEventTypes } from './api/WebSocketService';

// ICE servers configuration for WebRTC
const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' }
];

// WebRTC configuration
const rtcConfig = {
  iceServers,
  iceCandidatePoolSize: 10
};

class WebRTCService {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStreams = new Map(); // Track multiple remote streams for group calls
    this.currentCallId = null;
    this.currentChatId = null;
    this.isCallActive = false;
    this.isInitiator = false;
    this.callType = null;
    this.onCallStateChange = null;
    this.onRemoteStreamAdded = null;
    this.onRemoteStreamRemoved = null;
    this.onLocalStreamCreated = null;
    this.activeParticipants = new Map(); // Track active participants in group calls
    this.screenShareStream = null;
    this.pendingIceCandidates = []; // Store ICE candidates if callId is not set yet
  }

  /**
   * Initialize a new call
   * @param {string} chatId - Chat ID where the call is taking place
   * @param {string} callType - Type of call (AUDIO or VIDEO)
   * @param {boolean} isInitiator - Whether the current user is initiating the call
   * @returns {Promise<boolean>} - Whether initialization was successful
   */
  async initializeCall(chatId, callType, isInitiator = true) {
    try {
      // Clean up any existing call
      this.cleanupCall();
      
      console.log(`Initializing ${callType} call in chat ${chatId}, isInitiator: ${isInitiator}`);
      
      this.currentChatId = chatId;
      this.callType = callType;
      this.isInitiator = isInitiator;
      this.pendingIceCandidates = []; // Reset pending ICE candidates
      
      // Create peer connection
      this.peerConnection = new RTCPeerConnection(rtcConfig);
      
      // Set up event handlers
      this.setupPeerConnectionListeners();
      
      // Get user media
      await this.getUserMedia();
      
      // If this user is initiating the call, create and send offer
      if (isInitiator) {
        console.log("Creating and sending offer as initiator");
        const offer = await this.createOffer();
        const result = startCall(chatId, callType, offer);
        
        // Для инициатора звонка сразу устанавливаем флаг активного звонка,
        // чтобы интерфейс звонка отображался сразу
        if (result) {
          this.isCallActive = true;
          console.log("Call is now active (as initiator)");
        }
        
        // Note: The callId will be set when we receive a response from the server
        return result;
      }
      
      return true;
    } catch (error) {
      console.error('Error initializing call:', error);
      this.cleanupCall();
      return false;
    }
  }

  /**
   * Set up event listeners for the peer connection
   */
  setupPeerConnectionListeners() {
    if (!this.peerConnection) return;
    
    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        // Only send if we have a callId, otherwise store for later
        if (this.currentCallId) {
          sendIceCandidate(this.currentChatId, this.currentCallId, event.candidate);
        } else {
          // Store the candidate to send once we have a callId
          this.pendingIceCandidates.push(event.candidate);
          console.log('Storing ICE candidate until callId is set');
        }
      }
    };
    
    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      console.log('Connection state change:', this.peerConnection.connectionState);
      
      if (this.onCallStateChange) {
        this.onCallStateChange(this.peerConnection.connectionState);
      }
      
      if (this.peerConnection.connectionState === 'disconnected' || 
          this.peerConnection.connectionState === 'failed' ||
          this.peerConnection.connectionState === 'closed') {
        this.handleCallDisconnection();
      }
    };
    
    // Handle ICE connection state changes
    this.peerConnection.oniceconnectionstatechange = () => {
      console.log('ICE connection state change:', this.peerConnection.iceConnectionState);
    };
    
    // Handle tracks added to the connection
    this.peerConnection.ontrack = (event) => {
      console.log('Remote track added:', event.track.kind);
      
      const remoteStream = event.streams[0];
      const participantId = remoteStream.id;
      
      this.remoteStreams.set(participantId, remoteStream);
      
      if (this.onRemoteStreamAdded) {
        this.onRemoteStreamAdded(remoteStream, participantId);
      }
    };
    
    // Handle tracks removed from the connection
    this.peerConnection.onremovetrack = (event) => {
      console.log('Remote track removed:', event.track.kind);
      
      // Find the stream that the track belonged to
      for (const [participantId, stream] of this.remoteStreams.entries()) {
        const trackExists = stream.getTracks().some(track => track.id === event.track.id);
        if (!trackExists) {
          this.remoteStreams.delete(participantId);
          
          if (this.onRemoteStreamRemoved) {
            this.onRemoteStreamRemoved(participantId);
          }
          break;
        }
      }
    };
  }

  /**
   * Request user media (audio/video)
   * @returns {Promise<MediaStream>} - The local media stream
   */
  async getUserMedia() {
    try {
      const constraints = {
        audio: true,
        video: this.callType === 'VIDEO' ? { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        } : false
      };
      
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Add all tracks to the peer connection
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });
      
      if (this.onLocalStreamCreated) {
        this.onLocalStreamCreated(this.localStream);
      }
      
      return this.localStream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }

  /**
   * Create an SDP offer
   * @returns {Promise<string>} - The SDP offer
   */
  async createOffer() {
    try {
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: this.callType === 'VIDEO'
      });
      
      await this.peerConnection.setLocalDescription(offer);
      
      // Wait for ICE gathering to complete
      await this.waitForIceGatheringComplete();
      
      return this.peerConnection.localDescription.sdp;
    } catch (error) {
      console.error('Error creating offer:', error);
      throw error;
    }
  }

  /**
   * Create an SDP answer in response to an offer
   * @param {string} offerSdp - The SDP offer received
   * @returns {Promise<string>} - The SDP answer
   */
  async createAnswer(offerSdp) {
    try {
      console.log('Creating answer for offerSdp:', offerSdp);
      
      // Проверка наличия правильного SDP формата
      if (!offerSdp || typeof offerSdp !== 'string' || !offerSdp.startsWith('v=')) {
        console.error('Invalid SDP format. SDP should start with "v=":', offerSdp);
        throw new Error('Invalid SDP format');
      }
      
      // Set the remote description using the received offer
      const offer = new RTCSessionDescription({
        type: 'offer',
        sdp: offerSdp
      });
      
      await this.peerConnection.setRemoteDescription(offer);
      
      // Create answer
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      
      // Wait for ICE gathering to complete
      await this.waitForIceGatheringComplete();
      
      console.log('Created answer SDP:', this.peerConnection.localDescription.sdp);
      
      return this.peerConnection.localDescription.sdp;
    } catch (error) {
      console.error('Error creating answer:', error);
      throw error;
    }
  }

  /**
   * Handle an incoming offer
   * @param {object} callEvent - The call event containing the offer
   * @returns {Promise<boolean>} - Whether the offer was handled successfully
   */
  async handleOffer(callEvent) {
    try {
      if (this.isCallActive) {
        console.warn('Ignoring offer: call already active');
        return false;
      }
      
      console.log('Handling call offer:', callEvent);
      
      this.currentCallId = callEvent.callId;
      this.currentChatId = callEvent.chatId;
      this.callType = callEvent.callType;
      
      // В этом случае мы не инициатор, а получатель звонка
      this.isInitiator = false;
      
      // Проверяем, является ли это уведомлением о групповом звонке без SDP
      const isGroupCallNotification = 
        (callEvent.type === 'CALL_NOTIFICATION' || callEvent.type === ChatEventTypes.CALL_NOTIFICATION) && 
        (!callEvent.payload?.sdp && !callEvent.sdp && !callEvent.offer);
      
      if (isGroupCallNotification) {
        console.log('Detected group call notification without SDP - will initialize call without remote SDP');
        
        // Для групповых звонков просто инициализируем соединение без удаленного SDP
        await this.initializeCall(callEvent.chatId, callEvent.callType, false);
        return true;
      }
      
      // Проверяем наличие SDP в событии (для 1:1 звонков)
      if (!callEvent.payload || !callEvent.payload.sdp) {
        console.warn('No SDP found in call offer event, searching for it');
        
        if (!callEvent.payload) {
          callEvent.payload = {};
        }
        
        // Ищем SDP в разных местах
        if (callEvent.sdp) {
          callEvent.payload.sdp = callEvent.sdp;
          console.log('Found SDP in callEvent.sdp');
        } else if (callEvent.payload.offer) {
          callEvent.payload.sdp = callEvent.payload.offer;
          console.log('Found SDP in callEvent.payload.offer');
        } else if (callEvent.offer) {
          callEvent.payload.sdp = callEvent.offer;
          console.log('Found SDP in callEvent.offer');
        } else {
          // Глубокий поиск SDP в объекте события
          for (const key in callEvent) {
            if (typeof callEvent[key] === 'string' && callEvent[key].startsWith('v=')) {
              callEvent.payload.sdp = callEvent[key];
              console.log(`Found SDP in callEvent.${key}`);
              break;
            } else if (typeof callEvent[key] === 'object' && callEvent[key]) {
              for (const subKey in callEvent[key]) {
                if (typeof callEvent[key][subKey] === 'string' && callEvent[key][subKey].startsWith('v=')) {
                  callEvent.payload.sdp = callEvent[key][subKey];
                  console.log(`Found SDP in callEvent.${key}.${subKey}`);
                  break;
                }
              }
              if (callEvent.payload.sdp) break;
            }
          }
        }
        
        if (!callEvent.payload.sdp) {
          console.error('Could not find SDP in call event:', callEvent);
          return false;
        }
      }
      
      // Initialize the call (not as initiator)
      await this.initializeCall(callEvent.chatId, callEvent.callType, false);
      
      this.isCallActive = true;
      
      // Если у нас есть отложенные ICE-кандидаты, которые пришли до установки callId, 
      // теперь можем их отправить
      if (this.pendingIceCandidates.length > 0) {
        console.log(`Sending ${this.pendingIceCandidates.length} pending ICE candidates from handleOffer`);
        this.sendPendingIceCandidates();
      }
      
      return true;
    } catch (error) {
      console.error('Error handling offer:', error);
      return false;
    }
  }

  /**
   * Accept an incoming call
   * @param {object} callEvent - The call event containing the offer
   * @returns {Promise<boolean>} - Whether the call was accepted successfully
   */
  async acceptCall(callEvent) {
    try {
      console.log('Accepting call, callEvent:', callEvent);
      
      // Проверяем, является ли это уведомлением о групповом звонке без SDP
      const isGroupCallNotification = 
        (callEvent.type === 'CALL_NOTIFICATION' || callEvent.type === ChatEventTypes.CALL_NOTIFICATION) && 
        (!callEvent.payload?.sdp && !callEvent.sdp && !callEvent.offer);
      
      if (isGroupCallNotification) {
        console.log('Cannot proceed with standard acceptCall for group call without SDP');
        console.log('Use joinGroupCall instead for group calls');
        return false;
      }
      
      // Проверяем наличие SDP в payload (для 1:1 звонков)
      if (!callEvent.payload || !callEvent.payload.sdp) {
        console.error('No SDP in call event payload', callEvent);
        
        // Ищем SDP в разных местах
        if (!callEvent.payload) {
          callEvent.payload = {};
        }
        
        if (callEvent.sdp) {
          callEvent.payload.sdp = callEvent.sdp;
          console.log('Found SDP in callEvent.sdp');
        } else if (callEvent.payload.offer) {
          callEvent.payload.sdp = callEvent.payload.offer;
          console.log('Found SDP in callEvent.payload.offer');
        } else if (callEvent.offer) {
          callEvent.payload.sdp = callEvent.offer;
          console.log('Found SDP in callEvent.offer');
        } else {
          // Глубокий поиск SDP в объекте события
          for (const key in callEvent) {
            if (typeof callEvent[key] === 'string' && callEvent[key].startsWith('v=')) {
              callEvent.payload.sdp = callEvent[key];
              console.log(`Found SDP in callEvent.${key}`);
              break;
            } else if (typeof callEvent[key] === 'object' && callEvent[key]) {
              for (const subKey in callEvent[key]) {
                if (typeof callEvent[key][subKey] === 'string' && callEvent[key][subKey].startsWith('v=')) {
                  callEvent.payload.sdp = callEvent[key][subKey];
                  console.log(`Found SDP in callEvent.${key}.${subKey}`);
                  break;
                }
              }
              if (callEvent.payload.sdp) break;
            }
          }
        }
        
        if (!callEvent.payload.sdp) {
          return false;
        }
      }
      
      console.log('SDP offer from payload:', callEvent.payload.sdp);
      
      // Create an answer to the offer
      const answerSdp = await this.createAnswer(callEvent.payload.sdp);
      
      // Send the answer
      answerCall(callEvent.chatId, callEvent.callId, answerSdp);
      
      // Send any pending ICE candidates now that we have a callId
      this.sendPendingIceCandidates();
      
      return true;
    } catch (error) {
      console.error('Error accepting call:', error);
      return false;
    }
  }

  /**
   * Handle an incoming answer to our offer
   * @param {object} callEvent - The call event containing the answer
   * @returns {Promise<boolean>} - Whether the answer was handled successfully
   */
  async handleAnswer(callEvent) {
    try {
      if (!this.peerConnection) {
        console.error('No peer connection established');
        return false;
      }
      
      console.log('Handling call answer:', callEvent);
      
      // Update current call ID if not set yet
      if (!this.currentCallId) {
        console.log(`Setting callId to ${callEvent.callId} from answer`);
        this.currentCallId = callEvent.callId;
        // Send any pending ICE candidates now that we have a callId
        this.sendPendingIceCandidates();
      }
      
      // Set the remote description using the received answer
      const answer = new RTCSessionDescription({
        type: 'answer',
        sdp: callEvent.payload.sdp
      });
      
      await this.peerConnection.setRemoteDescription(answer);
      
      this.isCallActive = true;
      
      // Add participant to active participants
      this.activeParticipants.set(callEvent.senderId, {
        name: callEvent.senderName,
        audio: true,
        video: this.callType === 'VIDEO'
      });
      
      return true;
    } catch (error) {
      console.error('Error handling answer:', error);
      return false;
    }
  }

  /**
   * Send any pending ICE candidates that were saved before callId was set
   */
  sendPendingIceCandidates() {
    if (!this.currentCallId || !this.currentChatId || this.pendingIceCandidates.length === 0) {
      return;
    }
    
    console.log(`Sending ${this.pendingIceCandidates.length} pending ICE candidates. CallId: ${this.currentCallId}, ChatId: ${this.currentChatId}`);
    
    this.pendingIceCandidates.forEach(candidate => {
      sendIceCandidate(this.currentChatId, this.currentCallId, candidate);
    });
    
    this.pendingIceCandidates = [];
  }

  /**
   * Handle an incoming ICE candidate
   * @param {object} callEvent - The call event containing the ICE candidate
   * @returns {Promise<boolean>} - Whether the candidate was added successfully
   */
  async handleIceCandidate(callEvent) {
    try {
      if (!this.peerConnection) {
        console.error('No peer connection established');
        return false;
      }
      
      // Add the ICE candidate to the peer connection
      const candidate = new RTCIceCandidate(callEvent.payload.candidate);
      await this.peerConnection.addIceCandidate(candidate);
      
      return true;
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
      return false;
    }
  }

  /**
   * Handle call ended event
   * @param {object} callEvent - The call event
   */
  handleCallEnded(callEvent) {
    if (callEvent.callId === this.currentCallId) {
      this.cleanupCall();
    } else if (this.activeParticipants.has(callEvent.senderId)) {
      // Remove participant if they left a group call
      this.activeParticipants.delete(callEvent.senderId);
      
      // Remove their stream if we have it
      if (this.remoteStreams.has(callEvent.senderId)) {
        const stream = this.remoteStreams.get(callEvent.senderId);
        
        if (this.onRemoteStreamRemoved) {
          this.onRemoteStreamRemoved(callEvent.senderId);
        }
        
        this.remoteStreams.delete(callEvent.senderId);
      }
    }
  }

  /**
   * Handle media status changes (audio/video toggle)
   * @param {object} callEvent - The call event
   */
  handleMediaStatusChange(callEvent) {
    if (callEvent.callId !== this.currentCallId) return;
    
    const { statusType, enabled } = callEvent.payload;
    const senderId = callEvent.senderId;
    
    // Update our tracking of participant media status
    if (this.activeParticipants.has(senderId)) {
      const participant = this.activeParticipants.get(senderId);
      
      if (statusType === CallEventType.TOGGLE_AUDIO) {
        participant.audio = enabled;
      } else if (statusType === CallEventType.TOGGLE_VIDEO) {
        participant.video = enabled;
      }
      
      this.activeParticipants.set(senderId, participant);
    }
  }

  /**
   * Wait for ICE gathering to complete
   * @returns {Promise<void>}
   */
  waitForIceGatheringComplete() {
    return new Promise(resolve => {
      if (this.peerConnection.iceGatheringState === 'complete') {
        resolve();
        return;
      }
      
      const checkState = () => {
        if (this.peerConnection.iceGatheringState === 'complete') {
          this.peerConnection.removeEventListener('icegatheringstatechange', checkState);
          resolve();
        }
      };
      
      this.peerConnection.addEventListener('icegatheringstatechange', checkState);
      
      // Timeout after 2 seconds to not block forever
      setTimeout(resolve, 2000);
    });
  }

  /**
   * Handle call disconnection
   */
  handleCallDisconnection() {
    if (this.isCallActive && this.currentCallId) {
      endCall(this.currentChatId, this.currentCallId);
      this.cleanupCall();
    }
  }

  /**
   * Clean up the call and release resources
   */
  cleanupCall() {
    // Stop all tracks in the local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    // Stop screen share if active
    if (this.screenShareStream) {
      this.screenShareStream.getTracks().forEach(track => track.stop());
      this.screenShareStream = null;
    }
    
    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    // Clear call state
    this.isCallActive = false;
    this.currentCallId = null;
    this.isInitiator = false; // Сбрасываем флаг инициатора
    this.remoteStreams.clear();
    this.activeParticipants.clear();
    this.pendingIceCandidates = [];
  }

  /**
   * Toggle local audio (mute/unmute)
   * @returns {boolean} - The new audio state (enabled/disabled)
   */
  toggleAudio() {
    if (!this.localStream) return false;
    
    const audioTrack = this.localStream.getAudioTracks()[0];
    if (!audioTrack) return false;
    
    const newState = !audioTrack.enabled;
    audioTrack.enabled = newState;
    
    // Notify other participants
    if (this.currentCallId) {
      updateMediaStatus(
        this.currentChatId,
        this.currentCallId,
        CallEventType.TOGGLE_AUDIO,
        newState
      );
    }
    
    return newState;
  }

  /**
   * Toggle local video (on/off)
   * @returns {boolean} - The new video state (enabled/disabled)
   */
  toggleVideo() {
    if (!this.localStream) return false;
    
    const videoTrack = this.localStream.getVideoTracks()[0];
    if (!videoTrack) return false;
    
    const newState = !videoTrack.enabled;
    videoTrack.enabled = newState;
    
    // Notify other participants
    if (this.currentCallId) {
      updateMediaStatus(
        this.currentChatId,
        this.currentCallId,
        CallEventType.TOGGLE_VIDEO,
        newState
      );
    }
    
    return newState;
  }

  /**
   * Start screen sharing
   * @returns {Promise<boolean>} - Whether screen sharing was started successfully
   */
  async startScreenSharing() {
    try {
      if (!this.peerConnection || !this.isCallActive) {
        console.error('Cannot start screen sharing: no active call');
        return false;
      }
      
      // Get screen capture stream
      this.screenShareStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false
      });
      
      // Replace the video track with the screen share track
      const videoSender = this.peerConnection.getSenders().find(
        sender => sender.track && sender.track.kind === 'video'
      );
      
      if (videoSender) {
        const screenTrack = this.screenShareStream.getVideoTracks()[0];
        await videoSender.replaceTrack(screenTrack);
        
        // Notify other participants
        if (this.currentCallId) {
          updateMediaStatus(
            this.currentChatId,
            this.currentCallId,
            CallEventType.SCREEN_SHARE_STARTED,
            true
          );
        }
        
        // Handle the case when user stops screen sharing from browser UI
        screenTrack.onended = () => this.stopScreenSharing();
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error starting screen sharing:', error);
      return false;
    }
  }

  /**
   * Stop screen sharing
   * @returns {Promise<boolean>} - Whether screen sharing was stopped successfully
   */
  async stopScreenSharing() {
    try {
      if (!this.screenShareStream || !this.peerConnection) {
        return false;
      }
      
      // Stop all tracks in the screen share stream
      this.screenShareStream.getTracks().forEach(track => track.stop());
      
      // Get the original video track from local stream (if any)
      const originalVideoTrack = this.localStream.getVideoTracks()[0];
      
      // Find the video sender
      const videoSender = this.peerConnection.getSenders().find(
        sender => sender.track && sender.track.kind === 'video'
      );
      
      if (videoSender && originalVideoTrack) {
        // Replace the screen share track with the original video track
        await videoSender.replaceTrack(originalVideoTrack);
      }
      
      this.screenShareStream = null;
      
      // Notify other participants
      if (this.currentCallId) {
        updateMediaStatus(
          this.currentChatId,
          this.currentCallId,
          CallEventType.SCREEN_SHARE_ENDED,
          false
        );
      }
      
      return true;
    } catch (error) {
      console.error('Error stopping screen sharing:', error);
      return false;
    }
  }

  /**
   * End the current call
   */
  endCurrentCall() {
    if (this.isCallActive && this.currentCallId) {
      endCall(this.currentChatId, this.currentCallId);
      this.cleanupCall();
    }
  }

  /**
   * Reject an incoming call
   * @param {object} callEvent - The call event
   */
  rejectIncomingCall(callEvent) {
    rejectCall(
      callEvent.chatId,
      callEvent.callId,
      callEvent.senderId,
      callEvent.senderName
    );
    
    this.cleanupCall();
  }

  /**
   * Join a group call by sending our own SDP offer
   * @param {object} callEvent - The call event
   * @param {string} offerSdp - Our SDP offer for the call
   * @returns {Promise<boolean>} - Whether joining the call was successful
   */
  async joinGroupCall(callEvent, offerSdp) {
    try {
      console.log('Joining group call with our own offer, callEvent:', callEvent);
      
      if (!callEvent.callId) {
        console.error('Cannot join call: No callId provided');
        return false;
      }
      
      // Set the call ID from the notification
      this.currentCallId = callEvent.callId;
      
      // Send our answer with our own SDP offer
      answerCall(callEvent.chatId, callEvent.callId, offerSdp);
      
      // Mark the call as active
      this.isCallActive = true;
      
      // Send any pending ICE candidates now that we have a callId
      this.sendPendingIceCandidates();
      
      return true;
    } catch (error) {
      console.error('Error joining group call:', error);
      return false;
    }
  }
}

// Create and export a singleton instance
const webRTCService = new WebRTCService();
export default webRTCService; 