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
import { fetchBoardTagsRequest } from '../store/features/tags/tagsActions';

function CreateTaskModal({ isOpen, onClose, onSubmit, boardId }) {
    const dispatch = useDispatch();
    const usersByUsername = useSelector(state => state.users.byUsername);
    const boardTags = useSelector(state => state.tags?.boardTags || []);
    
    const [form, setForm] = useState({
        title: '',
        description: '',
        checklist: [],
        participants: [],
        tagId: null,
        files: []
    });
    
    const [checklistItem, setChecklistItem] = useState('');
    const [participantInput, setParticipantInput] = useState('');
    const [startDate, setStartDate] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endDate, setEndDate] = useState('');
    const [endTime, setEndTime] = useState('');
    const [availableTags, setAvailableTags] = useState([]);
    
    const modalRef = useRef(null);
    const fileInputRef = useRef(null);

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
            if (!usersByUsername[username]) {
                dispatch({ type: 'users/fetchUser', payload: username });
            }
        });
    }, [form.participants, usersByUsername, dispatch]);

    // Handle form field change
    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setForm({
            ...form,
            [name]: value
        });
    };

    // Add checklist item
    const handleAddChecklistItem = () => {
        if (checklistItem.trim()) {
            setForm({
                ...form,
                checklist: [...form.checklist, { text: checklistItem, completed: false }]
            });
            setChecklistItem('');
        }
    };

    const handleRemoveChecklistItem = (index) => {
        const newChecklist = [...form.checklist];
        newChecklist.splice(index, 1);
        setForm({
            ...form,
            checklist: newChecklist
        });
    };

    const handleAddParticipant = () => {
        if (participantInput.trim() && !form.participants.includes(participantInput)) {
            // Загружаем данные пользователя из API
            dispatch({ type: 'users/fetchUser', payload: participantInput });
            
            setForm({
                ...form,
                participants: [...form.participants, participantInput]
            });
            setParticipantInput('');
        }
    };

    const handleRemoveParticipant = (index) => {
        const newParticipants = [...form.participants];
        newParticipants.splice(index, 1);
        setForm({
            ...form,
            participants: newParticipants
        });
    };

    const handleFileSelect = () => {
        fileInputRef.current.click();
    };

    const handleFileUpload = (e) => {
        const files = Array.from(e.target.files);
        setForm({
            ...form,
            files: [...form.files, ...files]
        });
    };

    const handleRemoveFile = (index) => {
        const newFiles = [...form.files];
        newFiles.splice(index, 1);
        setForm({
            ...form,
            files: newFiles
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Преобразуем временные метки в нужный формат для сервера
        let startDateObj = null;
        let endDateObj = null;
        if (startDate && startTime) {
            startDateObj = new Date(`${startDate}T${startTime}`);
        }
        if (endDate && endTime) {
            endDateObj = new Date(`${endDate}T${endTime}`);
        }
        const taskData = {
            ...form,
            startDate: startDateObj ? startDateObj.toISOString() : null,
            endDate: endDateObj ? endDateObj.toISOString() : null,
            checklist: form.checklist || [],
            participants: form.participants || []
        };
        delete taskData.timeline;
        // Передаем только данные задачи и файлы отдельно
        onSubmit({ ...taskData, files: form.files });
        setForm({
            title: '',
            description: '',
            checklist: [],
            participants: [],
            tagId: null,
            files: []
        });
        setStartDate('');
        setStartTime('');
        setEndDate('');
        setEndTime('');
        onClose();
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

    useEffect(() => {
        if (isOpen && boardId) {
            console.log('Fetching board tags for boardId:', boardId);
            dispatch(fetchBoardTagsRequest(boardId));
        }
    }, [isOpen, boardId, dispatch]);

    useEffect(() => {
        setAvailableTags(boardTags);
    }, [boardTags]);

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
                    <div className="create-task-modal-title">Создать задачу</div>
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
                                    <img src={CheckIcon} alt="check" className="create-task-modal-checklist-icon" />
                                    <span>{item.text}</span>
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
                <div className="create-task-modal-input-row">
                    <input 
                        className="create-task-modal-input" 
                        value={participantInput} 
                        onChange={(e) => setParticipantInput(e.target.value)} 
                        onKeyPress={handleParticipantKeyPress}
                        placeholder="email@example.com"
                    />
                    <button 
                        type="button" 
                        className="create-task-modal-add-button"
                        onClick={handleAddParticipant}
                    >
                        Добавить участника
                    </button>
                </div>
                
                {/* Участники - аватары */}
                <div className="create-project-modal-avatars-row">
                    {form.participants.slice(0, 3).map((username, idx) => {
                        const user = usersByUsername[username];
                        return (
                            <img
                                key={username}
                                src={user?.avatarURL || Girl}
                                alt={username}
                                className="create-project-modal-avatar"
                                title={username}
                            />
                        );
                    })}
                    {form.participants.length > 3 && (
                        <span className="create-project-modal-avatars-more">+{form.participants.length - 3}</span>
                    )}
                </div>
                
                {/* Список участников с возможностью удаления */}
                {form.participants.length > 0 && (
                    <div className="create-task-modal-participants">
                        {form.participants.map((participant, index) => (
                            <div key={index} className="create-task-modal-participant">
                                <img 
                                    src={usersByUsername[participant]?.avatarURL || Girl} 
                                    alt={participant} 
                                    className="create-task-modal-participant-avatar"
                                />
                                <span>{participant}</span>
                                <span 
                                    className="create-task-modal-participant-remove"
                                    onClick={() => handleRemoveParticipant(index)}
                                >
                                    ×
                                </span>
                            </div>
                        ))}
                    </div>
                )}
                
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
                    <button 
                        type="button" 
                        className="create-task-modal-file-button"
                        onClick={handleFileSelect}
                    >
                        <img src={ClipIcon} alt="attach" className="create-task-modal-file-icon" />
                        <span>Выбрать файлы</span>
                    </button>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                        multiple
                    />
                    
                    {form.files.length > 0 && (
                        <div className="create-task-modal-files-list">
                            {form.files.map((file, index) => (
                                <div key={index} className="create-task-modal-file-item">
                                    <img src={ClipIcon} alt="file" className="create-task-modal-file-icon" />
                                    <div className="create-task-modal-file-info">
                                        <div className="create-task-modal-file-name">{file.name}</div>
                                        <div className="create-task-modal-file-size">
                                            {(file.size / 1024).toFixed(1)} KB
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
                    )}
                </div>
                
                {/* Submit Button */}
                <button type="submit" className="create-task-modal-submit">
                    Создать задачу
                </button>
            </form>
        </div>
    );
}

export default CreateTaskModal; 