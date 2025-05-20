import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const WS_URL = process.env.REACT_APP_WS_URL || 'http://localhost:8080';

let globalStompClient = null;
const subscriptions = {};
let privateQueueSub = null;
const messageHandlers = {};

const connectionCallbacks = [];

export const ChatEventTypes = {
  NEW_MESSAGE: 'NEW_MESSAGE',
  USER_ROLE_CHANGED: 'USER_ROLE_CHANGED',
  USER_REMOVED: 'USER_REMOVED',
  USER_ADDED: 'USER_ADDED',
  MESSAGE_DELETED: 'MESSAGE_DELETED',
  MESSAGE_EDITED: 'MESSAGE_EDITED',
  MESSAGE_READED: 'MESSAGE_READED',
  CALL_NOTIFICATION: 'CALL_NOTIFICATION',
  CHAT_DELETED: 'CHAT_DELETED',
};

export const BoardEventTypes = {
  BOARD_UPDATED: 'BOARD_UPDATED',
  TAG_CREATED: 'TAG_CREATED',
  TAG_UPDATED: 'TAG_UPDATED',
  TAG_DELETED: 'TAG_DELETED',
  COLUMN_CREATED: 'COLUMN_CREATED',
  COLUMN_UPDATED: 'COLUMN_UPDATED',
  COLUMN_DELETED: 'COLUMN_DELETED',
  COLUMNS_REORDERED: 'COLUMNS_REORDERED',
  TASK_CREATED: 'TASK_CREATED',
  TASK_UPDATED: 'TASK_UPDATED',
  TASK_DELETED: 'TASK_DELETED',
  TASK_MOVED: 'TASK_MOVED'
};

export const CALL_MESSAGE_TYPE = {
  CALL_NOTIFICATION: 'CALL_NOTIFICATION',
  CALL_ACCEPTED: 'CALL_ACCEPTED',
  CALL_REJECTED: 'CALL_REJECTED',
  CALL_ENDED: 'CALL_ENDED',
  OFFER: 'OFFER',
  ANSWER: 'ANSWER',
  ICE_CANDIDATE: 'ICE_CANDIDATE',
  MEDIA_STATUS: 'MEDIA_STATUS'
};


export const initializeWebSocketConnection = (userId) => {

  if (!userId) {
    console.error('Cannot create WebSocket connection without userId');
    return null;
  }

  if (!globalStompClient) {
    console.log(`Initializing global WebSocket connection for user ${userId}`);
    
    const socket = new SockJS(`${WS_URL}/ws`, {
      method: 'GET',
      credentials: 'include',
    });

    const client = new Client({
      webSocketFactory: () => socket,
      debug: (str) => {
        console.log(`STOMP`, str);
      },
      reconnectDelay: 500,
      heartbeatIncoming: 400,
      heartbeatOutgoing: 400,
    });
    
    client.onConnect = (frame) => {
      console.log(`WebSocket connection established for user ${userId}:`, frame);
      
      connectionCallbacks.forEach(callback => callback(globalStompClient));
    };
    
    client.onStompError = (frame) => {
      console.error(`STOMP error for user ${userId}:`, frame.headers['message'], frame.body, frame);
    };
    
    client.onWebSocketError = (event) => {
      console.error(`WebSocket error for user ${userId}:`, event);
    };
    
    client.onDisconnect = () => {
      console.log(`STOMP disconnected for user ${userId}`);
    };
    
    client.beforeConnect = () => {
      console.log(`Attempting to connect to STOMP server for user ${userId}...`);
    };
    
    client.activate();
    
    globalStompClient = client;
  }

  return globalStompClient;
};


export const getStompClient = () => {
  return globalStompClient;
};


export const subscribeToChatTopic = (chatId, handler) => {
  console.log(`Оформляем подписку на чат ${chatId}`);
  if (!globalStompClient || !globalStompClient.connected) {
    console.log(globalStompClient);
    console.warn(`Cannot subscribe to chat ${chatId}, client not connected`);
    return false;
  }

  const subscriptionKey = `chat-${chatId}`;
  if (!subscriptions[subscriptionKey]) {
    console.log(`Subscribing to chat ${chatId}`);
    subscriptions[subscriptionKey] = globalStompClient.subscribe(
      `/topic/chat/${chatId}`,
      (message) => {
        try {
          const event = JSON.parse(message.body);
          console.log(`Received chat ${chatId} event:`, event);
          
          if (messageHandlers[subscriptionKey]) {
            messageHandlers[subscriptionKey](event);
          }
        } catch (error) {
          console.error('STOMP message error:', error);
        }
      }
    );
    
    messageHandlers[subscriptionKey] = handler;
  } else if (handler) {
    console.log(`Подписка на чат ${chatId} уже оформлена`);

    messageHandlers[subscriptionKey] = handler;
  }

  return true;
};


