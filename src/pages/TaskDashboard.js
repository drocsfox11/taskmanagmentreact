import TopBar from "../components/TopBar";
import '../styles/pages/TaskDashboard.css';
import ProjectMenu from "../components/ProjectMenu";
import { Emoji, EmojiProvider } from "react-apple-emojis";
import emojiData from "react-apple-emojis/src/data.json";
import Girl from "../assets/icons/profile_picture.svg";
import TaskCard from "../components/TaskCard";
import OptionsPassive from "../assets/icons/options_passive.svg";
import CloseCross from "../assets/icons/cross for task.svg";
import LoadingSpinner from "../components/LoadingSpinner";
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import AddSectionModal from "../components/AddSectionModal";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import CreateTaskModal from "../components/CreateTaskModal";
import TaskInfoModal from "../components/TaskInfoModal";

// Import RTK Query hooks
import { 
    useGetBoardWithDataQuery, 
    useCreateTaskMutation,
    useCreateColumnMutation,
    useUpdateColumnMutation,
    useDeleteColumnMutation,
    useReorderColumnsMutation,
    useMoveTaskMutation
} from '../services/api';

function TaskDashboard() {
    const navigate = useNavigate();
    const { projectId, boardId } = useParams();
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [currentColumnId, setCurrentColumnId] = useState(null);
    const [isAddSectionModalOpen, setIsAddSectionModalOpen] = useState(false);
    const [isTaskInfoOpen, setIsTaskInfoOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [isParticipantsModalOpen, setIsParticipantsModalOpen] = useState(false);
    
    const boardIdNum = Number(boardId);
    
    const { 
        data: boardWithData, 
        isLoading: isLoadingBoardData,
        error: boardError 
    } = useGetBoardWithDataQuery(boardIdNum, {
        skip: isNaN(boardIdNum)
    });

    const [createTask] = useCreateTaskMutation();
    const [createColumn] = useCreateColumnMutation();
    const [updateColumn] = useUpdateColumnMutation();
    const [deleteColumn] = useDeleteColumnMutation();
    const [reorderColumns] = useReorderColumnsMutation();
    const [moveTask] = useMoveTaskMutation();
    
    const columns = [...(boardWithData?.columns || [])].sort((a, b) => a.position - b.position);
    console.log('Колонки в компоненте:', columns);
    console.log('ID доски:', boardId);
    
    const board = boardWithData;
    const isLoading = isLoadingBoardData;
    
    const boardParticipants = board?.participants || [];
    
    const [usersByUsername, setUsersByUsername] = useState({});
    
    useEffect(() => {
        console.log('Board data received:', {
            boardWithData,
            isLoadingBoardData,
            boardError,
            boardIdNum
        });
        
        if (boardWithData) {
            console.log('Columns:', boardWithData.columns);
            console.log('Participants:', boardWithData.participants);
        }
        
        if (boardError) {
            console.error('Error loading board data:', boardError);
        }
    }, [boardWithData, isLoadingBoardData, boardError, boardIdNum]);

    const [loadAttempts, setLoadAttempts] = useState(0);
    const maxLoadAttempts = 3;

    
    useEffect(() => {
        if (boardIdNum && !isLoadingBoardData) {
            setLoadAttempts(prev => prev + 1);
        }
    }, [boardIdNum, isLoadingBoardData]);

    const handleOpenTaskModal = (columnId) => {
        setCurrentColumnId(columnId);
        setIsTaskModalOpen(true);
    };

    const handleCloseTaskModal = () => {
        setIsTaskModalOpen(false);
        setCurrentColumnId(null);
    };

    const handleCreateTask = (taskData) => {
        if (currentColumnId && boardId) {
            const newTask = {
                ...taskData,
                columnId: currentColumnId,
                boardId: Number(boardId),
                projectId: Number(projectId)
            };
            // Use RTK Query mutation
            createTask(newTask)
                .unwrap()
                .catch(error => {
                    console.error('Failed to create task:', error);
                });
        }
    };

    // Handle section (column) creation - using RTK Query mutation
    const handleAddSection = (sectionName) => {
        if (sectionName.trim() && boardId) {
            const newColumn = {
                title: sectionName,
                boardId: Number(boardId),
                position: columns.length
            };
            // Use RTK Query mutation
            createColumn(newColumn)
                .unwrap()
                .catch(error => {
                    console.error('Failed to create column:', error);
                });
            setIsAddSectionModalOpen(false);
        }
    };

    const onDragEnd = (result) => {
        const { source, destination, draggableId, type } = result;
        if (!destination) return;
        
        if (type === 'column') {
            const sourceIndex = source.index;
            const destIndex = destination.index;
            if (sourceIndex === destIndex) return;
            const newColumns = Array.from(columns);
            const [removed] = newColumns.splice(sourceIndex, 1);
            newColumns.splice(destIndex, 0, removed);
            
            // Обновляем позиции всех колонок
            const updatedColumns = newColumns.map((col, index) => ({
                id: col.id,
                position: index
            }));
            
            console.log('Переупорядочивание колонок:', { columns: updatedColumns, boardId: boardIdNum });
            
            reorderColumns({ 
                boardId: boardIdNum, 
                columns: updatedColumns
            })
                .unwrap()
                .catch(error => {
                    console.error('Failed to reorder columns:', error);
                });
            return;
        }
        
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
            
            // Use RTK Query mutation
            moveTask({ 
                taskId, 
                sourceColumnId: sourceColId, 
                destColumnId: destColId, 
                newPosition: destIndex,
                boardId: boardIdNum
            }).unwrap()
                .catch(error => {
                    console.error('Failed to move task:', error);
                });
        }
    };

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

    // If there's an API error, show it
    if (boardError) {
        return (
            <div style={{ textAlign: 'center', padding: '50px 20px' }}>
                <h2>Ошибка загрузки данных</h2>
                <p>Не удалось загрузить информацию о доске.</p>
                <div style={{ margin: '20px', padding: '10px', background: '#f8d7da', color: '#721c24', borderRadius: '4px' }}>
                    {JSON.stringify(boardError)}
                </div>
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
        <div className='task-dashboards-dashboard-container'>
            <ProjectMenu />
            <div className='task-dashboard-container'>
                <TopBar />
                {isLoading && <LoadingSpinner />}
                
                <div className='task-dashboard-add-bar-container'>
                    <div className='task-dashboard-icon-row-container'>
                        <div className='task-dashboard-icon-container'>
                            <EmojiProvider data={emojiData}>
                                <Emoji name="teacher-light-skin-tone" width={22}/>
                            </EmojiProvider>
                        </div>

                        <div className='task-dashboard-label-container'>
                            <div className='task-dashboard-label-container-header'>
                                {board?.title || 'Загрузка...'}
                            </div>
                            <div className='task-dashboard-progress-container'>
                                <div className='task-dashboard-progress-bar'></div>
                                <div className='task-dashboard-progress-text'>
                                    13% завершено
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="task-dashboard-button-and-people-container">
                        <div 
                            className="task-dashboard-people" 
                            onClick={() => setIsParticipantsModalOpen(true)}
                            style={{ cursor: 'pointer' }}
                        >
                            {boardParticipants.slice(0, 4).map((username, index) => {
                                const user = usersByUsername[username];
                                return (
                                    <div className="task-dashboard-people-item" key={index} title={username}>
                                        <img 
                                            src={user?.avatarURL || Girl} 
                                            alt={username} 
                                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                                        />
                                    </div>
                                );
                            })}
                            {boardParticipants.length > 4 && (
                                <div className="task-dashboard-people-item-more">
                                    +{boardParticipants.length - 4}
                                </div>
                            )}
                            {boardParticipants.length === 0 && (
                                <div className="task-dashboard-people-item-more">
                                    0
                                </div>
                            )}
                        </div>

                        <div className='task-dashboard-add-bar-add-button' onClick={() => setIsAddSectionModalOpen(true)}>
                            + Добавить раздел
                        </div>
                    </div>
                </div>

                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="columns-droppable" direction="horizontal" type="column">
                        {(provided) => (
                            <div className='task-dashboard-cards-containeres' ref={provided.innerRef} {...provided.droppableProps}>
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
                                                    updateColumn={updateColumn}
                                                    deleteColumn={deleteColumn}
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
            <AddSectionModal 
                isOpen={isAddSectionModalOpen}
                onClose={() => setIsAddSectionModalOpen(false)}
                onAddSection={handleAddSection}
            />

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

function TaskColumn({ column, onAddTask, onTaskClick, updateColumn, deleteColumn }) {
    console.log('Рендер колонки');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editColumnName, setEditColumnName] = useState('');
    const modalRef = useRef(null);
    const optionsRef = useRef(null);
    
    const columnId = column?.id;
    const tasks = column?.tasks || [];
    const taskCount = tasks.length;
    
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
    
    if (!columnId) {
        console.error('Ошибка: Колонка не имеет ID!', column);
        return null;
    }
    
    const columnTitle = column.title || column.name || 'Без названия';

    const handleEditColumn = () => {
        setEditColumnName(columnTitle);
        setIsEditModalOpen(true);
        setIsModalOpen(false);
    };

    const handleDeleteColumn = () => {
        if (window.confirm("Вы уверены, что хотите удалить раздел? Все задачи в этом разделе также будут удалены.")) {
            deleteColumn({ 
                id: columnId,
                boardId: column.boardId
            })
                .unwrap()
                .catch(error => {
                    console.error('Failed to delete column:', error);
                });
        }
        setIsModalOpen(false);
    };

    const handleUpdateColumn = () => {
        if (editColumnName.trim()) {
            updateColumn({ 
                id: columnId,
                boardId: column.boardId,
                title: editColumnName,
                name: editColumnName,
                position: column.position
            })
                .unwrap()
                .catch(error => {
                    console.error('Failed to update column:', error);
                });
            
            setIsEditModalOpen(false);
        }
    };
    
    return (
        <div className='task-dashboard-card-column'>
            <div className='task-dashboard-card-column-topbar'>
                <div className='task-dashboard-card-column-topbar-label-container'>
                    <div className='task-dashboard-card-column-topbar-label-name-container'>
                        <div className='task-dashboard-card-column-topbar-label-name-circle'></div>
                        <div className='task-dashboard-card-column-topbar-label-name-text'>
                            {columnTitle}
                        </div>
                    </div>
                    <div className='task-dashboard-card-column-topbar-label-name-task-counter'>
                        {taskCount}
                    </div>
                </div>
                <div ref={optionsRef} onClick={handleOptionsClick} style={{ cursor: 'pointer' }}>
                    <img src={OptionsPassive} alt="Options" />
                </div>
                
                {isModalOpen && (
                    <div ref={modalRef} className="modal-container" >
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

            <div className='task-dashboard-add-task-button' onClick={onAddTask}>
                <div className='task-dashboard-add-task-button-text'>+ Добавить задачу</div>
            </div>

            <div className='task-dashboard-cards-container'>
                <Droppable droppableId={String(columnId)} type="task">
                    {(provided) => (
                        <div ref={provided.innerRef} {...provided.droppableProps}>
                            {tasks.length === 0 ? (
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