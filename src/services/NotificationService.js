// Импортируем функцию показа уведомлений
import { showNotification } from '../components/NotificationSystem';

/**
 * Отправляет уведомление о новом сообщении в чате
 * @param {Object} message - Данные сообщения
 * @param {Object} chatInfo - Информация о чате
 */
export const showNewMessageNotification = (message) => {
    console.log("Показать уведомление о новом сообщении", message);
  showNotification({
    type: 'chat', // Указываем тип уведомления
    title: 'Новое сообщение',
    text: `${message.sender.name}: ${message.content}`,
    imageUrl: message.chat.avatarURL,
    link: `/system/messenger/${message.chat.id}`,
    autoCloseTimeout: 70000, // Закрывать через 7 секунд
    sound: undefined
    // sound: '/notification-sound.mp3' // Опциональный звук
  });
};

