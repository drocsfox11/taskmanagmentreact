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
import { useState, useEffect, useRef, useMemo } from "react";
import AddSectionModal from "../components/AddSectionModal";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import CreateTaskModal from "../components/CreateTaskModal";
import TaskInfoModal from "../components/TaskInfoModal";
import { useBoardRights } from "../components/permissions";
import { BOARD_RIGHTS } from "../constants/rights";
import { BoardRightGuard } from "../components/permissions";
import TaskColumn from "../components/TaskColumn";

// Import RTK Query hooks
import { 
    useGetBoardWithDataQuery, 
    useCreateTaskMutation,
    useCreateColumnMutation,
    useUpdateColumnMutation,
    useDeleteColumnMutation,
    useReorderColumnsMutation,
    useMoveTaskMutation,
    useUploadTaskAttachmentsMutation
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
    const [uploadTaskAttachments] = useUploadTaskAttachmentsMutation();
    
    // Filter out duplicate columns and sort them by position
    const columns = useMemo(() => {
        if (!boardWithData?.columns) return [];
        
        // Create a map to track columns by ID to remove duplicates
        const columnMap = new Map();
        
        // Process all columns and keep only the latest version of each column
        boardWithData.columns.forEach(column => {
            // Use a consistent ID field
            const id = column.id || column.columnId;
            if (id) {
                // Sort tasks by position within the column
                const sortedTasks = [...(column.tasks || [])].sort((a, b) => {
                    // Handle cases where position might be undefined
                    const posA = typeof a.position === 'number' ? a.position : Number.MAX_SAFE_INTEGER;
                    const posB = typeof b.position === 'number' ? b.position : Number.MAX_SAFE_INTEGER;
                    return posA - posB;
                });
                
                // Normalize column data to ensure consistent structure
                columnMap.set(id, {
                    ...column,
                    id: id,  // Use a consistent id field
                    tasks: sortedTasks
                });
            }
        });
        
        // Convert map back to array and sort by position
        return Array.from(columnMap.values())
            .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    }, [boardWithData?.columns]);
    
    console.log('Колонки в компоненте:', columns);
    console.log('ID доски:', boardId);
    
    const board = boardWithData;
    const isLoading = isLoadingBoardData;
    
    const boardParticipants = board?.participants || [];
    
    const [usersByUsername, setUsersByUsername] = useState({});
    
    // Получаем права пользователя
    const { hasRight } = useBoardRights(boardIdNum);
    
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
            // Extract files from taskData to handle separately
            const { files, ...taskDataWithoutFiles } = taskData;
            
            console.log('Creating task with data:', taskDataWithoutFiles);
            console.log('Files to upload:', files?.length || 0, 'files');
            
            const newTask = {
                ...taskDataWithoutFiles,
                columnId: currentColumnId,
                boardId: Number(boardId),
                projectId: Number(projectId)
            };
            
            // Create task first
            createTask(newTask)
                .unwrap()
                .then(createdTask => {
                    console.log('Task created successfully:', createdTask);
                    
                    // If there are files, upload them
                    if (files && files.length > 0) {
                        console.log('Uploading files for taskId:', createdTask.id);
                        console.log('Files to upload:', files.map(f => ({ name: f.name, size: f.size, type: f.type })));
                        
                        uploadTaskAttachments({
                            taskId: createdTask.id,
                            files: files
                        })
                        .unwrap()
                        .then(result => {
                            console.log('Files uploaded successfully:', result);
                        })
                        .catch(error => {
                            console.error('Failed to upload files:', error);
                        });
                    }
                })
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
            // Проверяем права на перемещение колонок
            if (!hasRight(BOARD_RIGHTS.MOVE_COLUMNS)) {
                console.log('У пользователя нет прав на перемещение колонок');
                return;
            }
            
            const sourceIndex = source.index;
            const destIndex = destination.index;
            if (sourceIndex === destIndex) return;
            const newColumns = Array.from(columns);
            const [removed] = newColumns.splice(sourceIndex, 1);
            newColumns.splice(destIndex, 0, removed);
            
            // Обновляем позиции всех колонок
            const updatedColumns = newColumns.map((col, index) => ({
                id: col.id || col.columnId,
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
            // Проверяем права на перемещение задач
            if (!hasRight(BOARD_RIGHTS.MOVE_TASKS)) {
                console.log('У пользователя нет прав на перемещение задач');
                return;
            }
            
            const sourceColumnId = Number(source.droppableId);
            const targetColumnId = Number(destination.droppableId);
            const sourceIndex = source.index;
            const newPosition = destination.index;
            const taskId = Number(draggableId);
            
            console.log('Перемещение задачи:', { 
                taskId, 
                sourceColumnId, 
                targetColumnId, 
                sourceIndex, 
                newPosition,
                boardId: boardIdNum
            });
            
            // Используем правильные имена параметров для соответствия API
            moveTask({ 
                taskId, 
                sourceColumnId, 
                targetColumnId, 
                newPosition,
                boardId: boardIdNum
            }).unwrap()
                .then(() => {
                    console.log('Задача успешно перемещена');
                })
                .catch(error => {
                    console.error('Ошибка при перемещении задачи:', error);
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

                        <BoardRightGuard boardId={Number(boardId)} requires={BOARD_RIGHTS.CREATE_SECTIONS}>
                            <div className='task-dashboard-add-bar-add-button' onClick={() => setIsAddSectionModalOpen(true)}>
                                + Добавить раздел
                            </div>
                        </BoardRightGuard>
                    </div>
                </div>

                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="columns-droppable" direction="horizontal" type="column">
                        {(provided) => (
                            <div className='task-dashboard-cards-containeres' ref={provided.innerRef} {...provided.droppableProps}>
                                {columns.map((column, index) => (
                                    <Draggable 
                                        key={column.id} 
                                        draggableId={String(column.id)} 
                                        index={index} 
                                        type="column"
                                        isDragDisabled={!hasRight(BOARD_RIGHTS.MOVE_COLUMNS)}
                                    >
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

export default TaskDashboard;