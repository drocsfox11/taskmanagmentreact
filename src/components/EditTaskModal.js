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

function EditTaskModal({ isOpen, onClose, onSubmit, task, boardId: propBoardId }) {
    const dispatch = useDispatch();
    const { boardId: urlBoardId } = useParams();
    const boardId = propBoardId || task?.boardId || urlBoardId;
    const usersByUsername = useSelector(state => state.users.byUsername);
    const { data: boardTags = [] } = useGetTagsQuery(boardId);
    
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
            setForm({
                title: task.title || '',
                description: task.description || '',
                checklist: Array.isArray(task.checklist) ? [...task.checklist] : [],
                participants: Array.isArray(task.participants) ? [...task.participants] : [],
                tagId: task.tag?.id || null,
                files: Array.isArray(task.files) ? [...task.files] : []
            });
            
            // Устанавливаем даты и время
            if (task.startDate) {
                const startDateTime = new Date(task.startDate);
                setStartDate(startDateTime.toISOString().split('T')[0]);
                setStartTime(startDateTime.toTimeString().slice(0, 5));
            }
            
            if (task.endDate) {
                const endDateTime = new Date(task.endDate);
                setEndDate(endDateTime.toISOString().split('T')[0]);
                setEndTime(endDateTime.toTimeString().slice(0, 5));
            }
        }
    }, [task, isOpen]);
    
    const [checklistItem, setChecklistItem] = useState('');
    const [participantInput, setParticipantInput] = useState('');
    const [startDate, setStartDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endDate, setEndDate] = useState('');
    const [endTime, setEndTime] = useState('');
    const [availableTags, setAvailableTags] = useState([]);
    
    const modalRef = useRef(null);
    const fileInputRef = useRef(null);

    // Сохраняем id старых аттачментов
    const [oldAttachmentIds, setOldAttachmentIds] = useState(task.attachments ? task.attachments.map(a => a.id) : []);
    useEffect(() => {
        if (task && isOpen) {
            setOldAttachmentIds(task.attachments ? task.attachments.map(a => a.id) : []);
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

    useEffect(() => {
        setAvailableTags(boardTags);
        console.log('Available tags:', boardTags);
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

    // Handle adding participant
    const handleAddParticipant = () => {
        if (participantInput.trim() && !form.participants.includes(participantInput)) {
            setForm(prev => ({
                ...prev,
                participants: [...prev.participants, participantInput]
            }));
            setParticipantInput('');
        }
    };

    // Handle removing participant
    const handleRemoveParticipant = (participant) => {
        setForm(prev => ({
            ...prev,
            participants: prev.participants.filter(p => p !== participant)
        }));
    };

    // Handle file upload
    const handleFileUpload = (e) => {
        const files = Array.from(e.target.files);
        
        setForm(prev => ({
            ...prev,
            files: [...prev.files, ...files]
        }));
    };

    // Handle removing file
    const handleRemoveFile = (index) => {
        setForm(prev => ({
            ...prev,
            files: prev.files.filter((_, i) => i !== index)
        }));
    };

    // Handle form submission
    const handleSubmit = (e) => {
        e.preventDefault();
        
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
        
        // Разделяем новые и старые файлы
        const newFiles = (form.files || []).filter(f => f instanceof File);
        // attachments = только старые id
        const attachments = oldAttachmentIds;
        
        // Отправляем updateTaskRequest с attachments = только старые id
        onSubmit({ ...taskData, id: task.id, attachments, files: newFiles });
    };

    // Handle keypress for checklist input
    const handleChecklistKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddChecklistItem();
        }
    };

    // Handle keypress for participant input
    const handleParticipantKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddParticipant();
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
                <div className="create-task-modal-participants-container">
                    <div className="create-task-modal-input-row">
                        <input 
                            className="create-task-modal-input" 
                            value={participantInput} 
                            onChange={(e) => setParticipantInput(e.target.value)} 
                            onKeyPress={handleParticipantKeyPress}
                            placeholder="Добавить участника (логин)"
                        />
                        <button 
                            type="button" 
                            className="create-task-modal-add-button"
                            onClick={handleAddParticipant}
                        >
                            Добавить
                        </button>
                    </div>
                    
                    <div className="create-project-modal-avatars-row">
                        {form.participants.map((participant, idx) => {
                            const username = typeof participant === 'string' ? participant : participant.username;
                            const user = usersByUsername[username];
                            return (
                                <div key={username} className="create-project-modal-avatar-container">
                                    <img
                                        src={user?.avatarURL || Girl}
                                        alt={username}
                                        className="create-project-modal-avatar"
                                        title={username}
                                    />
                                    <span 
                                        className="create-project-modal-avatar-remove"
                                        onClick={() => handleRemoveParticipant(participant)}
                                    >
                                        ×
                                    </span>
                                </div>
                            );
                        })}
                    </div>
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
                <div className="create-task-modal-label">Вложения</div>
                <div className="create-task-modal-files-section">
                    {/* Уже прикреплённые файлы */}
                    {task.attachments && task.attachments.length > 0 && (
                        <div className="create-task-modal-files-list">
                            {task.attachments.map((file) => (
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
                        {form.files.map((file, index) => (
                            <div key={index} className="create-task-modal-file-item">
                                <img src={ClipIcon} alt="file" className="create-task-modal-file-icon" />
                                <div className="create-task-modal-file-info">
                                    <div className="create-task-modal-file-name">{file.name}</div>
                                    <div className="create-task-modal-file-size">
                                        {file.size ? (file.size / 1024).toFixed(1) + ' KB' : ''}
                                    </div>
                                </div>
                                <span 
                                    className="create-task-modal-file-remove"
                                    onClick={() => handleRemoveFile(index)}
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