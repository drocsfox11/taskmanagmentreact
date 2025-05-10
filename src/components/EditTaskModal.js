import React, { useState, useRef, useEffect } from 'react';
import { EmojiProvider, Emoji } from "react-apple-emojis";
import emojiData from "react-apple-emojis/src/data.json";
import '../styles/components/CreateTaskModal.css';
import CloseCross from "../assets/icons/cross for task.svg";
import CalendarIcon from "../assets/icons/calender_for_task.svg";
import ClipIcon from "../assets/icons/clip.svg";
import CheckIcon from "../assets/icons/task_list.svg";
import Girl from "../assets/icons/profile_picture.svg";
import { useDispatch, useSelector } from 'react-redux';
import { useGetTagsQuery } from '../services/api/tagsApi';
import { useParams } from 'react-router-dom';
import { 
    useUploadTaskAttachmentMutation, 
    useDeleteAttachmentMutation,
    useDeleteAllTaskAttachmentsMutation
} from '../services/api/attachmentsApi';

function EditTaskModal({ isOpen, onClose, onSubmit, task, boardId: propBoardId }) {
    const dispatch = useDispatch();
    const { boardId: urlBoardId } = useParams();
    const boardId = propBoardId || task?.boardId || urlBoardId;
    const usersByUsername = useSelector(state => state.users?.byUsername || {});
    const { data: boardTags = [] } = useGetTagsQuery(boardId);
    
    // Инициализируем хуки для работы с вложениями
    const [uploadAttachment] = useUploadTaskAttachmentMutation();
    const [deleteAttachment] = useDeleteAttachmentMutation();
    const [deleteAllAttachments] = useDeleteAllTaskAttachmentsMutation();
    
    // Отслеживаем добавленные и удаленные вложения
    const [filesToUpload, setFilesToUpload] = useState([]);
    const [attachmentsToDelete, setAttachmentsToDelete] = useState([]);
    
    // Локальная копия вложений для отображения в UI
    const [localAttachments, setLocalAttachments] = useState([]);
    
    // Сохраняем ID существующих вложений
    const [oldAttachmentIds, setOldAttachmentIds] = useState([]);
    
    // Get board participants from store
    const boardData = useSelector(state => 
        state.boards?.entities?.find(board => board.id === boardId) || 
        state.api?.queries?.[`getBoardWithData(${boardId})`]?.data
    );
    
    // Создаем маппинг имен пользователей на их ID
    const participantIdsByName = React.useMemo(() => {
        const mapping = {};
        if (boardData && boardData.participants) {
            boardData.participants.forEach(participant => {
                if (participant && participant.name && participant.id) {
                    mapping[participant.name] = participant.id;
                }
            });
        }
        return mapping;
    }, [boardData]);
    
    // Normalize board participants to ensure they are in a consistent format
    const normalizedBoardParticipants = React.useMemo(() => {
        const participants = boardData?.participants || [];
        return participants.map(participant => {
            if (typeof participant === 'string') {
                return participant;
            } else if (participant && participant.username) {
                return participant.username;
            } else if (participant && participant.name) {
                // Добавляем поддержку формата с полем name вместо username
                return participant.name;
            }
            return null;
        }).filter(Boolean); // Remove any null values
    }, [boardData]);
    
    // Отладочный вывод для диагностики
    useEffect(() => {
        if (isOpen && boardData) {
            console.log('Board participants:', boardData.participants);
            console.log('Normalized participants:', normalizedBoardParticipants);
            console.log('Task participants:', task.participants);
            console.log('Participant IDs by name:', participantIdsByName);
        }
    }, [isOpen, boardData, normalizedBoardParticipants, task.participants, participantIdsByName]);
    
    // Инициализируем форму данными существующей задачи
    const [form, setForm] = useState({
        title: task.title || '',
        description: task.description || '',
        checklist: task.checklist || [],
        participants: task.participants || [],
        tagId: task.tag?.id || null,
        files: task.files || []
    });
    
    // Инициализируем значения формы из переданной задачи при открытии модального окна
    useEffect(() => {
        if (task && isOpen) {
            console.log('Initializing form with task data:', task);
            
            // Убедимся, что участники представлены как массив ID
            let participants = [];
            if (Array.isArray(task.participants)) {
                participants = task.participants.map(p => {
                    // Если участник уже представлен как ID, используем его
                    if (typeof p === 'number') return p;
                    // Если участник - объект с ID, извлекаем ID
                    if (typeof p === 'object' && p !== null) return p.id || p;
                    // Иначе используем как есть
                    return p;
                });
            }
            
            setForm({
                title: task.title || '',
                description: task.description || '',
                checklist: Array.isArray(task.checklist) ? [...task.checklist] : [],
                participants: participants,
                tagId: task.tag?.id || null,
                files: Array.isArray(task.files) ? [...task.files] : []
            });
            
            // Сбрасываем состояние вложений при открытии модального окна
            setFilesToUpload([]);
            setAttachmentsToDelete([]);
            
            // Устанавливаем даты и время
            if (task.startDate) {
                const startDateTime = new Date(task.startDate);
                setStartDate(startDateTime.toISOString().split('T')[0]);
                setStartTime(startDateTime.toTimeString().slice(0, 5));
            } else {
                setStartDate('');
                setStartTime('');
            }
            
            if (task.endDate) {
                const endDateTime = new Date(task.endDate);
                setEndDate(endDateTime.toISOString().split('T')[0]);
                setEndTime(endDateTime.toTimeString().slice(0, 5));
            } else {
                setEndDate('');
                setEndTime('');
            }
            
            // Инициализируем массив существующих вложений
            if (task.attachments) {
                setOldAttachmentIds(task.attachments.map(a => a.id));
                setLocalAttachments(Array.isArray(task.attachments) ? [...task.attachments] : []);
            } else {
                setOldAttachmentIds([]);
                setLocalAttachments([]);
            }
        }
    }, [task, isOpen]);
    
    const [checklistItem, setChecklistItem] = useState('');
    const [selectedParticipant, setSelectedParticipant] = useState('');
    const [startDate, setStartDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endDate, setEndDate] = useState('');
    const [endTime, setEndTime] = useState('');
    const [availableTags, setAvailableTags] = useState([]);
    
    const modalRef = useRef(null);
    const fileInputRef = useRef(null);
    const prevBoardTagsRef = useRef([]);

    // Cохраняем id существующих вложений при открытии модального окна
    useEffect(() => {
        if (task && isOpen && task.attachments) {
            setOldAttachmentIds(task.attachments.map(a => a.id));
            setLocalAttachments([...task.attachments]);
        }
    }, [task, isOpen]);

    // Handle clicking outside modal to close
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (modalRef.current && !modalRef.current.contains(e.target)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    // Загружаем данные пользователей через Redux
    useEffect(() => {
        form.participants.forEach(username => {
            if (username && (!usersByUsername || !usersByUsername[username])) {
                dispatch({ type: 'users/fetchUser', payload: username });
            }
        });
    }, [form.participants, usersByUsername, dispatch]);

    useEffect(() => {
        if (isOpen && boardId) {
            console.log('Fetching board data for boardId:', boardId);
            
            // Force fetch board data to get updated participants list
            dispatch({
                type: 'api/executeQuery',
                payload: {
                    endpointName: 'getBoardWithData',
                    originalArgs: boardId
                }
            });
        }
    }, [isOpen, boardId, dispatch]);

    // Update availableTags only when boardTags changes
    useEffect(() => {
        // Don't update if boardTags is the same as what we already set
        const prevTagsJSON = JSON.stringify(prevBoardTagsRef.current);
        const currentTagsJSON = JSON.stringify(boardTags);
        
        if (prevTagsJSON !== currentTagsJSON) {
            setAvailableTags(boardTags);
            prevBoardTagsRef.current = boardTags;
        }
    }, [boardTags]);

    // Handle form field changes
    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Handle adding checklist item
    const handleAddChecklistItem = () => {
        if (checklistItem.trim()) {
            setForm(prev => ({
                ...prev,
                checklist: [
                    ...prev.checklist, 
                    { text: checklistItem, completed: false }
                ]
            }));
            setChecklistItem('');
        }
    };

    // Handle removing checklist item
    const handleRemoveChecklistItem = (index) => {
        setForm(prev => ({
            ...prev,
            checklist: prev.checklist.filter((_, i) => i !== index)
        }));
    };

    // Add participant from dropdown
    const handleAddParticipant = () => {
        if (!selectedParticipant || !selectedParticipant.trim()) return;
        
        // Ищем участника по имени в списке участников доски
        const participant = boardData?.participants?.find(p => p.name === selectedParticipant);
        
        if (!participant || !participant.id) {
            console.error('Не удалось найти ID для участника:', selectedParticipant);
            return;
        }
        
        const participantId = participant.id;
        
        // Проверяем, не добавлен ли уже этот участник
        if (form.participants.includes(participantId)) {
            console.log('Участник уже добавлен:', selectedParticipant);
            setSelectedParticipant('');
            return;
        }
        
        console.log('Adding participant:', selectedParticipant, 'with ID:', participantId);
        
        // Используем функциональную форму setState для гарантированного доступа к актуальному состоянию
        setForm(prevForm => {
            const updatedParticipants = [...prevForm.participants, participantId];
            
            console.log('Updated participants list:', updatedParticipants);
            
            return {
                ...prevForm,
                participants: updatedParticipants
            };
        });
        
        // Сбрасываем выбранного участника
        setSelectedParticipant('');
    };

    // Handle removing participant
    const handleRemoveParticipant = (index) => {
        // Используем функциональную форму setState чтобы избежать устаревших данных
        setForm(prevForm => {
            const newParticipants = [...prevForm.participants];
            newParticipants.splice(index, 1);
            return {
                ...prevForm,
                participants: newParticipants
            };
        });
    };

    // Handle file upload
    const handleFileUpload = (e) => {
        const newFiles = Array.from(e.target.files);
        setFilesToUpload(prev => [...prev, ...newFiles]);
        
        // Обновляем форму с новыми файлами
        setForm(prev => ({
            ...prev,
            files: [...prev.files, ...newFiles]
        }));
    };

    // Handle removing new file
    const handleRemoveFile = (index) => {
        setForm(prev => {
            const updatedFiles = [...prev.files];
            const removedFile = updatedFiles.splice(index, 1)[0];
            
            // Если файл был в списке для загрузки, удаляем его оттуда
            if (removedFile instanceof File) {
                setFilesToUpload(prevFiles => 
                    prevFiles.filter(file => file !== removedFile)
                );
            }
            
            return {
                ...prev,
                files: updatedFiles
            };
        });
    };
    
    // Handle removing existing attachment
    const handleRemoveAttachment = (attachmentId) => {
        // Добавляем ID вложения в список на удаление
        setAttachmentsToDelete(prev => [...prev, attachmentId]);
        
        // Обновляем список существующих вложений
        setOldAttachmentIds(prev => prev.filter(id => id !== attachmentId));
        
        // Обновляем локальную копию списка вложений для UI
        setLocalAttachments(prev => prev.filter(attachment => attachment.id !== attachmentId));
    };

    // Handle removing all attachments
    const handleRemoveAllAttachments = () => {
        if (!localAttachments || localAttachments.length === 0) return;
        
        // Запрашиваем подтверждение
        if (!window.confirm('Вы уверены, что хотите удалить все вложения?')) return;
        
        // Помечаем задачу для массового удаления вложений
        setAttachmentsToDelete(["DELETE_ALL"]);
        
        // Очищаем список существующих вложений
        setOldAttachmentIds([]);
        
        // Очищаем локальную копию вложений
        setLocalAttachments([]);
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            // Prepare task data
            let taskData = { ...form };
            
            // Combine date and time for start and end dates
            if (startDate) {
                const time = startTime ? startTime : '00:00:00';
                const normTime = time.length === 5 ? time + ':00' : time;
                const startDateTime = `${startDate}T${normTime}`;
                taskData.startDate = new Date(startDateTime).toISOString();
            } else {
                taskData.startDate = null;
            }
            
            if (endDate) {
                const time = endTime ? endTime : '23:59:59';
                const normTime = time.length === 5 ? time + ':00' : time;
                const endDateTime = `${endDate}T${normTime}`;
                taskData.endDate = new Date(endDateTime).toISOString();
            } else {
                taskData.endDate = null;
            }
            
            // Сначала создаем полный объект с данными задачи для отправки
            const updatedTaskData = {
                ...taskData, 
                id: task.id,
                boardId: task.boardId,
                columnId: task.columnId,
                // Используем существующие вложения 
                attachments: oldAttachmentIds
            };
            
            // Закрываем модальное окно до обработки вложений
            onClose();
            
            // Вызываем обработчик обновления задачи, не дожидаясь загрузки/удаления вложений
            // Это обеспечит мгновенное обновление UI
            onSubmit(updatedTaskData);
            
            // В фоновом режиме обрабатываем вложения
            
            // Обработка удаления вложений
            if (attachmentsToDelete.includes("DELETE_ALL")) {
                console.log(`Deleting all attachments for task: ${task.id}`);
                await deleteAllAttachments(task.id).unwrap();
            } else if (attachmentsToDelete.length > 0) {
                // Иначе удаляем выбранные вложения по одному
                for (const attachmentId of attachmentsToDelete) {
                    console.log(`Deleting attachment: ${attachmentId}`);
                    await deleteAttachment(attachmentId).unwrap();
                }
            }
            
            // Затем загружаем новые файлы
            if (filesToUpload.length > 0) {
                for (const file of filesToUpload) {
                    console.log(`Uploading file: ${file.name}`);
                    await uploadAttachment({
                        taskId: task.id,
                        file: file
                    }).unwrap();
                }
            }
            
        } catch (error) {
            console.error('Error handling files:', error);
        }
    };

    // Handle keypress for checklist input
    const handleChecklistKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddChecklistItem();
        }
    };

    // Toggle checklist item completion
    const handleToggleChecklistItem = (index) => {
        setForm(prev => ({
            ...prev,
            checklist: prev.checklist.map((item, i) => 
                i === index ? { ...item, completed: !item.completed } : item
            )
        }));
    };

    // Handle tag selection
    const handleTagSelect = (tagId) => {
        setForm({
            ...form,
            tagId: tagId
        });
    };

    // Функция для получения имени пользователя по ID
    const getParticipantNameById = (participantId) => {
        if (!boardData || !boardData.participants) return '';
        
        const participant = boardData.participants.find(p => p.id === participantId);
        return participant ? participant.name : `Участник #${participantId}`;
    };
    
    // Функция для получения URL аватарки пользователя по ID
    const getParticipantAvatarById = (participantId) => {
        if (!boardData || !boardData.participants) return Girl;
        
        const participant = boardData.participants.find(p => p.id === participantId);
        return participant && participant.avatarURL ? participant.avatarURL : Girl;
    };

    // Проверяем есть ли участник с указанным ID в списке участников задачи
    const isParticipantInTask = (participantId) => {
        return form.participants.includes(participantId);
    };

    if (!isOpen) return null;

    return (
        <div className="create-task-modal-overlay">
            <form className="create-task-modal" ref={modalRef} onSubmit={handleSubmit}>
                <div className="create-task-modal-header">
                    <div className="create-task-modal-title">Редактировать задачу</div>
                    <img 
                        src={CloseCross} 
                        alt="close" 
                        className="create-task-modal-close" 
                        onClick={onClose}
                    />
                </div>
                
                {/* Title */}
                <div className="create-task-modal-label">Название</div>
                <input 
                    className="create-task-modal-input" 
                    name="title" 
                    value={form.title} 
                    onChange={handleFormChange} 
                    placeholder="Введите название"
                    required
                />
                
                {/* Description */}
                <div className="create-task-modal-label">Описание</div>
                <textarea 
                    className="create-task-modal-textarea" 
                    name="description" 
                    value={form.description} 
                    onChange={handleFormChange} 
                    placeholder="Введите описание"
                    rows={3}
                />
                
                {/* Checklist */}
                <div className="create-task-modal-label">Чеклист</div>
                <div className="create-task-modal-checklist-container">
                    <div className="create-task-modal-input-row">
                        <input 
                            className="create-task-modal-input" 
                            value={checklistItem} 
                            onChange={(e) => setChecklistItem(e.target.value)} 
                            onKeyPress={handleChecklistKeyPress}
                            placeholder="Добавить пункт"
                        />
                        <button 
                            type="button" 
                            className="create-task-modal-add-button"
                            onClick={handleAddChecklistItem}
                        >
                            Добавить
                        </button>
                    </div>
                    
                    <div className="create-task-modal-checklist-items">
                        {form.checklist.map((item, index) => (
                            <div key={index} className="create-task-modal-checklist-item">
                                <div className="create-task-modal-checklist-item-content">
                                    <img 
                                        src={CheckIcon} 
                                        alt="check" 
                                        className="create-task-modal-checklist-icon" 
                                        onClick={() => handleToggleChecklistItem(index)}
                                        style={{ cursor: 'pointer', opacity: item.completed ? 1 : 0.5 }}
                                    />
                                    <span 
                                        style={{ textDecoration: item.completed ? 'line-through' : 'none' }}
                                    >
                                        {item.text}
                                    </span>
                                </div>
                                <span 
                                    className="create-task-modal-checklist-remove"
                                    onClick={() => handleRemoveChecklistItem(index)}
                                >
                                    ×
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
                
                {/* Timeline */}
                <div className="create-task-modal-label">Таймлайн</div>
                <div className="create-task-modal-timeline">
                    <div className="create-task-modal-timeline-row">
                        <div className="create-task-modal-timeline-group">
                            <img src={CalendarIcon} alt="calendar" className="create-task-modal-timeline-icon" />
                            <input 
                                type="date" 
                                className="create-task-modal-date-input"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <input 
                            type="time" 
                            className="create-task-modal-time-input"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            step="1"
                        />
                    </div>
                    <div className="create-task-modal-timeline-separator">-</div>
                    <div className="create-task-modal-timeline-row">
                        <div className="create-task-modal-timeline-group">
                            <img src={CalendarIcon} alt="calendar" className="create-task-modal-timeline-icon" />
                            <input 
                                type="date" 
                                className="create-task-modal-date-input"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                        <input 
                            type="time" 
                            className="create-task-modal-time-input"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            step="1"
                        />
                    </div>
                </div>
                
                {/* Participants */}
                <div className="create-task-modal-label">Участники</div>
                <div className="create-task-modal-participants-section">
                    <div className="create-task-modal-participants-header">
                        Выбранные участники ({form.participants ? form.participants.length : 0})
                    </div>
                    
                    <div className="create-task-modal-participants">
                        {form.participants && form.participants.length > 0 ? (
                            form.participants.map((participantId, index) => (
                                <div key={index} className="create-task-modal-participant">
                                    <img 
                                        src={getParticipantAvatarById(participantId)} 
                                        alt={getParticipantNameById(participantId)} 
                                        className="create-task-modal-participant-avatar"
                                    />
                                    <span title={getParticipantNameById(participantId)} style={{ 
                                        flex: 1, 
                                        whiteSpace: 'nowrap', 
                                        overflow: 'hidden', 
                                        textOverflow: 'ellipsis' 
                                    }}>
                                        {getParticipantNameById(participantId)}
                                    </span>
                                    <span 
                                        className="create-task-modal-remove-button"
                                        onClick={() => handleRemoveParticipant(index)}
                                        title="Удалить участника"
                                    >
                                        ×
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div className="create-task-modal-no-participants">
                                Нет выбранных участников
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Добавление участника */}
                <div className="create-task-modal-input-row">
                    <select
                        className="create-task-modal-input"
                        value={selectedParticipant}
                        onChange={(e) => setSelectedParticipant(e.target.value)}
                    >
                        <option value="">Выберите участника</option>
                        {boardData?.participants
                            // Фильтруем участников, которые уже добавлены к задаче
                            .filter(participant => {
                                // Проверяем, что участник ещё не добавлен в задачу
                                return !form.participants.includes(participant.id);
                            })
                            .map((participant) => (
                                <option key={participant.id} value={participant.name}>
                                    {participant.name}
                                </option>
                            ))
                        }
                    </select>
                    <button 
                        type="button" 
                        className="create-task-modal-add-button"
                        onClick={handleAddParticipant}
                    >
                        Добавить
                    </button>
                </div>
                
                {/* Tags */}
                <div className="create-task-modal-label">Тег</div>
                <select 
                    className="create-task-modal-input" 
                    value={form.tagId || ""}
                    onChange={(e) => handleTagSelect(e.target.value ? Number(e.target.value) : null)}
                >
                    <option value="">Выберите тег</option>
                    {availableTags.map(tag => (
                        <option key={tag.id} value={tag.id} style={{backgroundColor: tag.color}}>
                            {tag.name}
                        </option>
                    ))}
                </select>
                <div className="create-task-modal-tags-preview">
                    {form.tagId && availableTags.find(tag => tag.id === form.tagId) && (
                        <div 
                            className="create-task-modal-tag-preview"
                            style={{ backgroundColor: availableTags.find(tag => tag.id === form.tagId).color }}
                        >
                            {availableTags.find(tag => tag.id === form.tagId).name}
                        </div>
                    )}
                </div>
                
                {/* Files */}
                <div className="create-task-modal-label">
                    Вложения
                    {localAttachments && localAttachments.length > 0 && (
                        <button 
                            type="button"
                            className="create-task-modal-remove-all-button"
                            onClick={handleRemoveAllAttachments}
                            style={{
                                marginLeft: '10px',
                                background: 'none',
                                border: 'none',
                                color: '#FF5252',
                                cursor: 'pointer',
                                fontSize: '12px',
                                padding: '0'
                            }}
                        >
                            Удалить все
                        </button>
                    )}
                </div>
                <div className="create-task-modal-files-section">
                    {/* Уже прикреплённые файлы */}
                    {localAttachments && localAttachments.length > 0 && (
                        <div className="create-task-modal-files-list">
                            {localAttachments.map((file) => (
                                <div key={file.id} className="create-task-modal-file-item">
                                    <a
                                        href={`${process.env.REACT_APP_API_BASE_URL}/api/attachments/${file.id}/download`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="create-task-modal-file-name"
                                    >
                                        {file.fileName}
                                    </a>
                                    <div className="create-task-modal-file-size">
                                        {(file.fileSize / 1024).toFixed(1)} KB
                                    </div>
                                    <span 
                                        className="create-task-modal-file-remove"
                                        onClick={() => handleRemoveAttachment(file.id)}
                                        title="Удалить вложение"
                                    >
                                        ×
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                    {/* Новые файлы */}
                    <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                        multiple
                    />
                    <button 
                        type="button" 
                        className="create-task-modal-file-button"
                        onClick={() => fileInputRef.current.click()}
                    >
                        <img src={ClipIcon} alt="attach" className="create-task-modal-file-icon" />
                        Прикрепить файл
                    </button>
                    <div className="create-task-modal-files-list">
                        {filesToUpload.map((file, index) => (
                            <div key={`new-file-${index}`} className="create-task-modal-file-item">
                                <img src={ClipIcon} alt="file" className="create-task-modal-file-icon" />
                                <div className="create-task-modal-file-info">
                                    <div className="create-task-modal-file-name">{file.name}</div>
                                    <div className="create-task-modal-file-size">
                                        {file.size ? (file.size / 1024).toFixed(1) + ' KB' : ''}
                                    </div>
                                </div>
                                <span 
                                    className="create-task-modal-file-remove"
                                    onClick={() => {
                                        // Находим индекс файла в списке filesToUpload и удаляем его
                                        const fileIndex = filesToUpload.indexOf(file);
                                        if (fileIndex !== -1) {
                                            const newFiles = [...filesToUpload];
                                            newFiles.splice(fileIndex, 1);
                                            setFilesToUpload(newFiles);
                                            
                                            // Также удаляем из списка files в form
                                            setForm(prev => ({
                                                ...prev,
                                                files: prev.files.filter(f => f !== file)
                                            }));
                                        }
                                    }}
                                    title="Удалить файл"
                                >
                                    ×
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
                
                {/* Submit Button */}
                <button type="submit" className="create-task-modal-submit">
                    Сохранить изменения
                </button>
            </form>
        </div>
    );
}

export default EditTaskModal; 