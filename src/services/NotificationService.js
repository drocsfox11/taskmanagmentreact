import { showNotification } from '../components/NotificationSystem';


export const showNewMessageNotification = (message) => {
    console.log("Показать уведомление о новом сообщении", message);
  showNotification({
    type: 'chat',
    title: 'Новое сообщение',
    text: `${message.sender.name}: ${message.content}`,
    imageUrl: message.chat.avatarURL,
    link: `/system/messenger/${message.chat.id}`,
    autoCloseTimeout: 70000,
    sound: undefined
  });
};

export const showNewChatNotification = (chat) => {
  console.log("Показать уведомление о новом чате", chat);
  showNotification({
    type: 'chat',
    title: 'Новый чат',
    text: `Нету сообщений`,
    imageUrl: chat.avatarURL,
    link: `/system/messenger/${chat.id}`,
    autoCloseTimeout: 70000,
    sound: undefined

  });
};

