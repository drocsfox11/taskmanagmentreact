import React from 'react';
import { useSelector } from 'react-redux';
import '../styles/components/CreateTaskModal.css';
import CloseCross from "../assets/icons/cross for task.svg";
import CalendarIcon from "../assets/icons/calender_for_task.svg";
import ClipIcon from "../assets/icons/clip.svg";
import CheckIcon from "../assets/icons/task_list.svg";
import Girl from "../assets/icons/profile_picture.svg";

function TaskInfoModal({ isOpen, onClose, task }) {
    const usersByUsername = useSelector(state => state.users?.byUsername || {});

    // Helper function to extract username from participant
    const extractUsername = (participant) => {
        if (typeof participant === 'string') {
            return participant;
        } else if (participant) {
            // Check for name as well, as per task data structure
            return participant.username || participant.name || '';
        }
        return '';
    };

    if (!isOpen || !task) return null;

    return (
        <div className="create-task-modal-overlay">
            <div className="create-task-modal">
                <div className="create-task-modal-header">
                    <div className="create-task-modal-title">Информация о задаче</div>
                    <img 
                        src={CloseCross} 
                        alt="close" 
                        className="create-task-modal-close" 
                        onClick={onClose}
                    />
                </div>
                {/* Title */}
                <div className="create-task-modal-label">Название</div>
                <div className="create-task-modal-input" style={{ background: 'none', border: 'none', padding: 0 }}>{task.title}</div>
                {/* Description */}
                <div className="create-task-modal-label">Описание</div>
                <div className="create-task-modal-textarea" style={{ background: 'none', border: 'none', padding: 0 }}>{task.description || '-'}</div>
                {/* Checklist */}
                <div className="create-task-modal-label">Чеклист</div>
                <div className="create-task-modal-checklist-items">
                    {task.checklist && task.checklist.length > 0 ? task.checklist.map((item, index) => (
                        <div key={index} className="create-task-modal-checklist-item">
                            <div className="create-task-modal-checklist-item-content">
                                <img src={CheckIcon} alt="check" className="create-task-modal-checklist-icon" />
                                <span style={{ textDecoration: item.completed ? 'line-through' : 'none' }}>{item.text}</span>
                            </div>
                        </div>
                    )) : <div style={{ color: '#969595', fontSize: 14 }}>Нет пунктов</div>}
                </div>
                {/* Timeline */}
                <div className="create-task-modal-label">Таймлайн</div>
                <div className="create-task-modal-timeline">
                    <div className="create-task-modal-timeline-row">
                        <div className="create-task-modal-timeline-group">
                            <img src={CalendarIcon} alt="calendar" className="create-task-modal-timeline-icon" />
                            <span>{task.startDate ? new Date(task.startDate).toLocaleString() : '-'}</span>
                        </div>
                    </div>
                    <div className="create-task-modal-timeline-separator">-</div>
                    <div className="create-task-modal-timeline-row">
                        <div className="create-task-modal-timeline-group">
                            <img src={CalendarIcon} alt="calendar" className="create-task-modal-timeline-icon" />
                            <span>{task.endDate ? new Date(task.endDate).toLocaleString() : '-'}</span>
                        </div>
                    </div>
                </div>
                {/* Participants */}
                <div className="create-task-modal-label">Участники</div>
                {task.participants && task.participants.length > 0 ? (
                    <div className="create-task-modal-participants">
                        {task.participants.map((participant, index) => {
                            const username = extractUsername(participant);
                            const user = usersByUsername ? usersByUsername[username] : null;
                            // Use participant.avatarURL from task data if user or user.avatarURL is not found in Redux
                            const avatar = user?.avatarURL || participant?.avatarURL || Girl;
                            // Display participant.name from task data if user.displayName or user.name is not found
                            const displayName = user?.displayName || user?.name || (typeof participant === 'object' ? participant.name : username) || 'Unknown User';
                            return (
                                <div key={index} className="create-task-modal-participant">
                                    <img 
                                        src={avatar} 
                                        alt={displayName} 
                                        className="create-task-modal-participant-avatar"
                                    />
                                    <span>{displayName}</span>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div style={{ color: '#969595', fontSize: 14 }}>Нет участников</div>
                )}
                
                {/* Tags */}
                <div className="create-task-modal-label">Тег</div>
                {task.tag && task.tag.id && task.tag.name ? (
                    <div className="create-task-modal-tags-preview">
                        <div 
                            className="create-task-modal-tag-preview"
                            style={{ backgroundColor: task.tag.color || '#EFEFEF' }}
                        >
                            {task.tag.name}
                        </div>
                    </div>
                ) : (
                    <div style={{ color: '#969595', fontSize: 14 }}>Без тега</div>
                )}
                
                {/* Files */}
                <div className="create-task-modal-label">Вложения</div>
                <div className="create-task-modal-files-section">
                    {task.attachments && task.attachments.length > 0 ? (
                        <div className="create-task-modal-files-list">
                            {task.attachments.map((file) => (
                                <div key={file.id} className="create-task-modal-file-item">
                                    <div className="create-task-modal-file-icon-container">
                                        <img src={ClipIcon} alt="file" className="create-task-modal-file-icon" />
                                    </div>
                                    <div className="create-task-modal-file-info">
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
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ color: '#969595', fontSize: 14 }}>Нет вложений</div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default TaskInfoModal; 