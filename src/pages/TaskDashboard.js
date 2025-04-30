import TopBar from "../components/TopBar";
import '../styles/pages/TaskDashboard.css';
import ProjectMenu from "../components/ProjectMenu";
import { Emoji, EmojiProvider } from "react-apple-emojis";
import emojiData from "react-apple-emojis/src/data.json";
import Girl from "../assets/icons/profile_picture.svg";
import TaskCard from "../components/TaskCard";
import OptionsPassive from "../assets/icons/options_passive.svg";
import CloseCross from "../assets/icons/cross for task.svg";
import { useSelector, useDispatch } from 'react-redux';
import LoadingSpinner from "../components/LoadingSpinner";
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import CreateTaskModal from "../components/CreateTaskModal";
import { fetchColumnsByBoardRequest, createColumnRequest, deleteColumnRequest, updateColumnRequest, reorderColumnsRequest } from "../store/features/columns/columnsActions";
import { fetchTasksByBoardRequest, createTaskRequest } from "../store/features/tasks/tasksActions";
import { selectColumnsForBoard } from "../store/features/columns/columnsSelectors";
import { selectTasksForColumn, selectTaskCountForColumn } from "../store/features/tasks/tasksSelectors";
import { selectBoardById } from "../store/features/boards/boardsSelectors";
import TaskInfoModal from "../components/TaskInfoModal";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { reorderColumnsOptimistic, resetColumnsOrder } from '../store/features/columns/columnsSlice';
import { reorderTasksOptimistic, resetTasksOrder, moveTaskOptimistic } from '../store/features/tasks/tasksSlice';

