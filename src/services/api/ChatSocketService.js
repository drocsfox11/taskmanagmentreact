import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const WS_URL = process.env.REACT_APP_WS_URL || 'http://localhost:8080';

// Event types from backend
export const ChatEventTypes = {
  NEW_MESSAGE: 'NEW_MESSAGE',
  USER_ROLE_CHANGED: 'USER_ROLE_CHANGED',
  USER_REMOVED: 'USER_REMOVED',
  USER_ADDED: 'USER_ADDED',
  MESSAGE_DELETED: 'MESSAGE_DELETED',
  MESSAGE_EDITED: 'MESSAGE_EDITED',
};

// Global chat socket connections map
const chatSocketConnections = {};

/**
 * Creates or gets an existing chat socket connection for a user and chat
 */
export const getChatSocketConnection = (userId, activeChatId = null) => {
  if (!userId) {
    console.error('Cannot create chat socket connection without userId');
    return null;
  }

  // Create global connection if it doesn't exist
  if (!chatSocketConnections[userId]) {
    const socket = new SockJS(`${WS_URL}/ws`, {
      method: 'GET',
      credentials: 'include',
    });

    const client = new Client({
      webSocketFactory: () => socket,
      debug: (str) => {
        console.log(`STOMP: ${str}`);
      },
      reconnectDelay: 500,
      heartbeatIncoming: 400,
      heartbeatOutgoing: 400,
    });

    const subscriptions = {};
    const messageHandlers = {};
    
    client.onConnect = (frame) => {
      console.log(`Chat socket connection established for user ${userId}:`, frame);
      
      // If there's an active chat, subscribe to it
      if (activeChatId && !subscriptions[`chat-${activeChatId}`]) {
        subscribeToChat(activeChatId);
      }
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
    
    const subscribeToChat = (chatId) => {
      if (!client.connected) {
        console.log(client)
        console.warn(`Cannot subscribe to chat ${chatId}, client not connected for user ${userId}`);
        return false;
      }

      if (!subscriptions[`chat-${chatId}`]) {
        console.log(`Subscribing to chat ${chatId} for user ${userId}`);
        subscriptions[`chat-${chatId}`] = client.subscribe(
          `/topic/chat/${chatId}`,
          (message) => {
            try {
              const event = JSON.parse(message.body);
              console.log(`Received chat ${chatId} event:`, event);
              
              if (messageHandlers[chatId]) {
                messageHandlers[chatId](event);
              }
            } catch (error) {
              console.error('STOMP message error:', error);
            }
          }
        );
      }

      return true;
    };

    // Unsubscribe from a specific chat channel
    const unsubscribeFromChat = (chatId) => {
      const subscriptionKey = `chat-${chatId}`;
      if (subscriptions[subscriptionKey]) {
        console.log(`Unsubscribing from chat ${chatId} for user ${userId}`);
        subscriptions[subscriptionKey].unsubscribe();
        delete subscriptions[subscriptionKey];
        return true;
      }
      return false;
    };
    
    // Unsubscribe from all chats except the active one
    const unsubscribeFromAllExcept = (activeChatId) => {
      Object.keys(subscriptions).forEach(subscriptionKey => {
        const chatId = subscriptionKey.replace('chat-', '');
        if (chatId !== activeChatId.toString()) {
          unsubscribeFromChat(chatId);
        }
      });
    };

    // Set message handler for a specific chat
    const setMessageHandler = (chatId, handler) => {
      messageHandlers[chatId] = handler;
    };

    // Disconnect and clean up
    const disconnect = () => {
      // Unsubscribe from all subscriptions
      Object.values(subscriptions).forEach(subscription => {
        if (subscription && subscription.unsubscribe) {
          subscription.unsubscribe();
        }
      });

      if (client.connected) {
        client.deactivate();
      }
      
      delete chatSocketConnections[userId];
    };

    chatSocketConnections[userId] = {
      client,
      subscriptions,
      messageHandlers,
      subscribeToChat,
      unsubscribeFromChat,
      unsubscribeFromAllExcept,
      setMessageHandler,
      disconnect,
    };
  }

  return chatSocketConnections[userId];
};

// Disconnect all connections
export const disconnectAllChatSockets = () => {
  Object.values(chatSocketConnections).forEach(connection => {
    if (connection && connection.disconnect) {
      connection.disconnect();
    }
  });
};

