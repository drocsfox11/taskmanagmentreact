import '../styles/components/TaskCard.css'
import OptionsPassive from "../assets/icons/options_passive.svg";
import Girl from "../assets/icons/profile_picture.svg";
import TaskListIcon from "../assets/icons/task_list.svg";
import EyeIcon from "../assets/icons/eye.svg";
import CommentIcon from "../assets/icons/comments.svg";
import Clip from "../assets/icons/clip.svg";
import { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useDeleteTaskMutation, useUpdateTaskMutation } from '../services/api/tasksApi';
import EditTaskModal from './EditTaskModal';
import { EmojiProvider, Emoji } from "react-apple-emojis";
import emojiData from "react-apple-emojis/src/data.json";
import Avatar from './Avatar';
import { BoardRightGuard, useBoardRights } from './permissions';
import { BOARD_RIGHTS } from '../constants/rights';

function TaskCard({ task, onClick }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const modalRef = useRef(null);
    const optionsRef = useRef(null);
    const cardRef = useRef(null);

    const [deleteTask] = useDeleteTaskMutation();
    const [updateTask] = useUpdateTaskMutation();
    
    const { hasRight } = useBoardRights(task?.boardId);
    
    const canEditTask = hasRight(BOARD_RIGHTS.EDIT_TASKS);
    const canDeleteTask = hasRight(BOARD_RIGHTS.DELETE_TASKS);
    
    const showOptionsIcon = canEditTask || canDeleteTask;
    

    
    console.log('Отрисовка карточки задачи:', task);
    console.log('Права пользователя - редактирование:', canEditTask, 'удаление:', canDeleteTask);
    
    const handleOptionsClick = (e) => {
        e.stopPropagation();
        setIsModalOpen(true);
    };

    const handleClickOutside = (e) => {
        if (modalRef.current && !modalRef.current.contains(e.target) && 
            optionsRef.current && !optionsRef.current.contains(e.target)) {
            setIsModalOpen(false);
        }
    };

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);
    
    const handleDeleteTask = () => {
        console.log(`Deleting task with id: ${task.id}, boardId: ${task.boardId}`);
        
        setIsModalOpen(false);
        
        const taskId = Number(task.id);
        const boardId = Number(task.boardId);
        

        deleteTask({
            id: taskId,
            boardId: boardId,
            columnId: Number(task.columnId)
        })
        .unwrap()
        .then(() => {
            console.log('Task successfully deleted');
        })
        .catch(error => {
            console.error('Failed to delete task:', error);

        });
    };
    
    const handleEditTask = (e) => {
        e.stopPropagation();
        setIsModalOpen(false);
        console.log('Открытие модального окна редактирования задачи:', task);
        setIsEditModalOpen(true);
    };
    
    const handleCloseEditModal = () => {
        setIsEditModalOpen(false);
    };
    
    const handleUpdateTask = (updatedTaskData) => {
        const updatedTask = {
            ...task,
            ...updatedTaskData,
            boardId: task.boardId,
            columnId: task.columnId
        };
        
        console.log('Отправка обновленных данных задачи:', updatedTask);
        
        setIsEditModalOpen(false);
        
        updateTask(updatedTask)
            .unwrap()
            .then(result => {
                console.log('Task updated successfully with attachments:', result);
            })
            .catch(error => {
                console.error('Failed to update task:', error);
            });
    };
    
    const handleCardClick = (e) => {
        if (isEditModalOpen) {
            e.stopPropagation();
            return;
        }
        
        if (onClick) onClick(task);
    };
    
    if (!task) {
        console.warn('Попытка отрисовать задачу с пустыми данными!');
        return null;
    }
    
    const totalChecklist = task.checklist?.length || 0;
    const completedChecklist = task.checklist?.filter(item => item.completed)?.length || 0;
    const checklistCount = totalChecklist > 0 ? `${totalChecklist}` : '0';
    
    const hasEmoji = task.emoji && task.emoji.trim() !== '';
    
    const dueDate = task.dueDate ? new Date(task.dueDate) : null;
    
    const formattedDueDate = dueDate
        ? dueDate.toLocaleDateString('ru-RU', { 
            day: '2-digit', 
            month: '2-digit'
        })
        : null;
        
    const hasTags = task.tags && task.tags.length > 0;
    
    const hasParticipants = task.participants && task.participants.length > 0;
    
    const hasChecklist = task.checklist && task.checklist.length > 0;
    
    const checklistTotal = hasChecklist ? task.checklist.length : 0;
    const checklistCompleted = hasChecklist 
        ? task.checklist.filter(item => item.completed).length 
        : 0;
    const checklistPercentage = checklistTotal > 0 
        ? Math.round((checklistCompleted / checklistTotal) * 100) 
        : 0;
    
    return (
        <div className='task-card-container' ref={cardRef} style={{ position: 'relative' }} onClick={handleCardClick}>
            <div className='task-card-label-container'>
                {task.tag ? (
                    <div className='task-card-label-background' style={{ backgroundColor: task.tag.color }}>
                        {task.tag.name}
                    </div>
                ) : (
                    <div className='task-card-label-background' style={{ backgroundColor: '#E0E0E0', color: '#666666' }}>
                        Без тега
                    </div>
                )}

                {showOptionsIcon && (
                    <div ref={optionsRef} onClick={handleOptionsClick} style={{ cursor: 'pointer' }}>
                        <img src={OptionsPassive} alt="Options"/>
                    </div>
                )}
            </div>

            <div className='task-card-text-info-container'>
                <div className='task-card-text-info-header'>{task.title}</div>
                <div className='task-card-text-info-text'>{task.description}</div>
            </div>

            <div className='task-card-points-list'>
                <img src={TaskListIcon} className='task-card-points-list-icon' alt="Checklist"/>
                <div className='task-card-points-list-counter'>{checklistCount}</div>
            </div>

            <div className='task-card-delimiter'></div>

            <div className='task-card-down-container'>
                {task.participants && task.participants.length > 0 && (
                    <div className="task-card-people">
                        {task.participants.slice(0, 4).map((participant, index) => {

                            return (
                                <div className="task-card-people-item" key={index} title={participant.name}>
                                    <img 
                                        src={participant.avatarURL}
                                        alt={participant.name}
                                        style={{ 
                                            width: '100%', 
                                            height: '100%', 
                                            objectFit: 'cover',
                                            borderRadius: '50%'
                                        }}
                                    />
                                </div>
                            );
                        })}
                        {task.participants.length > 4 && (
                            <div className="task-card-people-item-more">
                                +{task.participants.length - 4}
                            </div>
                        )}
                    </div>
                )}
                <div style={{ flexGrow: 1 }}></div>
                <div className='task-card-misc-info-container'>
                    <div className='task-card-misc-info-row'>
                        <img src={CommentIcon} alt="Comments"/>
                        <div className='task-card-misc-info-row-text'>0</div>
                    </div>
                    <div className='task-card-misc-info-row'>
                        <img src={Clip} alt="Attachments"/>
                        <div className='task-card-misc-info-row-text'>{task.attachments?.length || 0}</div>
                    </div>
                </div>
            </div>
            
            {isModalOpen && (
                <div ref={modalRef} className="modal-container" style={{ 
                    position: 'absolute', 
                    top: '30px', 
                    right: '10px',
                    zIndex: 1000,
                    background: '#FFFFFF',
                    borderRadius: '5px',
                    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
                    padding: '8px 0',
                    width: '150px'
                }}>
                    <div className="modal-content-custom">
                        {canEditTask && (
                            <div className="modal-edit" 
                                onClick={handleEditTask}
                                style={{ 
                                    padding: '8px 16px', 
                                    cursor: 'pointer', 
                                    fontSize: '14px',
                                    fontFamily: 'Ruberoid Medium'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >Редактировать</div>
                        )}
                        {canDeleteTask && (
                            <div className="modal-delete" 
                                onClick={(e) => { e.stopPropagation(); handleDeleteTask(); }}
                                style={{ 
                                    padding: '8px 16px', 
                                    cursor: 'pointer', 
                                    color: '#FF5252',
                                    fontSize: '14px',
                                    fontFamily: 'Ruberoid Medium'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >Удалить</div>
                        )}
                    </div>
                </div>
            )}
            
            {isEditModalOpen && (
                <EditTaskModal 
                    isOpen={isEditModalOpen}
                    onClose={handleCloseEditModal}
                    onSubmit={handleUpdateTask}
                    task={task}
                />
            )}
        </div>
    );
}

export default TaskCard;