function TaskDashboard() {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { projectId, boardId } = useParams();
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [currentColumnId, setCurrentColumnId] = useState(null);
    const [isAddSectionModalOpen, setIsAddSectionModalOpen] = useState(false);
    const [newSectionName, setNewSectionName] = useState('');
    const [isTaskInfoOpen, setIsTaskInfoOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [isParticipantsModalOpen, setIsParticipantsModalOpen] = useState(false);
    
    // Get data from Redux store
    const boardIdNum = Number(boardId);
    console.log('Используем boardId в числовом формате:', boardIdNum);
    
    const columns = useSelector(state => selectColumnsForBoard(state, boardIdNum));
    console.log('Колонки в компоненте:', columns);
    console.log('ID доски:', boardId);
    console.log('Состояние Redux:', useSelector(state => state.columns));
    
    const board = useSelector(state => selectBoardById(state, Number(boardId)));
    const isLoadingColumns = useSelector(state => state.ui.loading.columns);
    const isLoadingTasks = useSelector(state => state.ui.loading.tasks);
    const isLoading = isLoadingColumns || isLoadingTasks;
    
    // Получаем информацию о пользователях
    const usersByUsername = useSelector(state => state.users.byUsername);
    
    // Получаем участников доски
    const boardParticipants = board?.participants || [];
    
    // Загружаем данные о пользователях
    useEffect(() => {
        if (board?.participants) {
            board.participants.forEach(username => {
                if (!usersByUsername[username]) {
                    dispatch({ type: 'users/fetchUser', payload: username });
                }
            });
        }
    }, [board?.participants, usersByUsername, dispatch]);

    // Add a state to track data loading attempts
    const [loadAttempts, setLoadAttempts] = useState(0);
    const maxLoadAttempts = 3;

    // Load data when component mounts
    useEffect(() => {
        if (boardId) {
            console.log('Загрузка колонок для доски ID:', boardId);
            
            // Всегда загружаем свежие данные при монтировании компонента
            dispatch(fetchColumnsByBoardRequest(Number(boardId)));
            dispatch(fetchTasksByBoardRequest(Number(boardId)));
            
            // Increment load attempts
            setLoadAttempts(prev => prev + 1);
        }
    }, [dispatch, boardId]);

    // Handle opening task creation modal
    const handleOpenTaskModal = (columnId) => {
        setCurrentColumnId(columnId);
        setIsTaskModalOpen(true);
    };

    // Handle closing task creation modal
    const handleCloseTaskModal = () => {
        setIsTaskModalOpen(false);
        setCurrentColumnId(null);
    };

    // Handle task creation
    const handleCreateTask = (taskData) => {
        if (currentColumnId && boardId) {
            const newTask = {
                ...taskData,
                columnId: currentColumnId,
                boardId: Number(boardId),
                projectId: Number(projectId)
            };
            dispatch(createTaskRequest(newTask));
        }
    };

    // Handle section (column) creation
    const handleAddSection = () => {
        if (newSectionName.trim() && boardId) {
            const newColumn = {
                title: newSectionName,
                boardId: Number(boardId),
                position: columns.length
            };
            dispatch(createColumnRequest(newColumn));
            setNewSectionName('');
            setIsAddSectionModalOpen(false);
        }
    };

    // Drag-and-drop handler
    const tasksByColumnId = useSelector(state => state.tasks.byColumnId);
    const onDragEnd = (result) => {
        const { source, destination, draggableId, type } = result;
        if (!destination) return;
        
        // Перетаскивание колонок
        if (type === 'column') {
            const sourceIndex = source.index;
            const destIndex = destination.index;
            if (sourceIndex === destIndex) return;
            const newColumns = Array.from(columns);
            const [removed] = newColumns.splice(sourceIndex, 1);
            newColumns.splice(destIndex, 0, removed);
            
            // Убедимся, что ID колонок - числа
            const columnIds = newColumns.map(col => Number(col.id)).filter(id => !isNaN(id));
            const prevOrder = columns.map(col => col.id);
            
            console.log('Переупорядочивание колонок:', { columnIds, boardId: boardIdNum });
            
            // Оптимистично обновляем UI
            dispatch(reorderColumnsOptimistic({ boardId: boardIdNum, newOrder: columnIds }));
            
            // Отправляем запрос на сервер с использованием правильного эндпоинта
            dispatch(reorderColumnsRequest({ boardId: boardIdNum, columnIds, prevOrder }));
            return;
        }
        
        // Перетаскивание задач (теперь используется тип "task")
        if (type === 'task') {
            const sourceColId = Number(source.droppableId);
            const destColId = Number(destination.droppableId);
            const sourceIndex = source.index;
            const destIndex = destination.index;
            const taskId = Number(draggableId);
            
            console.log('Dragging task:', { 
                taskId, 
                sourceColId, 
                destColId, 
                sourceIndex, 
                destIndex
            });
            
            // Получаем текущий порядок задач в обеих колонках
            const sourceTasks = Array.from(tasksByColumnId[sourceColId] || []);
            const destTasks = sourceColId === destColId ? sourceTasks : Array.from(tasksByColumnId[destColId] || []);
            
            // Сохраняем копию порядка для возможного отката
            const prevSourceOrder = [...sourceTasks];
            const prevDestOrder = [...destTasks];
            
            if (sourceColId === destColId) {
                // Внутри одной колонки
                const newOrder = Array.from(prevSourceOrder);
                newOrder.splice(sourceIndex, 1);
                newOrder.splice(destIndex, 0, taskId);
                dispatch(reorderTasksOptimistic({ columnId: sourceColId, newOrder }));
                dispatch({ type: 'tasks/reorderTasksRequest', payload: { columnId: sourceColId, newOrder, prevOrder: prevSourceOrder } });
            } else {
                // Между колонками
                // 1. Оптимистично обновляем UI
                dispatch(moveTaskOptimistic({ 
                    taskId, 
                    sourceColumnId: sourceColId, 
                    destColumnId: destColId, 
                    destIndex 
                }));
                
                // 2. Отправляем запрос на сервер
                dispatch({ 
                    type: 'tasks/moveTaskRequest', 
                    payload: { 
                        taskId, 
                        sourceColumnId: sourceColId, 
                        destColumnId: destColId, 
                        destIndex, 
                        prevSourceOrder, 
                        prevDestOrder 
                    } 
                });
            }
        }
    };

    // If we've tried loading a few times and still don't have data, show a proper error
    if (!board && !isLoading && loadAttempts >= maxLoadAttempts) {
        return (
            <div style={{ textAlign: 'center', padding: '50px 20px' }}>
                <h2>Доска не найдена</h2>
                <p>Возможно, она была удалена или у вас нет прав доступа.</p>
                <button 
                    onClick={() => navigate('/system/project')}
                    style={{
                        padding: '10px 20px',
                        background: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        marginTop: '20px'
                    }}
                >
                    Вернуться к проектам
                </button>
            </div>
        );
    }

    // If the board doesn't exist yet and we're not loading, wait for data to load
    if (!board && !isLoading) {
        return <div><LoadingSpinner /> Загрузка доски...</div>;
    }

    return (
        <div id='task-dashboards-dashboard-container'>
            <ProjectMenu />
            <div id='task-dashboard-container'>
                <TopBar />
                {isLoading && <LoadingSpinner />}
                
                <div id='task-dashboard-add-bar-container'>
                    <div id='task-dashboard-icon-row-container'>
                        <div id='task-dashboard-icon-container'>
                            <EmojiProvider data={emojiData}>
                                <Emoji name="teacher-light-skin-tone" width={22}/>
                            </EmojiProvider>
                        </div>

                        <div id='task-dashboard-label-container'>
                            <div id='task-dashboard-label-container-header'>
                                {board?.title || 'Загрузка...'}
                            </div>
                            <div id='task-dashboard-progress-container'>
                                <div id='task-dashboard-progress-bar'></div>
                                <div id='task-dashboard-progress-text'>
                                    13% завершено
                                </div>
                            </div>
                        </div>
                    </div>

                    <div id="task-dashboard-button-and-people-container">
                        <div 
                            id="task-dashboard-people" 
                            onClick={() => setIsParticipantsModalOpen(true)}
                            style={{ cursor: 'pointer' }}
                        >
                            {boardParticipants.slice(0, 4).map((username, index) => {
                                const user = usersByUsername[username];
                                return (
                                    <div id="task-dashboard-people-item" key={index} title={username}>
                                        <img 
                                            src={user?.avatarURL || Girl} 
                                            alt={username} 
                                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                                        />
                                    </div>
                                );
                            })}
                            {boardParticipants.length > 4 && (
                                <div id="task-dashboard-people-item-more">
                                    +{boardParticipants.length - 4}
                                </div>
                            )}
                            {boardParticipants.length === 0 && (
                                <div id="task-dashboard-people-item-more">
                                    0
                                </div>
                            )}
                        </div>

                        <div id='task-dashboard-add-bar-add-button' onClick={() => setIsAddSectionModalOpen(true)}>
                            + Добавить раздел
                        </div>
                    </div>
                </div>

                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="columns-droppable" direction="horizontal" type="column">
                        {(provided) => (
                            <div id='task-dashboard-cards-containeres' ref={provided.innerRef} {...provided.droppableProps}>
                                {columns.map((column, index) => (
                                    <Draggable key={column.id} draggableId={String(column.id)} index={index} type="column">
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                style={{
                                                    ...provided.draggableProps.style,
                                                    opacity: snapshot.isDragging ? 0.7 : 1
                                                }}
                                            >
                                                <TaskColumn 
                                                    column={column} 
                                                    onAddTask={() => handleOpenTaskModal(column.id)} 
                                                    onTaskClick={task => { setSelectedTask(task); setIsTaskInfoOpen(true); }}
                                                />
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            </div>
            
            {/* Task Creation Modal */}
            <CreateTaskModal 
                isOpen={isTaskModalOpen} 
                onClose={handleCloseTaskModal} 
                onSubmit={handleCreateTask} 
                boardId={Number(boardId)}
            />
            
            {/* Add Section Modal */}
            {isAddSectionModalOpen && (
                <div className="create-project-modal-overlay">
                    <div className="create-project-modal">
                        <div className="create-project-modal-title">Добавить раздел</div>
                        <div className="create-project-modal-label">Название раздела</div>
                        <input 
                            className="create-project-modal-input" 
                            value={newSectionName} 
                            onChange={(e) => setNewSectionName(e.target.value)} 
                            placeholder="Введите название раздела"
                        />
                        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                            <button 
                                className="create-project-modal-add-participant" 
                                onClick={handleAddSection}
                            >
                                Добавить
                            </button>
                            <button 
                                className="create-project-modal-add-participant" 
                                style={{ background: '#f5f5f5', color: '#333' }} 
                                onClick={() => setIsAddSectionModalOpen(false)}
                            >
                                Отмена
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Task Info Modal */}
            <TaskInfoModal 
                isOpen={isTaskInfoOpen} 
                onClose={() => setIsTaskInfoOpen(false)} 
                task={selectedTask} 
            />
            
            {/* Participants Modal */}
            {isParticipantsModalOpen && (
                <div className="create-project-modal-overlay">
                    <div className="create-project-modal" style={{ maxWidth: '400px' }}>
                        <div className="create-task-modal-header">
                            <div className="create-project-modal-title">Участники доски</div>
                            <img 
                                src={CloseCross} 
                                alt="Close" 
                                className="create-task-modal-close"
                                onClick={() => setIsParticipantsModalOpen(false)}
                            />
                        </div>
                        
                        <div style={{ marginTop: '20px' }}>
                            {boardParticipants.length > 0 ? (
                                boardParticipants.map((username, index) => {
                                    const user = usersByUsername[username];
                                    return (
                                        <div key={index} style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            padding: '10px 0',
                                            borderBottom: index < boardParticipants.length - 1 ? '1px solid #eee' : 'none'
                                        }}>
                                            <div style={{ 
                                                width: '40px', 
                                                height: '40px', 
                                                borderRadius: '50%', 
                                                overflow: 'hidden',
                                                marginRight: '15px',
                                                background: '#FED9D9'
                                            }}>
                                                <img 
                                                    src={user?.avatarURL || Girl} 
                                                    alt={username} 
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                            </div>
                                            <div>
                                                <div style={{ fontFamily: 'Ruberoid Bold', fontSize: '14px' }}>
                                                    {user?.displayName || username}
                                                </div>
                                                <div style={{ fontFamily: 'Ruberoid Regular', fontSize: '12px', color: '#969595' }}>
                                                    {username}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div style={{ textAlign: 'center', color: '#969595', padding: '20px 0' }}>
                                    Нет участников
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Task column component
function TaskColumn({ column, onAddTask, onTaskClick }) {
    const dispatch = useDispatch();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editColumnName, setEditColumnName] = useState('');
    const modalRef = useRef(null);
    const optionsRef = useRef(null);
    
    // Отладочный вывод
    console.log('Отрисовка колонки:', column);
    
    // Получаем значение columnId, но не используем его в условии для вызова хуков
    const columnId = column?.id;
    
    // Всегда вызываем useSelector, даже если columnId отсутствует
    const tasks = useSelector(state => selectTasksForColumn(state, columnId || 'empty-column'));
    const taskCount = useSelector(state => selectTaskCountForColumn(state, columnId || 'empty-column'));
    const isLoadingTasks = useSelector(state => state.ui.loading.tasks);
    
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
    
    // Проверяем наличие columnId после вызова всех хуков
    if (!columnId) {
        console.error('Ошибка: Колонка не имеет ID!', column);
        return null;
    }
    
    console.log('Запрос задач для колонки с ID:', columnId);
    console.log('Полученные задачи для колонки:', tasks);
    
    // Используем title или name в зависимости от того, что доступно
    const columnTitle = column.title || column.name || 'Без названия';

    const handleEditColumn = () => {
        setEditColumnName(columnTitle);
        setIsEditModalOpen(true);
        setIsModalOpen(false);
    };

    const handleDeleteColumn = () => {
        if (window.confirm("Вы уверены, что хотите удалить раздел? Все задачи в этом разделе также будут удалены.")) {
            dispatch(deleteColumnRequest(columnId));
        }
        setIsModalOpen(false);
    };

    const handleUpdateColumn = () => {
        if (editColumnName.trim()) {
            const updatedColumn = {
                ...column,
                title: editColumnName,
                name: editColumnName
            };
            dispatch(updateColumnRequest(updatedColumn));
            setIsEditModalOpen(false);
        }
    };
    
    return (
        <div id='task-dashboard-card-column'>
            <div id='task-dashboard-card-column-topbar'>
                <div id='task-dashboard-card-column-topbar-label-container'>
                    <div id='task-dashboard-card-column-topbar-label-name-container'>
                        <div id='task-dashboard-card-column-topbar-label-name-circle'></div>
                        <div id='task-dashboard-card-column-topbar-label-name-text'>
                            {columnTitle}
                        </div>
                    </div>
                    <div id='task-dashboard-card-column-topbar-label-name-task-counter'>
                        {taskCount}
                    </div>
                </div>
                <div ref={optionsRef} onClick={handleOptionsClick} style={{ cursor: 'pointer' }}>
                    <img src={OptionsPassive} alt="Options" />
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
                            <div 
                                className="modal-edit"
                                onClick={handleEditColumn}
                            >
                                Редактировать
                            </div>
                            <div 
                                className="modal-delete"
                                onClick={handleDeleteColumn}
                            >
                                Удалить
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div id='task-dashboard-add-task-button' onClick={onAddTask}>
                <div id='task-dashboard-add-task-button-text'>+ Добавить задачу</div>
            </div>

            <div id='task-dashboard-cards-container'>
                <Droppable droppableId={String(columnId)} type="task">
                    {(provided) => (
                        <div ref={provided.innerRef} {...provided.droppableProps}>
                            {isLoadingTasks ? (
                                <div style={{ padding: '16px', textAlign: 'center' }}>
                                    <LoadingSpinner />
                                </div>
                            ) : tasks.length === 0 ? (
                                <div style={{ padding: '16px', textAlign: 'center', color: '#969595' }}>
                                    Нет задач
                                </div>
                            ) : (
                                tasks.map((task, index) => (
                                    <Draggable key={task.id} draggableId={String(task.id)} index={index} type="task">
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                style={{
                                                    ...provided.draggableProps.style,
                                                    opacity: snapshot.isDragging ? 0.7 : 1
                                                }}
                                            >
                                                <TaskCard 
                                                    task={task}
                                                    onClick={() => onTaskClick(task)}
                                                />
                                            </div>
                                        )}
                                    </Draggable>
                                ))
                            )}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </div>
            
            {/* Edit Column Modal */}
            {isEditModalOpen && (
                <div className="create-project-modal-overlay">
                    <div className="create-project-modal">
                        <div className="create-project-modal-title">Редактировать раздел</div>
                        <div className="create-project-modal-label">Название раздела</div>
                        <input 
                            className="create-project-modal-input" 
                            value={editColumnName} 
                            onChange={(e) => setEditColumnName(e.target.value)} 
                            placeholder="Введите название раздела"
                        />
                        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                            <button 
                                className="create-project-modal-add-participant" 
                                onClick={handleUpdateColumn}
                            >
                                Сохранить
                            </button>
                            <button 
                                className="create-project-modal-add-participant" 
                                style={{ background: '#f5f5f5', color: '#333' }} 
                                onClick={() => setIsEditModalOpen(false)}
                            >
                                Отмена
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default TaskDashboard;
