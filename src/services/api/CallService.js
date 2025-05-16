import { onConnect, isWebSocketConnected, getStompClient } from './WebSocketService';

// Call types
export const CallType = {
  AUDIO: 'AUDIO',
  VIDEO: 'VIDEO'
};

// Call event types
export const CallEventType = {
  // WebRTC signaling events
  OFFER: 'OFFER',
  ANSWER: 'ANSWER',
  ICE_CANDIDATE: 'ICE_CANDIDATE',
  
  // Call status events
  CALL_STARTED: 'CALL_STARTED',
  CALL_ENDED: 'CALL_ENDED',
  CALL_REJECTED: 'CALL_REJECTED',
  CALL_MISSED: 'CALL_MISSED',
  
  // Notifications
  CALL_NOTIFICATION: 'CALL_NOTIFICATION',
  CALL_INVITE: 'CALL_INVITE',
  
  // Media management
  TOGGLE_AUDIO: 'TOGGLE_AUDIO',
  TOGGLE_VIDEO: 'TOGGLE_VIDEO',
  SCREEN_SHARE_STARTED: 'SCREEN_SHARE_STARTED',
  SCREEN_SHARE_ENDED: 'SCREEN_SHARE_ENDED'
};

// Queue for actions when WebSocket is disconnected
const pendingActions = [];

/**
 * Start a new call
 * @param {string} chatId - Chat ID where the call is taking place
 * @param {string} callType - Type of call (AUDIO or VIDEO)
 * @param {string} offerSdp - SDP offer for WebRTC
 * @returns {boolean} - Whether the request was sent successfully
 */
export const startCall = (chatId, callType, offerSdp) => {
  if (!isWebSocketConnected()) {
    console.error('Cannot start call: WebSocket not connected');
    queueAction(() => startCall(chatId, callType, offerSdp));
    return false;
  }

  const stompClient = getStompClient();
  stompClient.publish({
    destination: '/app/call/start',
    body: JSON.stringify({
      chatId,
      callType,
      sdp: offerSdp
    })
  });

  console.log(`Call initiation request sent for chat ${chatId} (${callType})`);
  return true;
};

/**
 * Answer an incoming call
 * @param {string} chatId - Chat ID where the call is taking place
 * @param {string} callId - ID of the call being answered
 * @param {string} answerSdp - SDP answer for WebRTC
 * @returns {boolean} - Whether the request was sent successfully
 */
export const answerCall = (chatId, callId, answerSdp) => {
  if (!isWebSocketConnected()) {
    console.error('Cannot answer call: WebSocket not connected');
    queueAction(() => answerCall(chatId, callId, answerSdp));
    return false;
  }

  const stompClient = getStompClient();
  stompClient.publish({
    destination: '/app/call/answer',
    body: JSON.stringify({
      chatId,
      callId,
      sdp: answerSdp
    })
  });

  console.log(`Answer sent for call ${callId} in chat ${chatId}`);
  return true;
};

/**
 * Send an ICE candidate
 * @param {string} chatId - Chat ID where the call is taking place
 * @param {string} callId - ID of the call
 * @param {RTCIceCandidate} candidate - ICE candidate
 * @returns {boolean} - Whether the request was sent successfully
 */
export const sendIceCandidate = (chatId, callId, candidate) => {
  if (!isWebSocketConnected()) {
    console.error('Cannot send ICE candidate: WebSocket not connected');
    queueAction(() => sendIceCandidate(chatId, callId, candidate));
    return false;
  }

  const stompClient = getStompClient();
  stompClient.publish({
    destination: '/app/call/ice-candidate',
    body: JSON.stringify({
      chatId,
      callId,
      candidate
    })
  });

  console.log(`ICE candidate sent for call ${callId} in chat ${chatId}`);
  return true;
};

/**
 * End a call
 * @param {string} chatId - Chat ID where the call is taking place
 * @param {string} callId - ID of the call to end
 * @returns {boolean} - Whether the request was sent successfully
 */
export const endCall = (chatId, callId) => {
  if (!isWebSocketConnected()) {
    console.error('Cannot end call: WebSocket not connected');
    queueAction(() => endCall(chatId, callId));
    return false;
  }

  const stompClient = getStompClient();
  stompClient.publish({
    destination: '/app/call/end',
    body: JSON.stringify({
      chatId,
      callId
    })
  });

  console.log(`End call request sent for call ${callId} in chat ${chatId}`);
  return true;
};

/**
 * Reject an incoming call
 * @param {string} chatId - Chat ID where the call is taking place
 * @param {string} callId - ID of the call to reject
 * @param {string} senderId - ID of the user who sent the call
 * @param {string} senderName - Name of the user who sent the call
 * @returns {boolean} - Whether the request was sent successfully
 */
export const rejectCall = (chatId, callId, senderId, senderName) => {
  if (!isWebSocketConnected()) {
    console.error('Cannot reject call: WebSocket not connected');
    queueAction(() => rejectCall(chatId, callId, senderId, senderName));
    return false;
  }

  const stompClient = getStompClient();
  stompClient.publish({
    destination: '/app/call/reject',
    body: JSON.stringify({
      chatId,
      callId,
      senderId,
      senderName
    })
  });

  console.log(`Reject call request sent for call ${callId} in chat ${chatId}`);
  return true;
};

/**
 * Update media status (audio/video toggle)
 * @param {string} chatId - Chat ID where the call is taking place
 * @param {string} callId - ID of the call
 * @param {string} statusType - Type of status update (TOGGLE_AUDIO/TOGGLE_VIDEO)
 * @param {boolean} enabled - Whether the media is enabled or disabled
 * @returns {boolean} - Whether the request was sent successfully
 */
export const updateMediaStatus = (chatId, callId, statusType, enabled) => {
  if (!isWebSocketConnected()) {
    console.error('Cannot update media status: WebSocket not connected');
    queueAction(() => updateMediaStatus(chatId, callId, statusType, enabled));
    return false;
  }

  const stompClient = getStompClient();
  stompClient.publish({
    destination: '/app/call/media-status',
    body: JSON.stringify({
      chatId,
      callId,
      statusType,
      enabled
    })
  });

  console.log(`Media status update (${statusType}: ${enabled}) sent for call ${callId}`);
  return true;
};

/**
 * Add an action to the pending queue when WebSocket is disconnected
 * @param {function} action - The action to queue
 */
const queueAction = (action) => {
  pendingActions.push(action);
  console.log(`Action queued for later execution. Queue size: ${pendingActions.length}`);
};

/**
 * Retry all pending call actions
 * @returns {number} - Number of actions retried
 */
export const retryPendingCallActions = () => {
  if (!isWebSocketConnected() || pendingActions.length === 0) {
    return 0;
  }

  const actionsToRetry = [...pendingActions];
  pendingActions.length = 0;

  console.log(`Retrying ${actionsToRetry.length} pending call actions`);
  
  actionsToRetry.forEach(action => action());
  
  return actionsToRetry.length;
};

// Set up listener to retry pending actions when WebSocket reconnects
onConnect(() => {
  retryPendingCallActions();
}); 