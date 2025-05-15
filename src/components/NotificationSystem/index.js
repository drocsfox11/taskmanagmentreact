import NotificationsContainer from './NotificationsContainer';

/**
 * Показывает уведомление в правом верхнем углу экрана
 * 
 * @param {Object} notification - Объект с данными для уведомления
 * @param {string} notification.title - Заголовок уведомления
 * @param {string} notification.text - Текст уведомления
 * @param {string} notification.imageUrl - URL изображения (по умолчанию '/logo192.png')
 * @param {string} notification.link - Ссылка для перехода при клике
 * @param {number} notification.autoCloseTimeout - Время в мс для автоматического закрытия
 * @param {string} notification.type - Тип уведомления (например, 'chat', 'task', 'system')
 * @param {string} notification.sound - URL звукового файла для уведомления
 */
export const showNotification = (notification) => {
  // Проверяем обязательные поля
  if (!notification.title || !notification.text) {
    console.error('Notification must have title and text fields');
    return;
  }

  // Создаем и отправляем кастомное событие
  const event = new CustomEvent('showNotification', {
    detail: notification
  });
  
  window.dispatchEvent(event);
};

export default NotificationsContainer; 