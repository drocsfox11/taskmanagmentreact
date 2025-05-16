import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import {wait} from "@testing-library/user-event/dist/utils";

const WS_URL = process.env.REACT_APP_WS_URL || 'http://localhost:8080';

let globalStompClient = null;
const subscriptions = {};
const messageHandlers = {};

const connectionCallbacks = [];

// Maximum reconnection attempts
const MAX_RECONNECT_ATTEMPTS = 5;
let reconnectAttempts = 0;
let reconnectTimeoutId = null;

export const ChatEventTypes = {
  NEW_MESSAGE: 'NEW_MESSAGE',
  USER_ROLE_CHANGED: 'USER_ROLE_CHANGED',
  USER_REMOVED: 'USER_REMOVED',
  USER_ADDED: 'USER_ADDED',
  MESSAGE_DELETED: 'MESSAGE_DELETED',
  MESSAGE_EDITED: 'MESSAGE_EDITED',
  MESSAGE_READED: 'MESSAGE_READED',
  CALL_NOTIFICATION: 'CALL_NOTIFICATION',
  CALL_STARTED: 'CALL_STARTED',
  CALL_ENDED: 'CALL_ENDED',
  CALL_REJECTED: 'CALL_REJECTED',
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
 * Вспомогательная функция для глубокого анализа объекта события
 * @param {object} event - Событие для анализа 
 * @returns {string} - Текстовое представление структуры
 */
const analyzeEventStructure = (event) => {
  if (!event) return 'Event is null or undefined';
  
  try {
    const properties = [];
    
    // Основные свойства
    properties.push(`Type: ${event.type || 'unknown'}`);
    if (event.chatId) properties.push(`ChatId: ${event.chatId}`);
    if (event.callId) properties.push(`CallId: ${event.callId}`);
    if (event.senderId) properties.push(`SenderId: ${event.senderId}`);
    
    // Поиск SDP в разных местах
    let sdpLocation = 'Not found';
    
    if (event.payload && event.payload.sdp) {
      sdpLocation = 'event.payload.sdp';
    } else if (event.sdp) {
      sdpLocation = 'event.sdp';
    } else if (event.payload && event.payload.offer) {
      sdpLocation = 'event.payload.offer';
    } else if (event.offer) {
      sdpLocation = 'event.offer';
    } else {
      // Глубокий поиск
      for (const key in event) {
        if (typeof event[key] === 'string' && event[key].startsWith('v=')) {
          sdpLocation = `event.${key}`;
          break;
        } else if (typeof event[key] === 'object' && event[key]) {
          for (const subKey in event[key]) {
            if (typeof event[key][subKey] === 'string' && event[key][subKey].startsWith('v=')) {
              sdpLocation = `event.${key}.${subKey}`;
              break;
            }
          }
        }
      }
    }
    
    properties.push(`SDP Location: ${sdpLocation}`);
    
    // Payload structure
    if (event.payload) {
      const payloadKeys = Object.keys(event.payload);
      properties.push(`Payload keys: ${payloadKeys.join(', ')}`);
    }
    
    return properties.join('\n');
  } catch (error) {
    return `Error analyzing event: ${error.message}`;
  }
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
    console.log(`Инициализация WebSocket соединения для пользователя ${userId}`);
    
    try {
      const socket = new SockJS(`${WS_URL}/ws`, {
        method: 'GET',
        credentials: 'include',
      });

      const client = new Client({
        webSocketFactory: () => socket,
        debug: (str) => {
          console.log(`STOMP`, str);
        },
        reconnectDelay: 1000, // Increased from 500ms
        heartbeatIncoming: 4000, // Increased from 400ms
        heartbeatOutgoing: 4000, // Increased from 400ms
        maxWebSocketFrameSize: 16 * 1024,
      });
      
      client.onConnect = (frame) => {
        console.log(`WebSocket соединение установлено для пользователя ${userId}:`, frame);
        
        // Reset reconnect attempts on successful connection
        reconnectAttempts = 0;
        
        // Call any registered connection callbacks
        connectionCallbacks.forEach(callback => callback(globalStompClient));
      };
      
      client.onStompError = (frame) => {
        console.error(`STOMP ошибка для пользователя ${userId}:`, frame.headers['message'], frame.body, frame);
        
        // Handle specific STOMP errors
        const errorMessage = frame.headers['message'];
        if (errorMessage.includes('Failed to send message')) {
          console.warn('Detected message sending failure, will attempt reconnection');
          handleReconnection(userId);
        }
      };
      
      client.onWebSocketError = (event) => {
        console.error(`WebSocket ошибка для пользователя ${userId}:`, event);
        
        // Attempt to reconnect on WebSocket errors
        handleReconnection(userId);
      };
      
      client.onDisconnect = () => {
        console.log(`STOMP отключен для пользователя ${userId}`);
      };
      
      client.beforeConnect = () => {
        console.log(`Попытка подключения к STOMP серверу для пользователя ${userId}...`);
      };
      
      client.activate();
      
      globalStompClient = client;
      
      console.log(`WebSocket клиент инициализирован для пользователя ${userId}`);
    } catch (error) {
      console.error(`Ошибка при инициализации WebSocket для пользователя ${userId}:`, error);
      return null;
    }
  } else {
    console.log(`WebSocket клиент уже инициализирован для пользователя`);
  }

  return globalStompClient;
};

