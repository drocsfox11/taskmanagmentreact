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
    useUploadTaskAttachmentsMutation,
    useDeleteAttachmentMutation,
    useDeleteAllTaskAttachmentsMutation
} from '../services/api/attachmentsApi';

function EditTaskModal({ isOpen, onClose, onSubmit, task, boardId: propBoardId }) {
    const dispatch = useDispatch();
    const { boardId: urlBoardId } = useParams();
    const boardId = propBoardId || task?.boardId || urlBoardId;
    const usersByUsername = useSelector(state => state.users?.byUsername || {});
    const { data: boardTags = [] } = useGetTagsQuery(boardId);
    
    const [uploadAttachment] = useUploadTaskAttachmentMutation();
    const [uploadAttachments] = useUploadTaskAttachmentsMutation();
    const [deleteAttachment] = useDeleteAttachmentMutation();
    const [deleteAllAttachments] = useDeleteAllTaskAttachmentsMutation();
    
    const [filesToUpload, setFilesToUpload] = useState([]);
    const [attachmentsToDelete, setAttachmentsToDelete] = useState([]);
    
    const [localAttachments, setLocalAttachments] = useState([]);
    
    const [oldAttachmentIds, setOldAttachmentIds] = useState([]);
    
    const boardData = useSelector(state =>
        state.boards?.entities?.find(board => board.id === boardId) || 
        state.api?.queries?.[`getBoardWithData(${boardId})`]?.data
    );
    
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
    
    const normalizedBoardParticipants = React.useMemo(() => {
        const participants = boardData?.participants || [];
        return participants.map(participant => {
            if (typeof participant === 'string') {
                return participant;
            } else if (participant && participant.username) {
                return participant.username;
            } else if (participant && participant.name) {
                return participant.name;
            }
            return null;
        }).filter(Boolean);
    }, [boardData]);
    
    useEffect(() => {
        if (isOpen && boardData) {
            console.log('Board participants:', boardData.participants);
            console.log('Normalized participants:', normalizedBoardParticipants);
            console.log('Task participants:', task.participants);
            console.log('Participant IDs by name:', participantIdsByName);
        }
    }, [isOpen, boardData, normalizedBoardParticipants, task.participants, participantIdsByName]);
    
    const [form, setForm] = useState({
        title: task.title || '',
        description: task.description || '',
        checklist: task.checklist || [],
        participants: task.participants || [],
        tagId: task.tag?.id || null,
        files: task.files || []
    });
    
    useEffect(() => {
        if (task && isOpen) {
            console.log('Initializing form with task data:', task);
            
            let participants = [];
            if (Array.isArray(task.participants)) {
                participants = task.participants.map(p => {
                    if (typeof p === 'number') return p;
                    if (typeof p === 'object' && p !== null) return p.id || p;
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
            
            setFilesToUpload([]);
            setAttachmentsToDelete([]);
            
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

    useEffect(() => {
        if (task && isOpen && task.attachments) {
            setOldAttachmentIds(task.attachments.map(a => a.id));
            setLocalAttachments([...task.attachments]);
        }
    }, [task, isOpen]);

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
        form.participants.forEach(username => {
            if (username && (!usersByUsername || !usersByUsername[username])) {
                dispatch({ type: 'users/fetchUser', payload: username });
            }
        });
    }, [form.participants, usersByUsername, dispatch]);

    useEffect(() => {
        if (isOpen && boardId) {
            console.log('Fetching board data for boardId:', boardId);
            
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
        const prevTagsJSON = JSON.stringify(prevBoardTagsRef.current);
        const currentTagsJSON = JSON.stringify(boardTags);
        
        if (prevTagsJSON !== currentTagsJSON) {
            setAvailableTags(boardTags);
            prevBoardTagsRef.current = boardTags;
        }
    }, [boardTags]);

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({
            ...prev,
            [name]: value
        }));
    };

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

    const handleRemoveChecklistItem = (index) => {
        setForm(prev => ({
            ...prev,
            checklist: prev.checklist.filter((_, i) => i !== index)
        }));
    };

    const handleAddParticipant = () => {
        if (!selectedParticipant || !selectedParticipant.trim()) return;
        
        const participant = boardData?.participants?.find(p => p.name === selectedParticipant);
        
        if (!participant || !participant.id) {
            console.error('Не удалось найти ID для участника:', selectedParticipant);
            return;
        }
        
        const participantId = participant.id;
        
        if (form.participants.includes(participantId)) {
            console.log('Участник уже добавлен:', selectedParticipant);
            setSelectedParticipant('');
            return;
        }
        
        console.log('Adding participant:', selectedParticipant, 'with ID:', participantId);
        
        setForm(prevForm => {
            const updatedParticipants = [...prevForm.participants, participantId];
            
            console.log('Updated participants list:', updatedParticipants);
            
            return {
                ...prevForm,
                participants: updatedParticipants
            };
        });
        
        setSelectedParticipant('');
    };

    const handleRemoveParticipant = (index) => {
        setForm(prevForm => {
            const newParticipants = [...prevForm.participants];
            newParticipants.splice(index, 1);
            return {
                ...prevForm,
                participants: newParticipants
            };
        });
    };

    const handleFileUpload = (e) => {
        const newFiles = Array.from(e.target.files);
        
        // Проверка размера каждого файла (максимум 50 МБ)
        const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 МБ в байтах
        const oversizedFiles = newFiles.filter(file => file.size > MAX_FILE_SIZE);
        
        if (oversizedFiles.length > 0) {
            alert(`Следующие файлы превышают лимит в 50 МБ:\n${oversizedFiles.map(f => f.name).join('\n')}`);
            return;
        }
        
        const currentFilesSize = form.files
            .filter(file => file instanceof File) // Только новые файлы
            .reduce((total, file) => total + file.size, 0);
            
        const localAttachmentsSize = localAttachments
            .reduce((total, attachment) => total + (attachment.fileSize || 0), 0);
            
        const newFilesSize = newFiles.reduce((total, file) => total + file.size, 0);
        
        const MAX_TOTAL_SIZE = 100 * 1024 * 1024; // 100 МБ в байтах
        
        if (currentFilesSize + localAttachmentsSize + newFilesSize > MAX_TOTAL_SIZE) {
            alert(`Общий размер файлов превышает лимит в 100 МБ. Пожалуйста, выберите меньше файлов.`);
            return;
        }
        
        setFilesToUpload(prev => [...prev, ...newFiles]);
        
        setForm(prev => ({
            ...prev,
            files: [...prev.files, ...newFiles]
        }));
    };

    const handleRemoveFile = (index) => {
        setForm(prev => {
            const updatedFiles = [...prev.files];
            const removedFile = updatedFiles.splice(index, 1)[0];
            
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
    
    const handleRemoveAttachment = (attachmentId) => {
        setAttachmentsToDelete(prev => [...prev, attachmentId]);
        
        setOldAttachmentIds(prev => prev.filter(id => id !== attachmentId));
        
        setLocalAttachments(prev => prev.filter(attachment => attachment.id !== attachmentId));
    };

    const handleRemoveAllAttachments = () => {
        if (!localAttachments || localAttachments.length === 0) return;
        
        if (!window.confirm('Вы уверены, что хотите удалить все вложения?')) return;
        
        setAttachmentsToDelete(["DELETE_ALL"]);
        
        setOldAttachmentIds([]);
        
        setLocalAttachments([]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            let taskData = { ...form };
            
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
            
            const combinedFiles = [...filesToUpload];
            
            const updatedPayload = {
                ...taskData, 
                id: task.id,
                boardId: task.boardId,
                columnId: task.columnId,
                attachments: oldAttachmentIds,
                attachmentsToDelete: attachmentsToDelete,
            };
            
            onClose();
            
            onSubmit({
                ...updatedPayload,
                files: combinedFiles,
            });
        } catch (error) {
            console.error('Error submitting task:', error);
        }
    };

    const handleChecklistKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddChecklistItem();
        }
    };

    const handleToggleChecklistItem = (index) => {
        setForm(prev => ({
            ...prev,
            checklist: prev.checklist.map((item, i) => 
                i === index ? { ...item, completed: !item.completed } : item
            )
        }));
    };

    const handleTagSelect = (tagId) => {
        setForm({
            ...form,
            tagId: tagId
        });
    };

    const getParticipantNameById = (participantId) => {
        if (!boardData || !boardData.participants) return '';
        
        const participant = boardData.participants.find(p => p.id === participantId);
        return participant ? participant.name : `Участник #${participantId}`;
    };
    
    const getParticipantAvatarById = (participantId) => {
        if (!boardData || !boardData.participants) return Girl;
        
        const participant = boardData.participants.find(p => p.id === participantId);
        return participant && participant.avatarURL ? participant.avatarURL : Girl;
    };

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
                
                <div className="create-task-modal-label">Название</div>
                <input 
                    className="create-task-modal-input" 
                    name="title" 
                    value={form.title} 
                    onChange={handleFormChange} 
                    placeholder="Введите название"
                    required
                />
                
                <div className="create-task-modal-label">Описание</div>
                <textarea 
                    className="create-task-modal-textarea" 
                    name="description" 
                    value={form.description} 
                    onChange={handleFormChange} 
                    placeholder="Введите описание"
                    rows={3}
                />
                
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
                
                <div className="create-task-modal-input-row">
                    <select
                        className="create-task-modal-input"
                        value={selectedParticipant}
                        onChange={(e) => setSelectedParticipant(e.target.value)}
                    >
                        <option value="">Выберите участника</option>
                        {boardData?.participants
                            .filter(participant => {
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
                                        const fileIndex = filesToUpload.indexOf(file);
                                        if (fileIndex !== -1) {
                                            const newFiles = [...filesToUpload];
                                            newFiles.splice(fileIndex, 1);
                                            setFilesToUpload(newFiles);
                                            
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
                
                <button type="submit" className="create-task-modal-submit">
                    Сохранить изменения
                </button>
            </form>
        </div>
    );
}

export default EditTaskModal; 