export const subscribeToBoardTopic = (boardId, handler) => {
  if (!globalStompClient || !globalStompClient.connected) {
    console.warn(`Cannot subscribe to board ${boardId}, client not connected`);
    return false;
  }

  const subscriptionKey = `board-${boardId}`;
  if (!subscriptions[subscriptionKey]) {
    console.log(`Subscribing to board ${boardId}`);
    subscriptions[subscriptionKey] = globalStompClient.subscribe(
      `/topic/boards/${boardId}`,
      (message) => {
        try {
          const event = JSON.parse(message.body);
          console.log(`Received board ${boardId} event:`, event);
          
          if (messageHandlers[subscriptionKey]) {
            messageHandlers[subscriptionKey](event);
          }
        } catch (error) {
          console.error('STOMP message error:', error);
        }
      }
    );
    
    messageHandlers[subscriptionKey] = handler;
  } else if (handler) {
    messageHandlers[subscriptionKey] = handler;
  }

  return true;
};


export const subscribeToUserPrivateQueue = (callback) => {
  const stompClient = getStompClient();
  if (!stompClient) {
    console.error('Cannot subscribe to private queue: no STOMP client');
    return null;
  }

  if (privateQueueSub) {
    if (callback) privateQueueSub.callback = callback;
    console.log('Private queue already subscribed');
    return privateQueueSub;
  }

  const subscription = stompClient.subscribe('/user/queue/private', (message) => {
    try {
      const event = JSON.parse(message.body);
      console.log('Received private queue message:', event);

      if (event.type && event.type.startsWith('CALL_')) {
        console.log(`Processing call message: ${event.type}`);
        
        const callEvent = {
          type: event.type,
          chatId: event.chatId,
          callId: event.callId,
          callType: event.callType,
          senderId: event.senderId,
          senderName: event.senderName,
          payload: event.payload || event
        };

        if (event.type === CALL_MESSAGE_TYPE.CALL_ACCEPTED) {
          console.log('Processing CALL_ACCEPTED event:', event);
          if (window.callManagerRef && typeof window.callManagerRef._handleCallMessage === 'function') {
            window.callManagerRef._handleCallMessage(callEvent);
          }
          return;
        }

        if (event.type === CALL_MESSAGE_TYPE.ANSWER) {
          console.log('Processing ANSWER event:', event);
          if (window.callManagerRef && typeof window.callManagerRef._handleCallMessage === 'function') {
            const answerData = event.payload || event;
            const answerObj = {
              type: 'answer',
              sdp: answerData.sdp || (answerData.payload && answerData.payload.sdp)
            };
            
            if (!answerObj.sdp) {
              console.error('No SDP found in ANSWER message:', event);
              return;
            }
            
            const modifiedEvent = {
              ...callEvent,
              formattedAnswer: answerObj
            };
            
            window.callManagerRef._handleCallMessage(modifiedEvent);
          }
          return;
        }

        if (window.callManagerRef && typeof window.callManagerRef._handleCallMessage === 'function') {
          window.callManagerRef._handleCallMessage(callEvent);
        }
        return;
      }

      if (callback) {
        callback(event);
      }
    } catch (error) {
      console.error('Error processing private queue message:', error);
    }
  });

  privateQueueSub = subscription;
  privateQueueSub.callback = callback;
  return privateQueueSub;
};


export const unsubscribeFromTopic = async (topicKey) => {
  if (subscriptions[topicKey]) {
    console.log(`Unsubscribing from ${topicKey}`);
    subscriptions[topicKey].unsubscribe();
    delete subscriptions[topicKey];
    delete messageHandlers[topicKey];
    return true;
  }
  return false;
};


export const unsubscribeFromAllChatsExcept = (activeChatId) => {
  Object.keys(subscriptions).forEach(subscriptionKey => {
    if (subscriptionKey.startsWith('chat-') && subscriptionKey !== `chat-${activeChatId}`) {
      unsubscribeFromTopic(subscriptionKey);
    }
  });
};


export const unsubscribeFromAllBoardsExcept = (activeBoardId) => {
  Object.keys(subscriptions).forEach(subscriptionKey => {
    if (subscriptionKey.startsWith('board-') && subscriptionKey !== `board-${activeBoardId}`) {
      unsubscribeFromTopic(subscriptionKey);
    }
  });
};


export const sendBoardAction = (boardId, action, payload) => {
  if (!globalStompClient || !globalStompClient.connected) {
    console.error(`Cannot send board action, client not connected`);
    return false;
  }

  globalStompClient.publish({
    destination: `/app/boards/${boardId}`,
    body: JSON.stringify({
      type: action,
      payload: { ...payload, socketEvent: true }
    })
  });
  
  console.log(`Sent ${action} to board ${boardId}:`, payload);
  return true;
};


export const onConnect = (callback) => {
  if (globalStompClient && globalStompClient.connected) {
    callback(globalStompClient);
  } else {
    connectionCallbacks.push(callback);
  }
};


export const disconnectWebSocket = () => {
  if (globalStompClient && globalStompClient.connected) {
    Object.values(subscriptions).forEach(subscription => {
      if (subscription && subscription.unsubscribe) {
        subscription.unsubscribe();
      }
    });
    
    globalStompClient.deactivate();
    globalStompClient = null;
    
    Object.keys(subscriptions).forEach(key => delete subscriptions[key]);
    Object.keys(messageHandlers).forEach(key => delete messageHandlers[key]);
    
    connectionCallbacks.length = 0;
    
    console.log('WebSocket disconnected');
  }
}; 