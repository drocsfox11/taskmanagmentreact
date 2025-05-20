export interface CallNotification {
  type: 'CALL_NOTIFICATION';
  chatId: number;
  callId: string;
  senderId: number;
  callType: 'AUDIO' | 'VIDEO';
  sdp: string;
  isGroupChat?: boolean;
}

export interface GroupCallNotification {
  type: 'CALL_NOTIFICATION';
  chatId: number;
  callId: string;
  senderId: number;
  callType: 'AUDIO' | 'VIDEO';
  isGroupChat: true;

}

export type AnyCallNotification = CallNotification | GroupCallNotification;

export type CallPayload = {
  sdp?: string;
  candidate?: RTCIceCandidateInit;
  offer?: string;
  answer?: string;
  invitedUserId?: number;
  participantId?: number;
};

export interface CallEventBase {
  type: string;
  chatId: number;
  callId: string;
  senderId: number;
  payload?: CallPayload;
  sdp?: string;
}

export interface CallAnswer extends CallEventBase {
  type: 'CALL_ANSWER' | 'ANSWER';
  payload: {
    sdp: string;
  };
}

export interface IceCandidateEvent extends CallEventBase {
  type: 'ICE_CANDIDATE';
  payload: {
    candidate: RTCIceCandidateInit;
  };
} 