/**
 * Handle reconnection attempts with backoff strategy
 * @param {string} userId - The current user ID
 */
const handleReconnection = (userId) => {
  // Clear any existing timeout
  if (reconnectTimeoutId) {
    clearTimeout(reconnectTimeoutId);
  }
  
  reconnectAttempts++;
  
  if (reconnectAttempts <= MAX_RECONNECT_ATTEMPTS) {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), 30000);
    
    console.log(`Scheduling reconnection attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`);
    
    reconnectTimeoutId = setTimeout(() => {
      console.log(`Attempting reconnection ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}`);
      
      // Close existing connection if it exists
      if (globalStompClient) {
        try {
          globalStompClient.deactivate();
        } catch (e) {
          console.error('Error deactivating existing connection:', e);
        }
        globalStompClient = null;
      }
      
      // Initialize a new connection
      initializeWebSocketConnection(userId);
    }, delay);
  } else {
    console.error(`Maximum reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached`);
  }
};

/**
 * Get the global STOMP client
 * @returns {Object} - The STOMP client instance
 */
export const getStompClient = () => {
  return globalStompClient;
};

/**
 * Check if the WebSocket connection is active and connected
 * @returns {boolean} - Whether the connection is active
 */
export const isWebSocketConnected = () => {
  return globalStompClient && globalStompClient.connected;
};

/**
 * Force a reconnection attempt
 * @param {string} userId - The current user ID
 */
export const forceReconnect = (userId) => {
  reconnectAttempts = 0;
  handleReconnection(userId);
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
          
          // Для событий типа CALL_* глубокий анализ структуры
          if (event.type && (
              event.type.includes('CALL_') || 
              event.type === 'OFFER' || 
              event.type === 'ANSWER' || 
              event.type === 'ICE_CANDIDATE'
          )) {
            console.log('🔍 WebRTC Call Event Analysis:');
            console.log(analyzeEventStructure(event));
            
            // Особый случай: проверка SDP
            try {
              if (event.type === 'CALL_NOTIFICATION' || event.type === 'OFFER') {
                // Ищем SDP
                let sdpContent = null;
                
                if (event.payload && event.payload.sdp) {
                  sdpContent = event.payload.sdp;
                } else if (event.sdp) {
                  sdpContent = event.sdp;
                } else if (event.payload && event.payload.offer) {
                  sdpContent = event.payload.offer;
                } else if (event.offer) {
                  sdpContent = event.offer;
                }
                
                if (sdpContent) {
                  console.log('✅ SDP found and looks valid:', sdpContent.substring(0, 100) + '...');
                } else {
                  console.log('❌ No valid SDP found in event');
                }
              }
            } catch (e) {
              console.error('Error analyzing SDP:', e);
            }
          }
          
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