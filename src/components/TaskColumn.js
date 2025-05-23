import React, { useState, useRef, useEffect } from 'react';
import TaskCard from './TaskCard';
import OptionsPassive from "../assets/icons/options_passive.svg";
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { BoardRightGuard } from './permissions';
import { BOARD_RIGHTS } from '../constants/rights';
import { useBoardRights } from '../hooks/useRights';

function TaskColumn({ column, onAddTask, onTaskClick, updateColumn, deleteColumn }) {
    console.log('Рендер колонки');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editColumnName, setEditColumnName] = useState('');
    const [isCompletionColumn, setIsCompletionColumn] = useState(false);
    const modalRef = useRef(null);
    const optionsRef = useRef(null);
    
    const columnId = column?.id || column?.columnId;
    const columnTitle = column?.title || column?.name;
    const tasks = column?.tasks || [];
    const taskCount = tasks.length;
    
    const { hasRight, hasAnyRight } = useBoardRights(column.boardId);
    
    const canEdit = hasRight(BOARD_RIGHTS.EDIT_SECTIONS);
    const canDelete = hasRight(BOARD_RIGHTS.DELETE_SECTIONS);
    const canMoveTasks = hasRight(BOARD_RIGHTS.MOVE_TASKS);
    
    const showOptionsButton = hasAnyRight([BOARD_RIGHTS.EDIT_SECTIONS, BOARD_RIGHTS.DELETE_SECTIONS]);
    
    useEffect(() => {
        setEditColumnName(columnTitle);
        setIsCompletionColumn(column.completionColumn || false);
    }, [columnTitle, column.completionColumn]);
    
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
            const updatePayload = {
                columnId,
                boardId: column.boardId,
                title: editColumnName.trim(),
                name: editColumnName.trim(),
                completionColumn: isCompletionColumn
            };
            
            console.log('Updating column:', {
                oldTitle: columnTitle, 
                newTitle: editColumnName,
                columnId,
                completionColumn: isCompletionColumn
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
                
                {/* Отображаем троеточие только если есть хотя бы одно из прав */}
                {showOptionsButton && (
                    <div ref={optionsRef} onClick={handleOptionsClick} style={{ cursor: 'pointer' }}>
                        <img src={OptionsPassive} alt="Options" />
                    </div>
                )}
                
                {isModalOpen && (
                    <div ref={modalRef} className="modal-container">
                        <div className="modal-content-custom">
                            {/* Отображаем пункт "Редактировать" только если есть право EDIT_SECTIONS */}
                            {canEdit && (
                                <div 
                                    className="modal-edit"
                                    onClick={handleEditColumn}
                                >
                                    Редактировать
                                </div>
                            )}
                            
                            {/* Отображаем пункт "Удалить" только если есть право DELETE_SECTIONS */}
                            {canDelete && (
                                <div 
                                    className="modal-delete"
                                    onClick={handleDeleteColumn}
                                >
                                    Удалить
                                </div>
                            )}
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
                                    <Draggable 
                                        key={task.id} 
                                        draggableId={String(task.id)} 
                                        index={index} 
                                        type="task"
                                        isDragDisabled={!canMoveTasks}
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
                                                <TaskCard 
                                                    task={{...task, boardId: column.boardId}}
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