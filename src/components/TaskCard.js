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

function TaskCard({ task, onClick }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const modalRef = useRef(null);
    const optionsRef = useRef(null);
    const cardRef = useRef(null);
    const dispatch = useDispatch();
    
    const [deleteTask] = useDeleteTaskMutation();
    const [updateTask] = useUpdateTaskMutation();
    
    // Получаем данные пользователей из Redux
    const usersByUsername = useSelector(state => state.users?.byUsername || {});
    
    // Функция для получения имени пользователя из разных форматов данных
    const getUsernameFromParticipant = (participant) => {
        if (typeof participant === 'string') {
            return participant;
        } else if (participant) {
            return participant.username || participant.name || '';
        }
        return '';
    };
    
    // Загружаем данные пользователей при монтировании компонента
    useEffect(() => {
        if (task?.participants && task.participants.length > 0) {
            task.participants.forEach(participant => {
                // Получаем имя пользователя
                const username = getUsernameFromParticipant(participant);
                
                if (username && usersByUsername && !usersByUsername[username]) {
                    console.log('Запрашиваем данные пользователя:', username);
                    dispatch({ type: 'users/fetchUser', payload: username });
                }
            });
        }
    }, [task?.participants, usersByUsername, dispatch]);
    
    // Отладочный вывод
    console.log('Отрисовка карточки задачи:', task);
    console.log('Доступные данные пользователей:', usersByUsername);
    
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
        deleteTask(task.id);
        setIsModalOpen(false);
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
            ...updatedTaskData
        };
        console.log('Отправка обновленных данных задачи:', updatedTask);
        updateTask(updatedTask);
        setIsEditModalOpen(false);
    };
    
    // Обработчик клика на карточку, предотвращающий срабатывание при открытом модальном окне
    const handleCardClick = (e) => {
        // Если открыто окно редактирования, не вызываем onClick
        if (isEditModalOpen) {
            e.stopPropagation();
            return;
        }
        
        // Иначе передаем событие дальше
        if (onClick) onClick(task);
    };
    
    if (!task) {
        console.warn('Попытка отрисовать задачу с пустыми данными!');
        return null;
    }
    
    // Calculate checklist progress
    const totalChecklist = task.checklist?.length || 0;
    const completedChecklist = task.checklist?.filter(item => item.completed)?.length || 0;
    const checklistProgress = totalChecklist > 0 ? `${completedChecklist}/${totalChecklist}` : '0/0';
    
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

                <div ref={optionsRef} onClick={handleOptionsClick}>
                    <img src={OptionsPassive} alt="Options"/>
                </div>
            </div>

            <div className='task-card-text-info-container'>
                <div className='task-card-text-info-header'>{task.title}</div>
                <div className='task-card-text-info-text'>{task.description}</div>
            </div>

            <div className='task-card-points-list'>
                <img src={TaskListIcon} className='task-card-points-list-icon' alt="Checklist"/>
                <div className='task-card-points-list-counter'>{checklistProgress}</div>
            </div>

            <div className='task-card-delimiter'></div>

            <div className='task-card-down-container'>
                {/* Участники */}
                {task.participants && task.participants.length > 0 && (
                    <div className="task-card-people">
                        {task.participants.slice(0, 4).map((participant, index) => {
                            // Получаем имя пользователя
                            const username = getUsernameFromParticipant(participant);
                            
                            // Определяем URL аватарки
                            let avatarURL;
                            if (typeof participant === 'object' && participant && participant.avatarURL) {
                                // Если у объекта участника есть аватарка, используем её
                                avatarURL = participant.avatarURL;
                            } else if (usersByUsername[username]) {
                                // Иначе ищем в Redux store
                                avatarURL = usersByUsername[username].avatarURL;
                            } else {
                                // Если нигде нет, генерируем по имени
                                avatarURL = `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;
                            }
                            
                            return (
                                <div className="task-card-people-item" key={index} title={username}>
                                    <img 
                                        src={avatarURL || Girl} 
                                        alt={username}
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
                {/* Spacer для выравнивания справа */}
                <div style={{ flexGrow: 1 }}></div>
                {/* Комментарии и вложения */}
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
