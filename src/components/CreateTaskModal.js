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

function CreateTaskModal({ isOpen, onClose, onSubmit, boardId }) {
    const dispatch = useDispatch();
    const usersByUsername = useSelector(state => state.users?.byUsername || {});
    const { data: boardTags = [] } = useGetTagsQuery(boardId);
    
    // Get board participants from store
    const boardData = useSelector(state => 
        state.boards?.entities?.find(board => board.id === boardId) || 
        state.api?.queries?.[`getBoardWithData(${boardId})`]?.data
    );
    
    // Normalize board participants to ensure they are in a consistent format
    const normalizedBoardParticipants = React.useMemo(() => {
        const participants = boardData?.participants || [];
        return participants.map(participant => {
            if (typeof participant === 'string') {
                return participant;
            } else if (participant && participant.username) {
                return participant.username;
            }
            return null;
        }).filter(Boolean); // Remove any null values
    }, [boardData]);
    
    const [form, setForm] = useState({
        title: '',
        description: '',
        checklist: [],
        participants: [],
        tagId: null,
        files: []
    });
    
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

    // Add participant from dropdown
    const handleAddParticipant = () => {
        console.log('Adding participant:', selectedParticipant);
        console.log('Current participants:', form.participants);
        
        if (selectedParticipant && !form.participants.includes(selectedParticipant)) {
            // Load user data from API if needed
            dispatch({ type: 'users/fetchUser', payload: selectedParticipant });
            
            // Создаем новый массив с добавленным участником
            const updatedParticipants = [...form.participants, selectedParticipant];
            console.log('Updated participants list:', updatedParticipants);
            
            // Используем функциональную форму setState для гарантированного доступа к актуальному состоянию
            setForm(prevForm => {
                const newForm = {
                    ...prevForm,
                    participants: [...prevForm.participants, selectedParticipant]
                };
                console.log('New form state:', newForm);
                
                // Сразу логируем для проверки
                console.group('🧑‍💻 Обновление списка участников');
                console.log('✅ Участник добавлен:', selectedParticipant);
                console.log('👥 Новый список:', newForm.participants);
                console.groupEnd();
                
                return newForm;
            });
            
            // Сбрасываем выбранного участника
            setSelectedParticipant('');
            
            // Выводим для отладки текущее состояние через таймаут
            setTimeout(() => {
                console.log('Form state after update:', form);
                console.log('Participants after update:', form.participants);
                
                // Проверяем, есть ли участники в DOM
                const participantsEl = document.querySelector('.create-task-modal-participants');
                if (participantsEl) {
                    console.log('✅ Участники в DOM:', participantsEl.childElementCount);
                } else {
                    console.log('❌ Контейнер участников не найден в DOM');
                }
            }, 100);
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

    // Сбрасываем состояние формы при закрытии модального окна
    useEffect(() => {
        if (!isOpen) {
            setForm({
                title: '',
                description: '',
                checklist: [],
                participants: [],
                tagId: null,
                files: []
            });
            setSelectedParticipant('');
            setStartDate('');
            setStartTime('');
            setEndDate('');
            setEndTime('');
        }
    }, [isOpen]);

    // Fetch board data when modal opens
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

    // Handle tag selection
    const handleTagSelect = (tagId) => {
        setForm({
            ...form,
            tagId: tagId
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
        
        // Сбрасываем форму после отправки
        setForm({
            title: '',
            description: '',
            checklist: [],
            participants: [],
            tagId: null,
            files: []
        });
        setSelectedParticipant('');
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

    if (!isOpen) return null;
    
    // Debug output
    console.log("CreateTaskModal rendering with state:", {
        selectedParticipant,
        formParticipants: form.participants,
        boardParticipants: normalizedBoardParticipants
    });

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
                                    className="create-task-modal-remove-button"
                                    onClick={() => handleRemoveChecklistItem(index)}
                                    title="Удалить пункт"
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
                
                {/* Список добавленных участников - всегда отображается */}
                <div className="create-task-modal-participants-section">
                    <div className="create-task-modal-participants-header">
                        Выбранные участники ({form.participants ? form.participants.length : 0})
                    </div>
                    
                    {form.participants && form.participants.length > 0 ? (
                        <div className="create-task-modal-participants">
                            {form.participants.map((participant, index) => (
                                <div key={index} className="create-task-modal-participant">
                                    <img 
                                        src={usersByUsername && usersByUsername[participant]?.avatarURL || Girl} 
                                        alt={participant} 
                                        className="create-task-modal-participant-avatar"
                                    />
                                    <span title={participant}>
                                        {usersByUsername[participant]?.displayName || participant}
                                    </span>
                                    <span 
                                        className="create-task-modal-remove-button"
                                        onClick={() => handleRemoveParticipant(index)}
                                        title="Удалить участника"
                                    >
                                        ×
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="create-task-modal-no-participants">
                            <div>Список участников пуст</div>
                            <div style={{fontSize: '12px', marginTop: '4px', opacity: '0.7'}}>Используйте форму ниже для добавления участников</div>
                        </div>
                    )}
                </div>
                
                {/* Добавление участника */}
                <div className="create-task-modal-input-row">
                    <select
                        className="create-task-modal-input"
                        value={selectedParticipant}
                        onChange={(e) => setSelectedParticipant(e.target.value)}
                    >
                        <option value="">Выберите участника</option>
                        {normalizedBoardParticipants
                            .filter(username => !form.participants.includes(username))
                            .map(username => (
                                <option key={username} value={username}>
                                    {usersByUsername[username]?.displayName || username}
                                </option>
                            ))
                        }
                    </select>
                    <button 
                        type="button" 
                        className="create-task-modal-add-button"
                        onClick={handleAddParticipant}
                        disabled={!selectedParticipant}
                    >
                        Добавить участника
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
                    {availableTags && availableTags.length > 0 ? (
                        availableTags.map(tag => (
                            <option key={tag.id} value={tag.id}>
                                {tag.name}
                            </option>
                        ))
                    ) : (
                        <option disabled>Загрузка тегов...</option>
                    )}
                </select>
                <div className="create-task-modal-tags-preview">
                    {form.tagId && availableTags && availableTags.find(tag => tag.id === form.tagId) && (
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
                        <div className="create-task-modal-files-container">
                            <div className="create-task-modal-participants-header">
                                Выбранные файлы ({form.files.length})
                            </div>
                            <div className="create-task-modal-files-list">
                                {form.files.map((file, index) => (
                                    <div key={index} className="create-task-modal-file-item">
                                        <div className="create-task-modal-file-icon-container">
                                            <img src={ClipIcon} alt="file" className="create-task-modal-file-icon" />
                                        </div>
                                        <div className="create-task-modal-file-info">
                                            <div className="create-task-modal-file-name" title={file.name}>{file.name}</div>
                                            <div className="create-task-modal-file-size">
                                                {(file.size / 1024).toFixed(1)} KB
                                            </div>
                                        </div>
                                        <span 
                                            className="create-task-modal-remove-button"
                                            onClick={() => handleRemoveFile(index)}
                                            title="Удалить файл"
                                        >
                                            ×
                                        </span>
                                    </div>
                                ))}
                            </div>
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