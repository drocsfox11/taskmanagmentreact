import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Notification from './Notification';
import '../../styles/components/NotificationsContainer.css';

/**
 * Контейнер для уведомлений
 * Отображает стек уведомлений в правом нижнем углу экрана
 */
const NotificationsContainer = () => {
  const [notifications, setNotifications] = useState([]);
  const location = useLocation();

  // Функция для добавления нового уведомления
  const addNotification = (notification) => {
    // Создаем уникальный ID для уведомления, если он не был предоставлен
    const id = notification.id || `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Добавляем новое уведомление в конец массива
    setNotifications(prevNotifications => [
      ...prevNotifications,
      { ...notification, id }
    ]);

    // Играем звук уведомления, если он задан
    if (notification.sound) {
      try {
        const audio = new Audio(notification.sound);
        audio.volume = 0.5;
        audio.play().catch(err => console.log('Звуковое уведомление не удалось воспроизвести:', err));
      } catch (error) {
        console.error('Ошибка воспроизведения звука:', error);
      }
    }
  };

  // Функция для удаления уведомления по ID
  const removeNotification = (id) => {
    setNotifications(prevNotifications => 
      prevNotifications.filter(notification => notification.id !== id)
    );
  };

  // Подписываемся на глобальные события уведомлений
  useEffect(() => {
    const handleCustomNotification = (event) => {
      if (event.detail) {
        addNotification(event.detail);
      }
    };

    // Добавляем слушатель событий для custom event 'showNotification'
    window.addEventListener('showNotification', handleCustomNotification);

    return () => {
      // Удаляем слушатель при размонтировании компонента
      window.removeEventListener('showNotification', handleCustomNotification);
    };
  }, [location.pathname]); // Re-subscribe when pathname changes

  // Если нет уведомлений, не рендерим контейнер
  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="notifications-container">
      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          id={notification.id}
          title={notification.title}
          text={notification.text}
          imageUrl={notification.imageUrl}
          link={notification.link}
          onClose={removeNotification}
          autoCloseTimeout={notification.autoCloseTimeout}
        />
      ))}
    </div>
  );
};

export default NotificationsContainer; 