import LeftMenu from "../components/LeftMenu";
import {Outlet} from "react-router-dom";
import NotificationsContainer from "../components/NotificationSystem";
import CallManager from "../components/CallManager";
import { useGetCurrentUserQuery } from "../services/api";
import { useEffect } from "react";
import { subscribeToChatTopic, ChatEventTypes } from "../services/api/WebSocketService";

function ContentContainer() {
    console.log('ContentContainer');
    const { data: currentUser } = useGetCurrentUserQuery();

    // Функция для обработки событий звонков из чата
    useEffect(() => {
        if (!currentUser) return;
        
        console.log('ContentContainer: setting up call event listener');
        
        // Создаем обработчик для событий звонков
        const handleCallEvent = (event) => {
            if (event && event.type && (
                event.type === 'CALL_NOTIFICATION' || 
                event.type === ChatEventTypes.CALL_NOTIFICATION ||
                event.type === 'CALL_STARTED' ||
                event.type === 'CALL_ENDED' ||
                event.type === 'CALL_REJECTED'
            )) {
                console.log('ContentContainer: Forwarding call event', event);
                
                // Создаем глобальное событие для CallManager
                const callEvent = new CustomEvent('call-event', { 
                    detail: { ...event, source: 'content-container' } 
                });
                window.dispatchEvent(callEvent);
            }
        };
        
        // Храним активные подписки на чаты, чтобы очистить их при размонтировании
        const activeSubscriptions = {};
        
        // Глобальный обработчик для подписки на новый чат
        const handleChatSubscription = (e) => {
            if (e && e.detail && e.detail.chatId) {
                const chatId = e.detail.chatId;
                console.log(`ContentContainer: Subscribing to chat ${chatId} for call events`);
                
                // Подписываемся на чат только если еще не подписаны
                if (!activeSubscriptions[chatId]) {
                    activeSubscriptions[chatId] = true;
                    subscribeToChatTopic(chatId, handleCallEvent);
                }
            }
        };
        
        // Добавляем обработчик для подписки на новые чаты
        window.addEventListener('subscribe-to-chat', handleChatSubscription);
        
        return () => {
            console.log('ContentContainer: removing call event listener');
            window.removeEventListener('subscribe-to-chat', handleChatSubscription);
        };
    }, [currentUser]);

    return (
       <div style={{ display: 'flex', flexDirection: 'row',width: '100%',height: '100%',overflow: 'hidden' }}>
           <LeftMenu></LeftMenu>
           <Outlet></Outlet>
           <NotificationsContainer />
           <CallManager currentUser={currentUser} />
       </div>
    );
}

export default ContentContainer;
