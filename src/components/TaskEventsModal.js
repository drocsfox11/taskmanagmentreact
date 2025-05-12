import React, { useEffect, useRef } from 'react';
import '../styles/components/TaskEventsModal.css';
import { useGetEventsQuery } from '../services/api/eventsApi';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';

function TaskEventsModal({ isOpen, onClose }) {
  const { projectId, boardId } = useParams();
  const modalRef = useRef(null);
  const { data: events = [], isLoading } = useGetEventsQuery(boardId, {
    skip: !boardId
  });
  
  const usersByUsername = useSelector(state => state.users?.byUsername || {});
  
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU') + ' - ' + 
           date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };
  
  const getUserAvatar = (username) => {
    if (usersByUsername[username]?.avatarURL) {
      return usersByUsername[username].avatarURL;
    }
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
  };
  
  const groupedEvents = events.reduce((groups, event) => {
    const date = new Date(event.timestamp).toLocaleDateString('ru-RU');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(event);
    return groups;
  }, {});
  
  if (!isOpen) return null;
  
  return (
    <div className="task-events-modal-overlay">
      <div ref={modalRef} className="task-events-modal-container">
        <div className="task-events-modal-header">
          <div className="task-events-modal-title">Изменение задачи</div>
          <button className="task-events-modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="task-events-modal-content">
          {isLoading ? (
            <div className="task-events-loading">Загрузка событий...</div>
          ) : events.length === 0 ? (
            <div className="task-events-empty">Нет доступных событий</div>
          ) : (
            Object.entries(groupedEvents).map(([date, dayEvents]) => (
              <div key={date} className="task-events-day">
                <div className="task-events-date">{date}</div>
                
                {dayEvents.map((event, index) => (
                  <div key={index} className="task-events-item">
                    <div className="task-events-item-header">
                      <div className="task-events-user">
                        <div className="task-events-user-avatar">
                          <img 
                            src={getUserAvatar(event.username)} 
                            alt={event.username}
                          />
                        </div>
                        <div className="task-events-user-name">
                          {usersByUsername[event.username]?.name || event.username}
                        </div>
                      </div>
                      <div className="task-events-time">
                        {new Date(event.timestamp).toLocaleTimeString('ru-RU', { 
                          hour: '2-digit', 
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    
                    <div className="task-events-item-body">
                      <div className="task-events-task-title">{event.taskTitle}</div>
                      <div className="task-events-changes">
                        <div className="task-events-old">
                          <div className="task-events-label">Старое</div>
                          <div className="task-events-value">{event.oldValue}</div>
                        </div>
                        
                        <div className="task-events-new">
                          <div className="task-events-label">Новое</div>
                          <div className="task-events-value">{event.newValue}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default TaskEventsModal; 