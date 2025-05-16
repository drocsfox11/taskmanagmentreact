// Call notification types
export interface CallNotification {
  type: 'CALL_NOTIFICATION';
  chatId: number;
  callId: string;
  senderId: number;
  callType: 'AUDIO' | 'VIDEO';
  sdp: string; // Now required for p2p calls
  isGroupChat?: boolean; // To differentiate between p2p and group calls
}

// For backward compatibility with existing code
export interface GroupCallNotification {
  type: 'CALL_NOTIFICATION';
  chatId: number;
  callId: string;
  senderId: number;
  callType: 'AUDIO' | 'VIDEO';
  isGroupChat: true;
  // No sdp field required for group calls
}

// Union type for both kinds of call notifications
export type AnyCallNotification = CallNotification | GroupCallNotification;

// Strict type for call payload
export type CallPayload = {
  sdp?: string;
  candidate?: RTCIceCandidateInit;
  offer?: string; // Alternative field for SDP
  answer?: string; // Alternative field for SDP
  invitedUserId?: number; // For call invitations
  participantId?: number; // For participant-specific events
};

// Call event base interface
export interface CallEventBase {
  type: string;
  chatId: number;
  callId: string;
  senderId: number;
  payload?: CallPayload;
  sdp?: string; // For backward compatibility
}

// Call answer event
export interface CallAnswer extends CallEventBase {
  type: 'CALL_ANSWER' | 'ANSWER';
  payload: {
    sdp: string; // Answer SDP is required
  };
}

// ICE candidate event 
export interface IceCandidateEvent extends CallEventBase {
  type: 'ICE_CANDIDATE';
  payload: {
    candidate: RTCIceCandidateInit;
  };
} 