import React, { useState, useEffect } from 'react';
import '../styles/components/TaskHistoryModal.css';
import CloseCross from '../assets/icons/close_cross.svg';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

function TaskHistoryModal({ isOpen, onClose, historyData }) {
    if (!isOpen) return null;
    
    // Функция для форматирования даты
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return format(date, 'dd MMMM yyyy, HH:mm', { locale: ru });
    };
    
    // Функция для получения стиля события в зависимости от типа
    const getEventTypeClass = (actionType) => {
        switch (actionType) {
            case 'CREATE':
                return 'history-event-create';
            case 'UPDATE':
                return 'history-event-update';
            case 'DELETE':
                return 'history-event-delete';
            case 'MOVE':
                return 'history-event-move';
            default:
                return '';
        }
    };
    
    // Функция для получения иконки события
    const getEventIcon = (actionType) => {
        switch (actionType) {
            case 'CREATE':
                return '+';
            case 'UPDATE':
                return '✎';
            case 'DELETE':
                return '✕';
            case 'MOVE':
                return '⟷';
            default:
                return '';
        }
    };
    
    // Функция для форматирования типа события на русском
    const formatActionType = (actionType) => {
        switch (actionType) {
            case 'CREATE':
                return 'Создание';
            case 'UPDATE':
                return 'Обновление';
            case 'DELETE':
                return 'Удаление';
            case 'MOVE':
                return 'Перемещение';
            default:
                return actionType;
        }
    };
    
    // Функция для получения изменений между старой и новой версией задачи
    const getTaskChanges = (oldJson, newJson) => {
        if (!oldJson || !newJson) return null;
        
        try {
            const oldTask = JSON.parse(oldJson);
            const newTask = JSON.parse(newJson);
            
            const changes = [];
            
            // Проверяем изменения заголовка
            if (oldTask.title !== newTask.title) {
                changes.push({
                    field: 'Заголовок',
                    old: oldTask.title,
                    new: newTask.title
                });
            }
            
            // Проверяем изменения описания
            if (oldTask.description !== newTask.description) {
                changes.push({
                    field: 'Описание',
                    old: oldTask.description,
                    new: newTask.description
                });
            }
            
            // Проверяем изменения дат
            if (JSON.stringify(oldTask.startDate) !== JSON.stringify(newTask.startDate)) {
                changes.push({
                    field: 'Дата начала',
                    old: oldTask.startDate ? formatDateArray(oldTask.startDate) : 'Не задана',
                    new: newTask.startDate ? formatDateArray(newTask.startDate) : 'Не задана'
                });
            }
            
            if (JSON.stringify(oldTask.endDate) !== JSON.stringify(newTask.endDate)) {
                changes.push({
                    field: 'Дата завершения',
                    old: oldTask.endDate ? formatDateArray(oldTask.endDate) : 'Не задана',
                    new: newTask.endDate ? formatDateArray(newTask.endDate) : 'Не задана'
                });
            }
            
            // Проверяем изменения в участниках
            const oldParticipantsCount = oldTask.participants ? oldTask.participants.length : 0;
            const newParticipantsCount = newTask.participants ? newTask.participants.length : 0;
            
            if (oldParticipantsCount !== newParticipantsCount) {
                changes.push({
                    field: 'Участники',
                    old: `${oldParticipantsCount} участников`,
                    new: `${newParticipantsCount} участников`
                });
            }
            
            // Проверяем изменения в списке задач
            const oldChecklistCount = oldTask.checklist ? oldTask.checklist.length : 0;
            const newChecklistCount = newTask.checklist ? newTask.checklist.length : 0;
            
            if (oldChecklistCount !== newChecklistCount) {
                changes.push({
                    field: 'Чек-лист',
                    old: `${oldChecklistCount} пунктов`,
                    new: `${newChecklistCount} пунктов`
                });
            }
            
            // Проверяем изменения в вложениях
            const oldAttachmentsCount = oldTask.attachments ? oldTask.attachments.length : 0;
            const newAttachmentsCount = newTask.attachments ? newTask.attachments.length : 0;
            
            if (oldAttachmentsCount !== newAttachmentsCount) {
                changes.push({
                    field: 'Вложения',
                    old: `${oldAttachmentsCount} файлов`,
                    new: `${newAttachmentsCount} файлов`
                });
            }
            
            // Проверяем изменения тега
            if (JSON.stringify(oldTask.tag) !== JSON.stringify(newTask.tag)) {
                changes.push({
                    field: 'Тег',
                    old: oldTask.tag ? oldTask.tag.name : 'Нет',
                    new: newTask.tag ? newTask.tag.name : 'Нет'
                });
            }
            
            return changes;
        } catch (error) {
            console.error("Ошибка при анализе изменений задачи:", error);
            return null;
        }
    };
    
    // Форматирование массива даты в строку
    const formatDateArray = (dateArray) => {
        if (!dateArray || dateArray.length < 3) return 'Некорректная дата';
        
        // Типичный формат [год, месяц, день, час, минута]
        const year = dateArray[0];
        const month = dateArray[1];
        const day = dateArray[2];
        
        let result = `${day}.${month}.${year}`;
        
        // Если есть время, добавляем его
        if (dateArray.length >= 5) {
            const hour = dateArray[3].toString().padStart(2, '0');
            const minute = dateArray[4].toString().padStart(2, '0');
            result += ` ${hour}:${minute}`;
        }
        
        return result;
    };
    
    // Получение информации о задаче из снапшота
    const getTaskInfo = (taskSnapshot) => {
        if (!taskSnapshot) return { title: 'Нет данных' };
        
        try {
            const task = JSON.parse(taskSnapshot);
            return {
                title: task.title || 'Без названия',
                description: task.description || 'Нет описания',
                id: task.id
            };
        } catch (error) {
            console.error("Ошибка при получении информации о задаче:", error);
            return { title: 'Ошибка данных' };
        }
    };

    return (
        <div className="task-history-modal-overlay">
            <div className="task-history-modal">
                <div className="task-history-modal-header">
                    <h2>История изменений задач</h2>
                    <button className="close-button" onClick={onClose}>
                        <img src={CloseCross} alt="Закрыть" />
                    </button>
                </div>
                
                <div className="task-history-content">
                    {historyData && historyData.length > 0 ? (
                        <div className="task-history-timeline">
                            {historyData.map((event) => {
                                const taskInfo = getTaskInfo(event.taskSnapshot);
                                const changes = event.actionType === 'UPDATE' 
                                    ? getTaskChanges(event.oldTaskJson, event.newTaskJson) 
                                    : null;
                                
                                return (
                                    <div key={event.id} className="task-history-event">
                                        <div className="task-history-event-time">
                                            {formatDate(event.timestamp)}
                                        </div>
                                        
                                        <div className="task-history-event-connector">
                                            <div className={`task-history-event-icon ${getEventTypeClass(event.actionType)}`}>
                                                {getEventIcon(event.actionType)}
                                            </div>
                                            <div className="task-history-event-line"></div>
                                        </div>
                                        
                                        <div className="task-history-event-content">
                                            <div className="task-history-event-header">
                                                <div className="task-history-event-type">
                                                    {formatActionType(event.actionType)}
                                                </div>
                                                <div className="task-history-event-task-title">
                                                    "{taskInfo.title}"
                                                </div>
                                                {event.taskId && (
                                                    <div className="task-history-event-task-id">
                                                        (ID: {event.taskId})
                                                    </div>
                                                )}
                                            </div>
                                            
                                            <div className="task-history-event-user">
                                                <img 
                                                    src={event.user.avatarURL} 
                                                    alt={event.user.name} 
                                                    className="task-history-event-user-avatar" 
                                                />
                                                <span className="task-history-event-user-name">
                                                    {event.user.name}
                                                </span>
                                            </div>
                                            
                                            {changes && changes.length > 0 && (
                                                <div className="task-history-event-changes">
                                                    <h4>Изменения</h4>
                                                    <table className="task-history-changes-table">
                                                        <thead>
                                                            <tr>
                                                                <th>Поле</th>
                                                                <th>Было</th>
                                                                <th>Стало</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {changes.map((change, index) => (
                                                                <tr key={index}>
                                                                    <td>{change.field}</td>
                                                                    <td className="task-history-old-value">{change.old}</td>
                                                                    <td className="task-history-new-value">{change.new}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="task-history-no-data">
                            История изменений отсутствует
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default TaskHistoryModal; 