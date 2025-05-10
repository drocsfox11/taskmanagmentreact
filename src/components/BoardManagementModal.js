import { useState, useEffect, useRef } from 'react';
import { 
    useUpdateBoardMutation, 
    useAddUserToBoardMutation,
    useRemoveUserFromBoardMutation
} from '../services/api/boardsApi';
import BoardPermissionsTab from './BoardPermissionsTab';
import '../styles/components/ProjectManagementModal.css'; // Reuse the same styles
import CloseCross from '../assets/icons/close_cross.svg';
import Girl from '../assets/icons/girl.svg';
import { useBoardRights } from './permissions';
import { BOARD_RIGHTS } from '../constants/rights';
import { BoardRightGuard } from './permissions';

function BoardManagementModal({ board, onClose, isOpen = true }) {
    const [activeTab, setActiveTab] = useState('info');
    const [updateBoard] = useUpdateBoardMutation();
    const [addUserToBoard] = useAddUserToBoardMutation();
    const [removeUserFromBoard] = useRemoveUserFromBoardMutation();
    const [form, setForm] = useState({
        title: board?.title || '',
        description: board?.description || '',
        tags: board?.tags || []
    });
    const [tagName, setTagName] = useState('');
    const [tagColor, setTagColor] = useState('#FFD700');
    const [participantInput, setParticipantInput] = useState('');
    const modalRef = useRef(null);

    // Получаем права пользователя
    const { hasRight } = useBoardRights(board.id);

    useEffect(() => {
        if (board) {
            setForm({
                title: board.title || '',
                description: board.description || '',
                tags: board.tags || []
            });
        }
    }, [board]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (modalRef.current && !modalRef.current.contains(e.target)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose, isOpen]);

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setForm({
            ...form,
            [name]: value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            await updateBoard({
                id: board.id,
                ...form
            }).unwrap();
            onClose();
        } catch (error) {
            console.error('Error updating board:', error);
        }
    };

    const handleAddUser = async (userId) => {
        try {
            await addUserToBoard({
                boardId: board.id,
                userId: userId
            }).unwrap();
            
            setParticipantInput('');
        } catch (error) {
            console.error('Failed to add user:', error);
        }
    };

    const handleRemoveUser = async (userId) => {
        try {
            await removeUserFromBoard({
                boardId: board.id,
                userId: userId
            }).unwrap();
        } catch (error) {
            console.error('Failed to remove user:', error);
        }
    };

    const handleAddTag = () => {
        if (!tagName.trim()) return;
        
        setForm({
            ...form,
            tags: [...(form.tags || []), {
                name: tagName,
                color: tagColor
            }]
        });
        
        setTagName('');
        setTagColor('#FFD700');
    };

    const handleRemoveTag = (idx) => {
        setForm({
            ...form,
            tags: form.tags.filter((_, i) => i !== idx)
        });
    };
    
    const handleModalClick = (e) => {
        e.stopPropagation();
    };

    if (!isOpen) return null;

    return (
        <div className="project-management-modal-overlay" onClick={handleModalClick}>
            <div className="project-management-modal" ref={modalRef} onClick={handleModalClick}>
                <div className="project-management-modal-header">
                    <h2>Управление доской</h2>
                    <button className="close-button" onClick={onClose}>
                        <img src={CloseCross} alt="Close" />
                    </button>
                </div>
                <div className="project-management-modal-tabs">
                    <button 
                        className={`tab-button ${activeTab === 'info' ? 'active' : ''}`}
                        onClick={() => setActiveTab('info')}
                    >
                        Информация
                    </button>
                    <BoardRightGuard boardId={board.id} requires={BOARD_RIGHTS.MANAGE_MEMBERS}>
                        <button 
                            className={`tab-button ${activeTab === 'participants' ? 'active' : ''}`}
                            onClick={() => setActiveTab('participants')}
                        >
                            Участники
                        </button>
                    </BoardRightGuard>
                    <BoardRightGuard boardId={board.id} requires={BOARD_RIGHTS.MANAGE_RIGHTS}>
                        <button 
                            className={`tab-button ${activeTab === 'permissions' ? 'active' : ''}`}
                            onClick={() => setActiveTab('permissions')}
                        >
                            Права доступа
                        </button>
                    </BoardRightGuard>
                </div>
                <div className="project-management-modal-content">
                    {activeTab === 'info' ? (
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label htmlFor="title">Название доски</label>
                                <input
                                    type="text"
                                    id="title"
                                    name="title"
                                    value={form.title}
                                    onChange={handleFormChange}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="description">Описание</label>
                                <textarea
                                    id="description"
                                    name="description"
                                    value={form.description}
                                    onChange={handleFormChange}
                                />
                            </div>
                            <div className="form-group">
                                <label>Теги</label>
                                <div className="project-management-participants-row">
                                    <input
                                        type="text"
                                        className="project-management-modal-input-participant"
                                        placeholder="Название тега"
                                        value={tagName}
                                        onChange={(e) => setTagName(e.target.value)}
                                    />
                                    <input
                                        type="color"
                                        value={tagColor}
                                        onChange={(e) => setTagColor(e.target.value)}
                                        style={{ width: '50px', height: '40px' }}
                                    />
                                    <button
                                        type="button"
                                        className="project-management-add-button"
                                        onClick={handleAddTag}
                                    >
                                        Добавить
                                    </button>
                                </div>
                                <div className="project-management-tags-container">
                                    {form.tags && form.tags.length > 0 ? (
                                        form.tags.map((tag, idx) => (
                                            <div 
                                                key={idx} 
                                                className="project-management-tag-item"
                                                style={{ backgroundColor: tag.color || '#FFD700' }}
                                            >
                                                <span>{tag.name}</span>
                                                <button
                                                    type="button"
                                                    className="project-management-remove-tag"
                                                    onClick={() => handleRemoveTag(idx)}
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="project-management-no-participants-message">
                                            Нет тегов
                                        </div>
                                    )}
                                </div>
                            </div>
                            <button type="submit" className="save-button">
                                Сохранить
                            </button>
                        </form>
                    ) : activeTab === 'participants' && hasRight(BOARD_RIGHTS.MANAGE_MEMBERS) ? (
                        <div className="participants-section">
                            <h3>Участники доски</h3>
                            <p className="section-description">
                                Добавьте пользователей, которые смогут работать с этой доской
                            </p>
                            <div className="project-management-participants-row">
                                <input
                                    type="text"
                                    className="project-management-modal-input-participant"
                                    placeholder="Имя пользователя"
                                    value={participantInput}
                                    onChange={(e) => setParticipantInput(e.target.value)}
                                />
                                <button
                                    type="button"
                                    className="project-management-add-button"
                                    onClick={() => handleAddUser(participantInput)}
                                >
                                    Добавить
                                </button>
                            </div>
                            <div className="project-management-participants">
                                {board?.participants && board.participants.length > 0 ? (
                                    board.participants.map((participant) => (
                                        <div key={participant.username || participant.id} className="participant-item">
                                            <div className="participant-info">
                                                <img src={participant.avatarURL || Girl} alt={participant.username} />
                                                <span>{participant.username}</span>
                                            </div>
                                            <button
                                                className="project-management-remove-participant-button"
                                                onClick={() => handleRemoveUser(participant.id)}
                                            >
                                                Удалить
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="project-management-no-participants-message">
                                        Нет участников
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : activeTab === 'permissions' && hasRight(BOARD_RIGHTS.MANAGE_RIGHTS) ? (
                        <BoardPermissionsTab board={board} />
                    ) : null}
                </div>
            </div>
        </div>
    );
}

export default BoardManagementModal; 