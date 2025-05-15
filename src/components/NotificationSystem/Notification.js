import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../../styles/components/Notification.css';

/**
 * Компонент отдельного уведомления
 * 
 * @param {Object} props - Пропсы компонента
 * @param {string} props.id - Уникальный идентификатор уведомления
 * @param {string} props.title - Заголовок уведомления
 * @param {string} props.text - Текст уведомления
 * @param {string} props.imageUrl - URL изображения для уведомления
 * @param {string} props.link - Ссылка для перехода
 * @param {Function} props.onClose - Функция, вызываемая при закрытии уведомления
 * @param {number} props.autoCloseTimeout - Время в мс, через которое уведомление закроется автоматически (опционально)
 */
const Notification = ({ 
  id, 
  title, 
  text, 
  imageUrl, 
  link, 
  onClose, 
  autoCloseTimeout = 5000 
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const navigate = useNavigate();
  // Обработчик закрытия уведомления с предотвращением всплытия события
  const handleClose = (e) => {
    // Предотвращаем всплытие события, чтобы не переходить по ссылке при нажатии на крестик
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    setIsClosing(true);
    setTimeout(() => {
      onClose(id);
    }, 300); // Задержка для анимации закрытия
  };
  console.log("Уведомление", id, title, text, imageUrl, link, onClose, autoCloseTimeout);
  // Автоматическое закрытие уведомления через указанное время
  useEffect(() => {
    if (autoCloseTimeout > 0) {
      const timeout = setTimeout(() => {
        handleClose();
      }, autoCloseTimeout);
      
      return () => clearTimeout(timeout);
    }
  }, [autoCloseTimeout, id]);

  // Формируем класс для анимации
  const notificationClass = `notification ${isClosing ? 'notification-closing' : ''}`;

  // Контент уведомления
  const notificationContent = (
    <>
      <div className="notification-image">
        <img src={imageUrl || '/logo192.png'} alt="" />
      </div>
      <div className="notification-content">
        <h3 className="notification-title">{title}</h3>
        <p className="notification-text">{text}</p>
      </div>
      <button className="notification-close-button" onClick={handleClose}>
        &times;
      </button>
    </>
  );

  return (
    <div className={notificationClass}>
      {link ? (
        <div className="notification-link" onClick={(e) => navigate(link)}>
          {notificationContent}
        </div>
      ) : (
        notificationContent
      )}
    </div>
  );
};

export default Notification; 