import React, { useState, useRef, useEffect } from 'react';
import TaskCard from './TaskCard';
import OptionsPassive from "../assets/icons/options_passive.svg";
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { BoardRightGuard } from './permissions';
import { BOARD_RIGHTS } from '../constants/rights';

function TaskColumn({ column, onAddTask, onTaskClick, updateColumn, deleteColumn }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editColumnName, setEditColumnName] = useState('');
    const modalRef = useRef(null);
    const optionsRef = useRef(null);
    
    const columnId = column.id;
    const columnTitle = column.title || column.name;
    const tasks = column.tasks || [];
    const taskCount = tasks.length;
    
    useEffect(() => {
        setEditColumnName(columnTitle);
    }, [columnTitle]);
    
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
    
    const handleEditColumn = () => {
        setIsModalOpen(false);
        setIsEditModalOpen(true);
    };
    
    const handleDeleteColumn = () => {
        if (window.confirm("Вы уверены, что хотите удалить раздел? Все задачи в этом разделе также будут удалены.")) {
            console.log('Deleting column with params:', { 
                columnId: columnId, 
                boardId: column.boardId 
            });
            
            deleteColumn({ 
                columnId: columnId,
                boardId: column.boardId
            })
                .unwrap()
                .then(result => {
                    console.log('Column deleted successfully:', result);
                })
                .catch(error => {
                    console.error('Failed to delete column:', error);
                    console.error('Error details:', JSON.stringify(error));
                });
        }
        setIsModalOpen(false);
    };

    const handleUpdateColumn = () => {
        if (editColumnName.trim()) {
            // Construct update payload with only necessary fields
            const updatePayload = {
                columnId,
                boardId: column.boardId,
                title: editColumnName.trim(),
                name: editColumnName.trim()
            };
            
            // Store current state for comparison
            console.log('Updating column:', { 
                oldTitle: columnTitle, 
                newTitle: editColumnName,
                columnId
            });
            
            updateColumn(updatePayload)
                .unwrap()
                .then(() => {
                    console.log('Column updated successfully');
                })
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
                <BoardRightGuard boardId={column.boardId} requires={[BOARD_RIGHTS.EDIT_SECTIONS, BOARD_RIGHTS.DELETE_SECTIONS]}>
                    <div ref={optionsRef} onClick={handleOptionsClick} style={{ cursor: 'pointer' }}>
                        <img src={OptionsPassive} alt="Options" />
                    </div>
                </BoardRightGuard>
                
                {isModalOpen && (
                    <div ref={modalRef} className="modal-container">
                        <div className="modal-content-custom">
                            <BoardRightGuard boardId={column.boardId} requires={BOARD_RIGHTS.EDIT_SECTIONS}>
                                <div 
                                    className="modal-edit"
                                    onClick={handleEditColumn}
                                >
                                    Редактировать
                                </div>
                            </BoardRightGuard>
                            <BoardRightGuard boardId={column.boardId} requires={BOARD_RIGHTS.DELETE_SECTIONS}>
                                <div 
                                    className="modal-delete"
                                    onClick={handleDeleteColumn}
                                >
                                    Удалить
                                </div>
                            </BoardRightGuard>
                        </div>
                    </div>
                )}
            </div>

            <BoardRightGuard boardId={column.boardId} requires={BOARD_RIGHTS.CREATE_TASKS}>
                <div className='task-dashboard-add-task-button' onClick={onAddTask}>
                    <div className='task-dashboard-add-task-button-text'>+ Добавить задачу</div>
                </div>
            </BoardRightGuard>

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

export default TaskColumn; 