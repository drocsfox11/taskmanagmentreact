import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import {wait} from "@testing-library/user-event/dist/utils";

const WS_URL = process.env.REACT_APP_WS_URL || 'http://localhost:8080';

let globalStompClient = null;
const subscriptions = {};
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

/**
 * Initialize the global STOMP client
 * @param {string} userId - The current user ID
 * @returns {Object} - The STOMP client instance
 */
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
      
      // Call any registered connection callbacks
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

/**
 * Get the global STOMP client
 * @returns {Object} - The STOMP client instance
 */
export const getStompClient = () => {
  return globalStompClient;
};

/**
 * Subscribe to a chat topic
 * @param {string} chatId - The ID of the chat to subscribe to
 * @param {function} handler - The message handler function
 * @returns {boolean} - Whether the subscription was successful
 */
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

/**
 * Subscribe to a board topic
 * @param {string} boardId - The ID of the board to subscribe to
 * @param {function} handler - The message handler function
 * @returns {boolean} - Whether the subscription was successful
 */
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

/**
 * Subscribe to user's private message queue
 * @param {function} handler - The message handler function
 * @returns {boolean} - Whether the subscription was successful
 */
export const subscribeToUserPrivateQueue = (handler) => {
  if (!globalStompClient || !globalStompClient.connected) {
    console.warn('Cannot subscribe to private queue, client not connected');
    return false;
  }

  const subscriptionKey = 'user-private';
  if (!subscriptions[subscriptionKey]) {
    console.log('Subscribing to user private queue');
    subscriptions[subscriptionKey] = globalStompClient.subscribe(
      '/user/queue/private',
      (message) => {
        try {
          const event = JSON.parse(message.body);
          console.log('Received private user event:', event);
          
          if (messageHandlers[subscriptionKey]) {
            messageHandlers[subscriptionKey](event);
          }
        } catch (error) {
          console.error('STOMP private message error:', error);
        }
      }
    );
    
    messageHandlers[subscriptionKey] = handler;
  } else if (handler) {
    // Update handler if subscription already exists
    messageHandlers[subscriptionKey] = handler;
  }

  return true;
};

/**
 * Unsubscribe from a specific topic
 * @param {string} topicKey - The topic key to unsubscribe from (e.g., 'chat-123' or 'board-456')
 * @returns {boolean} - Whether the unsubscription was successful
 */
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

/**
 * Unsubscribe from all chat topics except the specified one
 * @param {string} activeChatId - The ID of the chat to keep subscribed
 */
export const unsubscribeFromAllChatsExcept = (activeChatId) => {
  Object.keys(subscriptions).forEach(subscriptionKey => {
    if (subscriptionKey.startsWith('chat-') && subscriptionKey !== `chat-${activeChatId}`) {
      unsubscribeFromTopic(subscriptionKey);
    }
  });
};

/**
 * Unsubscribe from all board topics except the specified one
 * @param {string} activeBoardId - The ID of the board to keep subscribed
 */
export const unsubscribeFromAllBoardsExcept = (activeBoardId) => {
  Object.keys(subscriptions).forEach(subscriptionKey => {
    if (subscriptionKey.startsWith('board-') && subscriptionKey !== `board-${activeBoardId}`) {
      unsubscribeFromTopic(subscriptionKey);
    }
  });
};

/**
 * Send a message to a board topic
 * @param {string} boardId - The ID of the board to send to
 * @param {string} action - The action type
 * @param {object} payload - The payload to send
 * @returns {boolean} - Whether the message was sent successfully
 */
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

/**
 * Register a callback to be executed when connection is established
 * @param {function} callback - Function to call when connection is ready
 */
export const onConnect = (callback) => {
  if (globalStompClient && globalStompClient.connected) {
    // If already connected, execute immediately
    callback(globalStompClient);
  } else {
    // Otherwise, store for later execution
    connectionCallbacks.push(callback);
  }
};

/**
 * Clear connection callbacks when disconnecting
 */
export const disconnectWebSocket = () => {
  if (globalStompClient && globalStompClient.connected) {
    // Unsubscribe from all subscriptions
    Object.values(subscriptions).forEach(subscription => {
      if (subscription && subscription.unsubscribe) {
        subscription.unsubscribe();
      }
    });
    
    globalStompClient.deactivate();
    globalStompClient = null;
    
    // Clear subscriptions and handlers
    Object.keys(subscriptions).forEach(key => delete subscriptions[key]);
    Object.keys(messageHandlers).forEach(key => delete messageHandlers[key]);
    
    // Clear connection callbacks
    connectionCallbacks.length = 0;
    
    console.log('WebSocket disconnected');
  }
}; 