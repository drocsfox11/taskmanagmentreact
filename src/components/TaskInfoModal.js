import React from 'react';
import { useSelector } from 'react-redux';
import '../styles/components/CreateTaskModal.css';
import CloseCross from "../assets/icons/cross for task.svg";
import CalendarIcon from "../assets/icons/calender_for_task.svg";
import ClipIcon from "../assets/icons/clip.svg";
import CheckIcon from "../assets/icons/task_list.svg";
import Girl from "../assets/icons/profile_picture.svg";

function TaskInfoModal({ isOpen, onClose, task }) {
    const usersByUsername = useSelector(state => state.users.byUsername);

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
                <div className="create-task-modal-textarea" style={{ background: 'none', border: 'none', padding: 0 }}>{task.description}</div>
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
                <div className="create-project-modal-avatars-row">
                    {task.participants && task.participants.length > 0 ? (
                        task.participants.slice(0, 3).map((participant, idx) => {
                            const username = typeof participant === 'string' ? participant : participant.username;
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
                        })
                    ) : <span style={{ color: '#969595', fontSize: 14 }}>Нет участников</span>}
                    {task.participants && task.participants.length > 3 && (
                        <span className="create-project-modal-avatars-more">+{task.participants.length - 3}</span>
                    )}
                </div>
                {/* Tags */}
                <div className="create-task-modal-label">Тег</div>
                <div className="create-task-modal-input" style={{ background: 'none', border: 'none', padding: 0 }}>{task.tags || '-'}</div>
                {/* Files */}
                <div className="create-task-modal-label">Вложения</div>
                <div className="create-task-modal-files-section">
                    {task.attachments && task.attachments.length > 0 ? (
                        <div className="create-task-modal-files-list">
                            {task.attachments.map((file, index) => (
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
                    ) : (
                        <span style={{ color: '#969595', fontSize: 14 }}>Нет вложений</span>
                    )}
                </div>
            </div>
        </div>
    );
}

export default TaskInfoModal; 