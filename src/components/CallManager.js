import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { CallEventType, retryPendingCallActions } from '../services/api/CallService';
import webRTCService from '../services/WebRTCService';
import { 
  subscribeToUserPrivateQueue, 
  subscribeToChatTopic, 
  unsubscribeFromTopic, 
  onConnect,
  isWebSocketConnected,
  ChatEventTypes
} from '../services/api/WebSocketService';
import IncomingCallNotification from './IncomingCallNotification';
import CallUI from './CallUI';

// This component handles WebRTC calls across the application
const CallManager = ({ currentUser }) => {
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [callParticipants, setCallParticipants] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState(isWebSocketConnected() ? 'connected' : 'disconnected');
  const location = useLocation();

  useEffect(() => {
    console.log("CallManager mounted with user:", currentUser);
  }, []);

  // Проверяем, если WebRTCService уже имеет активный звонок, но UI не отображается
  useEffect(() => {
    if (webRTCService.isCallActive && !activeCall) {
      console.log("Detected active call in WebRTCService but UI not showing - updating UI");
      // Создаем базовую информацию о звонке
      const callInfo = {
        chatId: webRTCService.currentChatId,
        callId: webRTCService.currentCallId,
        callType: webRTCService.callType,
        isInitiator: webRTCService.isInitiator
      };
      setActiveCall(callInfo);
    }
  }, [activeCall]);

  // Set up WebSocket subscriptions for call events
  useEffect(() => {
    if (!currentUser?.id) {
      console.log("No current user, skipping CallManager setup");
      return;
    }

    console.log("Setting up CallManager for user:", currentUser.id);

    // Subscribe to private queue for direct call events
    const subscribeToPrivateQueue = () => {
      console.log("Subscribing to private queue for call events");
      subscribeToUserPrivateQueue(handleCallEvent);
    };

    // First try to subscribe immediately if already connected
    if (isWebSocketConnected()) {
      subscribeToPrivateQueue();
      setConnectionStatus('connected');
      console.log("WebSocket already connected, subscribed to private queue");
    } else {
      setConnectionStatus('disconnected');
      console.log("WebSocket not connected, will subscribe when connected");
    }

    // Set up handler for WebSocket reconnections
    const handleConnection = () => {
      console.log('WebSocket connection established, retrying subscriptions');
      subscribeToPrivateQueue();
      setConnectionStatus('connected');
      
      // Retry any pending call actions
      const retriedCount = retryPendingCallActions();
      if (retriedCount > 0) {
        console.log(`Retried ${retriedCount} pending call actions`);
      }
      
      // If there's an active call, resubscribe to its chat topic
      if (activeCall) {
        subscribeToChatTopic(activeCall.chatId, handleCallEvent);
      }
    };

    // Register the connection handler
    onConnect(handleConnection);

    // Set up connection status check
    const connectionCheckInterval = setInterval(() => {
      const isConnected = isWebSocketConnected();
      setConnectionStatus(isConnected ? 'connected' : 'disconnected');
    }, 5000);

    // Обработчик пользовательских событий звонков из чатов
    const handleCustomCallEvent = (e) => {
      console.log('Received custom call event:', e.detail);
      // Передаем событие в общий обработчик звонков
      handleCallEvent(e.detail);
    };

    // Добавляем обработчик пользовательских событий
    window.addEventListener('call-event', handleCustomCallEvent);

    // Clean up subscriptions on unmount
    return () => {
      console.log("Cleaning up CallManager subscriptions");
      unsubscribeFromTopic('user-private');
      clearInterval(connectionCheckInterval);
      window.removeEventListener('call-event', handleCustomCallEvent);
    };
  }, [currentUser, activeCall]);

  // Handle WebRTC call events
  const handleCallEvent = async (event) => {
    console.log('Received call event in CallManager:', event);

    if (!event || !event.type) return;

    // Если событие пришло через CustomEvent, извлекаем детали
    if (event.detail && event.detail.type) {
      event = event.detail;
      console.log('Extracted call event from CustomEvent:', event);
    }

    // Убедимся, что у нас есть правильная структура события
    if (!event.chatId || (!event.callId && event.type !== 'OFFER')) {
      console.warn('Incomplete call event received, missing chatId or callId:', event);
    }

    // Убедимся, что payload существует и содержит нужные данные
    if (event.type === 'OFFER' || event.type === 'CALL_NOTIFICATION' || event.type === ChatEventTypes.CALL_NOTIFICATION) {
      if (!event.payload) {
        event.payload = {}; // Создаем объект payload, если его нет
      }
      
      console.log('Processing offer/call notification event:', event);
      
      // Проверяем, есть ли SDP в событии
      if (!event.payload.sdp && event.sdp) {
        event.payload.sdp = event.sdp;
        console.log('Moved SDP from event.sdp to event.payload.sdp');
      }
    }

    switch (event.type) {
      case CallEventType.OFFER:
      case 'CALL_NOTIFICATION': // Обрабатываем также строковый тип без константы
        // Если сам пользователь инициировал звонок, не показываем ему уведомление о входящем звонке
        if (event.senderId === currentUser?.id) {
          console.log("Ignoring incoming call notification: user is the call initiator");
          // Если у нас еще нет активного звонка, устанавливаем его напрямую без показа уведомления
          if (!activeCall) {
            console.log("Setting active call directly as initiator");
            setActiveCall(event);
            // Можно также добавить автоматическую подписку на чат для звонковых событий
            if (event.chatId) {
              subscribeToChatTopic(event.chatId, handleCallEvent);
            }
          }
        } else if (!activeCall) {
          // Проверяем, является ли это уведомлением о групповом звонке
          const isGroupChat = event.isGroupChat || (event.participants && event.participants.length > 2);
          console.log(`Call notification received. Is group chat: ${isGroupChat}`);
          
          // Важно: для CALL_NOTIFICATION нужно проверить и извлечь SDP из самого объекта события
          // Событие может содержать SDP в разных местах, в зависимости от структуры данных от сервера
          if (event.type === 'CALL_NOTIFICATION' || event.type === ChatEventTypes.CALL_NOTIFICATION) {
            console.log("Checking for SDP in event:", event);
            
            // В случае группового чата, SDP может отсутствовать намеренно
            if (isGroupChat) {
              console.log("Group chat call notification - SDP may not be present by design");
            } else {
              // Ищем SDP в разных возможных местах для 1:1 чатов
              if (!event.payload.sdp) {
                if (event.sdp) {
                  event.payload.sdp = event.sdp;
                  console.log("Found SDP in event.sdp");
                } else if (event.payload.offer) {
                  event.payload.sdp = event.payload.offer;
                  console.log("Found SDP in event.payload.offer");
                } else if (event.offer) {
                  event.payload.sdp = event.offer;
                  console.log("Found SDP in event.offer");
                } else if (typeof event.payload === 'string' && event.payload.startsWith('v=')) {
                  event.payload = { sdp: event.payload };
                  console.log("Payload is the SDP string itself");
                }
              }
            }
            
            // Для отладки выводим содержимое
            console.log("Event payload after potential SDP extraction:", event.payload);
          }
          
          // Для получателя звонка: показываем уведомление о входящем звонке
          console.log("Received incoming call notification/offer");
          setIncomingCall(event);
        } else {
          console.log("Ignoring incoming call, already in a call");
        }
        break;

      case 'CALL_INITIATED':
        // Специальное событие от Chat.js, когда пользователь инициировал звонок
        if (!activeCall) {
          console.log("Setting active call from CALL_INITIATED event");
          setActiveCall(event);
          // Подписываемся на чат для звонковых событий
          if (event.chatId) {
            subscribeToChatTopic(event.chatId, handleCallEvent);
          }
        }
        break;

      case CallEventType.ANSWER:
      case 'CALL_ANSWER': // Обрабатываем также строковый тип без константы
        // When our call gets answered
        if (activeCall && activeCall.callId === event.callId) {
          console.log("Call was answered, handling answer");
          await webRTCService.handleAnswer(event);
          updateCallParticipants(event);
        }
        break;

      case CallEventType.ICE_CANDIDATE:
      case 'ICE_CANDIDATE': // Обрабатываем также строковый тип без константы
        if (activeCall && activeCall.callId === event.callId) {
          console.log("Received ICE candidate");
          await webRTCService.handleIceCandidate(event);
        } else if (incomingCall && incomingCall.callId === event.callId) {
          console.log("Storing ICE candidate for incoming call");
          // Store ICE candidates for incoming calls that we haven't accepted yet
          // This will be handled later when the call is accepted
        }
        break;

      case CallEventType.CALL_STARTED:
      case 'CALL_STARTED': // Обрабатываем также строковый тип без константы
        // When a call is established (after offer/answer)
        if (activeCall && activeCall.callId === event.callId) {
          console.log('Call started successfully');
        }
        break;

      case CallEventType.CALL_ENDED:
      case 'CALL_ENDED': // Обрабатываем также строковый тип без константы
        if (activeCall && activeCall.callId === event.callId) {
          console.log("Call ended, cleaning up");
          handleCallEnded();
        }
        break;

      case CallEventType.CALL_REJECTED:
      case 'CALL_REJECTED': // Обрабатываем также строковый тип без константы
        if (activeCall && activeCall.callId === event.callId) {
          console.log("Call rejected, cleaning up");
          handleCallRejected();
        }
        break;

      case 'CALL_INVITE': // Обрабатываем также строковый тип без константы
        // Personal invitation to join a group call
        if (!activeCall && event.payload?.invitedUserId === currentUser.id) {
          console.log("Received call invitation");
          setIncomingCall(event);
        }
        break;

      case CallEventType.TOGGLE_AUDIO:
      case CallEventType.TOGGLE_VIDEO:
      case CallEventType.SCREEN_SHARE_STARTED:
      case CallEventType.SCREEN_SHARE_ENDED:
      case 'TOGGLE_AUDIO': // Обрабатываем также строковый тип без константы
      case 'TOGGLE_VIDEO': // Обрабатываем также строковый тип без константы
        if (activeCall && activeCall.callId === event.callId) {
          console.log(`Media status changed: ${event.type}`);
          webRTCService.handleMediaStatusChange(event);
        }
        break;

      default:
        console.log('Unhandled call event type:', event.type);
    }
  };

  // Update participants when someone joins/leaves
  const updateCallParticipants = (event) => {
    if (event.participants) {
      // Convert participants object to array of active participants
      const activeParticipantIds = Object.entries(event.participants)
        .filter(([id, isActive]) => isActive)
        .map(([id]) => parseInt(id));

      setCallParticipants(activeParticipantIds);
      console.log("Updated call participants:", activeParticipantIds);
    }
  };

  // Handle accepting an incoming call
  const handleAcceptCall = async (callEvent) => {
    try {
      // Check connection status first
      if (!isWebSocketConnected()) {
        console.error('Cannot accept call: WebSocket not connected');
        alert('Cannot connect to call server. Please check your connection and try again.');
        return;
      }

      console.log("Accepting call:", callEvent);
      
      // Determine if this is a group chat call notification (without SDP)
      const isGroupCallNotification = 
        (callEvent.type === 'CALL_NOTIFICATION' || callEvent.type === ChatEventTypes.CALL_NOTIFICATION) && 
        (!callEvent.payload?.sdp && !callEvent.sdp && !callEvent.offer);
      
      console.log(`Call type: ${callEvent.type}, isGroupCallNotification: ${isGroupCallNotification}`);
      
      if (isGroupCallNotification) {
        console.log("Handling group chat call without SDP - will create our own offer");
        
        // For group chat calls, initialize WebRTC with our own SDP offer
        const success = await webRTCService.initializeCall(
          callEvent.chatId, 
          callEvent.callType || 'VIDEO', 
          false // Not the initiator, but we'll create our own offer
        );
        
        if (success) {
          // Generate our own SDP offer
          const offerSdp = await webRTCService.createOffer();
          
          // Send answer with our offer
          await webRTCService.joinGroupCall(callEvent, offerSdp);
          
          // Update state to show call UI
          setActiveCall(callEvent);
          setIncomingCall(null);
          
          // Subscribe to chat topic for call events
          if (callEvent.chatId) {
            subscribeToChatTopic(callEvent.chatId, handleCallEvent);
            console.log(`Subscribed to chat ${callEvent.chatId} for call events`);
          }
          
          return;
        }
      } else {
        // 1:1 Call with SDP offer - standard flow
        // Проверим, что у нас есть полная информация о звонке
        if (!callEvent.payload) {
          callEvent.payload = {};
        }
        
        // Дополнительная проверка SDP - может находиться в разных местах
        if (!callEvent.payload.sdp) {
          if (callEvent.sdp) {
            callEvent.payload.sdp = callEvent.sdp;
            console.log('Moved SDP from callEvent.sdp to callEvent.payload.sdp for handleAcceptCall');
          } else if (callEvent.payload.offer) {
            callEvent.payload.sdp = callEvent.payload.offer;
            console.log('Moved SDP from callEvent.payload.offer to callEvent.payload.sdp');
          } else if (callEvent.offer) {
            callEvent.payload.sdp = callEvent.offer;
            console.log('Moved SDP from callEvent.offer to callEvent.payload.sdp');
          }
        }
        
        // Последняя проверка перед продолжением
        if (!callEvent.payload.sdp) {
          console.error('Still no SDP found in event, trying to extract from raw event:', callEvent);
          
          // Попытка найти SDP в любом свойстве события
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
            }
          }
        }
        
        // Если SDP все еще нет, не можем продолжить
        if (!callEvent.payload.sdp) {
          console.error('Cannot accept call: No SDP found in event', callEvent);
          alert('Не удалось установить соединение. Пожалуйста, попробуйте еще раз.');
          return;
        }

        // Initialize WebRTC
        const success = await webRTCService.handleOffer(callEvent);
        
        if (success) {
          // Accept the call with an answer
          await webRTCService.acceptCall(callEvent);
          
          // Update state to show call UI
          setActiveCall(callEvent);
          setIncomingCall(null);
          
          // Subscribe to chat topic for group calls
          if (callEvent.chatId) {
            subscribeToChatTopic(callEvent.chatId, handleCallEvent);
            console.log(`Subscribed to chat ${callEvent.chatId} for call events`);
          }
        }
      }
    } catch (error) {
      console.error('Error accepting call:', error);
      alert('Failed to connect to the call. Please try again.');
    }
  };

  // Handle rejecting an incoming call
  const handleRejectCall = (callEvent) => {
    console.log("Rejecting call:", callEvent);
    webRTCService.rejectIncomingCall(callEvent);
    setIncomingCall(null);
  };

  // Handle call ended by either party
  const handleCallEnded = () => {
    console.log("Call ended, cleaning up resources");
    webRTCService.cleanupCall();
    setActiveCall(null);
    setCallParticipants([]);
  };

  // Handle call rejected
  const handleCallRejected = () => {
    console.log("Call rejected, cleaning up resources");
    webRTCService.cleanupCall();
    setActiveCall(null);
  };

  // Display connection status message if disconnected during call
  const renderConnectionWarning = () => {
    if (connectionStatus === 'disconnected' && (activeCall || incomingCall)) {
      return (
        <div className="call-connection-warning">
          Connection to call server lost. Attempting to reconnect...
        </div>
      );
    }
    return null;
  };

  console.log("CallManager rendering with:", {
    incomingCall: !!incomingCall,
    activeCall: !!activeCall,
    connectionStatus
  });

  // Render nothing if no calls
  if (!incomingCall && !activeCall) return null;

  return (
    <>
      {renderConnectionWarning()}
      
      {/* Incoming call notification */}
      {incomingCall && !activeCall && (
        <IncomingCallNotification
          callEvent={incomingCall}
          onAccept={handleAcceptCall}
          onReject={handleRejectCall}
        />
      )}

      {/* Active call UI */}
      {activeCall && (
        <CallUI
          callData={activeCall}
          onEndCall={handleCallEnded}
          chatParticipants={callParticipants}
          connectionStatus={connectionStatus}
        />
      )}
    </>
  );
};

export default CallManager; 