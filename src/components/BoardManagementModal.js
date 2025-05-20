import { useState, useEffect, useRef, useCallback } from 'react';
import { 
    useUpdateBoardMutation, 
    useAddUserToBoardMutation,
    useRemoveUserFromBoardMutation
} from '../services/api/boardsApi';
import BoardPermissionsTab from './BoardPermissionsTab';
import '../styles/components/ProjectManagementModal.css';
import CloseCross from '../assets/icons/close_cross.svg';
import Girl from '../assets/icons/girl.svg';
import { useBoardRights } from './permissions';
import { BOARD_RIGHTS, PROJECT_RIGHTS } from '../constants/rights';
import { BoardRightGuard } from './permissions';
import { useGetCurrentUserRightsQuery, useGetProjectQuery } from '../services/api/projectsApi';
import { useGetCurrentUserQuery } from '../services/api/usersApi';
import EmojiPicker from './EmojiPicker';
import { EmojiProvider, Emoji } from "react-apple-emojis";
import emojiData from "react-apple-emojis/src/data.json";

function BoardManagementModal({ board, onClose, isOpen = true }) {
    const [updateBoard] = useUpdateBoardMutation();
    const [addUserToBoard] = useAddUserToBoardMutation();
    const [removeUserFromBoard] = useRemoveUserFromBoardMutation();
    const [form, setForm] = useState({
        title: board?.title || '',
        description: board?.description || '',
        tags: board?.tags || [],
        emoji: board?.emoji || 'clipboard'
    });
    const [boardParticipants, setBoardParticipants] = useState(board?.participants || []);
    const [tagName, setTagName] = useState('');
    const [tagColor, setTagColor] = useState('#FFD700');
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
    const modalRef = useRef(null);
    
    const usersOnPage = 2;
    const [inputValue, setInputValue] = useState('');
    const [searchParams, setSearchParams] = useState({
        query: '',
        page: 0
    });
    const [showSearchResults, setShowSearchResults] = useState(false);
    const searchResultsRef = useRef(null);
    const scrollableResultsRef = useRef(null);
    const timeoutRef = useRef(null);
    const [isScrollLoading, setIsScrollLoading] = useState(false);
    const { data: currentUser } = useGetCurrentUserQuery();
    
    const { data: projectData } = useGetProjectQuery(board.projectId, {
        skip: !board.projectId
    });
    
    const { data: allProjectRights = {} } = useGetCurrentUserRightsQuery(
        { skip: !currentUser?.id }
    );

    const { hasRight: hasBoardRight, rights: boardRights, isLoading: isBoardRightsLoading } = useBoardRights(board.id);
    
    const isProjectOwner = currentUser && projectData && projectData.owner &&
                          currentUser.id === projectData.owner.id;
    
    const isBoardOwner = currentUser && board.ownerId && currentUser.id === board.ownerId;
    
    const projectRights = allProjectRights[board.projectId] || [];
    
    const hasProjectRight = (rightName) => {
        return projectRights.includes(rightName);
    };
    
    const canEditBoard = isProjectOwner || isBoardOwner || hasProjectRight(PROJECT_RIGHTS.EDIT_BOARDS);

    const canManageMembers = 
        isProjectOwner || 
        isBoardOwner || 
        (hasBoardRight && hasBoardRight(BOARD_RIGHTS.MANAGE_MEMBERS)) || 
        hasProjectRight(PROJECT_RIGHTS.MANAGE_ACCESS);
    

    const canManageRights = 
        isProjectOwner || 
        isBoardOwner || 
        hasBoardRight && hasBoardRight(BOARD_RIGHTS.MANAGE_RIGHTS) || 
        hasProjectRight(PROJECT_RIGHTS.MANAGE_BOARD_RIGHTS);
    
    const getInitialActiveTab = () => {
        if (canEditBoard) {
            return 'info';
        } else if (canManageMembers) {
            return 'participants';
        } else if (canManageRights) {
            return 'permissions';
        }
        return 'info';
    };
    
    const [activeTab, setActiveTab] = useState(() => getInitialActiveTab());
    
    const [filteredProjectParticipants, setFilteredProjectParticipants] = useState([]);
    
    useEffect(() => {
        setForm({
            title: board?.title || '',
            description: board?.description || '',
            tags: board?.tags || [],
            emoji: board?.emoji || 'clipboard'
        });
    }, [board]);

    useEffect(() => {
        console.log("BoardManagementModal: Диагностика доступа");
        console.log("projectId:", board.projectId);
        console.log("boardId:", board.id);
        console.log("currentUser:", currentUser);
        console.log("projectData:", projectData);
        console.log("board.ownerId:", board.ownerId);
        console.log("isProjectOwner:", isProjectOwner);
        console.log("isBoardOwner:", isBoardOwner);
        console.log("projectRights:", projectRights);
        console.log("boardRights:", boardRights);
        console.log("isBoardRightsLoading:", isBoardRightsLoading);
        console.log("hasBoardRight(MANAGE_MEMBERS):", hasBoardRight?.(BOARD_RIGHTS.MANAGE_MEMBERS));
        console.log("hasBoardRight(MANAGE_RIGHTS):", hasBoardRight?.(BOARD_RIGHTS.MANAGE_RIGHTS));
        console.log("hasProjectRight(MANAGE_BOARD_RIGHTS):", hasProjectRight(PROJECT_RIGHTS.MANAGE_BOARD_RIGHTS));
        console.log("hasProjectRight(MANAGE_ACCESS):", hasProjectRight(PROJECT_RIGHTS.MANAGE_ACCESS));
        console.log("canManageMembers:", canManageMembers);
        console.log("canManageRights:", canManageRights);
    }, [
        board.projectId, 
        board.id, 
        currentUser,
        projectData,
        board.ownerId,
        isProjectOwner,
        isBoardOwner,
        projectRights,
        boardRights,
        isBoardRightsLoading,
        hasBoardRight,
        canManageMembers,
        canManageRights
    ]);

    useEffect(() => {
        if (board && board.participants) {
            setBoardParticipants(board.participants);
        }
    }, [board]);

    useEffect(() => {
        if (projectData && projectData.participants && inputValue) {
            const searchLower = inputValue.toLowerCase();
            const filteredUsers = projectData.participants.filter(user => 
                (user.name?.toLowerCase().includes(searchLower) ||
                 user.username?.toLowerCase().includes(searchLower)) && 
                !boardParticipants.some(participant => participant.id === user.id) &&
                (currentUser ? user.id !== currentUser.id : true)
            );
            
            setFilteredProjectParticipants(filteredUsers);
        } else {
            setFilteredProjectParticipants([]);
        }
    }, [inputValue, projectData, boardParticipants, currentUser]);

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setInputValue(value);
        setShowSearchResults(!!value);
    };

    const handleClickOutsideSearch = (event) => {
        if (searchResultsRef.current && !searchResultsRef.current.contains(event.target)) {
            setShowSearchResults(false);
        }
    };

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutsideSearch);
        return () => {
            document.removeEventListener('mousedown', handleClickOutsideSearch);
        };
    }, []);

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

    const handleEmojiSelect = (emoji) => {

        setForm({
            ...form,
            emoji
        });
        setIsEmojiPickerOpen(false);
    };

    const handleOpenEmojiPicker = () => {
        setIsEmojiPickerOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            const updatedForm = {
                title: form.title,
                description: form.description,
                tags: form.tags,
                emoji: form.emoji
            };
            
            await updateBoard({
                id: board.id,
                ...form
            }).unwrap();
            
            onClose();
        } catch (error) {
            console.error('Error updating board:', error);
            if (board) {
                setForm({
                    title: board.title || '',
                    description: board.description || '',
                    tags: board.tags || [],
                    emoji: board.emoji || 'clipboard'
                });
            }
        }
    };

    const handleAddUser = async (user) => {
        try {
            const userToAdd = {
                id: user.id,
                name: user.name || user.username,
                username: user.username,
                avatarURL: user.avatarURL
            };
            
            setBoardParticipants(prev => [...prev, userToAdd]);
            
            setInputValue('');
            setShowSearchResults(false);
            
            await addUserToBoard({
                boardId: board.id,
                userId: user.id
            }).unwrap();
            
        } catch (error) {
            console.error('Failed to add user:', error);
            setBoardParticipants(prev => prev.filter(p => p.id !== user.id));
        }
    };

    const handleRemoveUser = async (userId) => {
        try {
            setBoardParticipants(prev => prev.filter(p => p.id !== userId));
            
            await removeUserFromBoard({
                boardId: board.id,
                userId: userId
            }).unwrap();
        } catch (error) {
            console.error('Failed to remove user:', error);
            const removedUser = board.participants.find(p => p.id === userId);
            if (removedUser) {
                setBoardParticipants(prev => [...prev, removedUser]);
            }
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

    useEffect(() => {
        if (isOpen && board) {
            console.log("BoardManagementModal: модальное окно открыто, обновляем форму");
            setForm({
                title: board.title || '',
                description: board.description || '',
                tags: board.tags || [],
                emoji: board.emoji || 'clipboard'
            });
        }
    }, [isOpen, board]);

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
                        style={{ display: canEditBoard ? 'inline-block' : 'none' }}
                    >
                        Информация
                    </button>
                    <button 
                        className={`tab-button ${activeTab === 'participants' ? 'active' : ''}`}
                        onClick={() => setActiveTab('participants')}
                        style={{ display: canManageMembers ? 'inline-block' : 'none' }}
                    >
                        Участники
                    </button>
                    <button 
                        className={`tab-button ${activeTab === 'permissions' ? 'active' : ''}`}
                        onClick={() => setActiveTab('permissions')}
                        style={{ display: canManageRights ? 'inline-block' : 'none' }}
                    >
                        Права доступа
                    </button>
                </div>
                <div className="project-management-modal-content">
                    {activeTab === 'info' && canEditBoard ? (
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label htmlFor="emoji">Иконка доски</label>
                                <div className="project-emoji-selector" onClick={handleOpenEmojiPicker}>
                                    <div className="selected-emoji">
                                        <EmojiProvider data={emojiData}>
                                            <Emoji name={form.emoji || 'clipboard'} width={24} />
                                        </EmojiProvider>
                                    </div>
                                    <span>Выбрать иконку</span>
                                </div>
                            </div>
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
                    ) : activeTab === 'participants' && canManageMembers ? (
                        <div className="participants-section">
                            <h3>Участники доски</h3>
                            <p className="section-description">
                                Добавьте пользователей, которые смогут работать с этой доской
                            </p>
                            <div className="project-management-modal-search" ref={searchResultsRef}>
                                <input
                                    type="text"
                                    className="project-management-modal-input-participant"
                                    placeholder="Поиск участников проекта..."
                                    value={inputValue}
                                    onChange={handleSearchChange}
                                />
                                {showSearchResults && inputValue && (
                                    <div className="search-results" ref={scrollableResultsRef}>
                                        {!projectData ? (
                                            <div className="search-loading">Загрузка данных проекта...</div>
                                        ) : filteredProjectParticipants.length > 0 ? (
                                            <>
                                                {filteredProjectParticipants.map((user) => (
                                                    <div
                                                        key={user.id}
                                                        className="search-result-item"
                                                        onClick={() => handleAddUser(user)}
                                                    >
                                                        <img src={user.avatarURL || Girl} alt={user.name || user.username} />
                                                        <span>{user.name || user.username}</span>
                                                    </div>
                                                ))}
                                            </>
                                        ) : (
                                            <div className="search-no-results">
                                                {inputValue ? "Участники не найдены или уже добавлены на доску" : "Введите имя для поиска"}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="project-management-participants">
                                {boardParticipants.length > 0 ? (
                                    boardParticipants.map((participant) => (
                                        <div key={participant.id || participant.username} className="participant-item">
                                            <div className="participant-info">
                                                <img src={participant.avatarURL || Girl} alt={participant.name || participant.username} />
                                                <span>{participant.name || participant.username}</span>
                                                {board.ownerId === participant.id && (
                                                    <span style={{ 
                                                        marginLeft: '8px', 
                                                        fontSize: '12px', 
                                                        color: '#666',
                                                        backgroundColor: '#f0f0f0', 
                                                        padding: '2px 6px', 
                                                        borderRadius: '4px' 
                                                    }}>
                                                        Владелец
                                                    </span>
                                                )}
                                                {currentUser && currentUser.id === participant.id && (
                                                    <span style={{ 
                                                        marginLeft: '8px', 
                                                        fontSize: '12px', 
                                                        color: '#666',
                                                        backgroundColor: '#e6f7ff', 
                                                        padding: '2px 6px', 
                                                        borderRadius: '4px' 
                                                    }}>
                                                        Вы
                                                    </span>
                                                )}
                                            </div>
                                            {/* Показываем кнопку удаления только если пользователь не является владельцем доски и не является текущим пользователем */}
                                            {board.ownerId !== participant.id && (!currentUser || currentUser.id !== participant.id) && (
                                                <button
                                                    className="project-management-remove-participant-button"
                                                    onClick={() => handleRemoveUser(participant.id)}
                                                >
                                                    Удалить
                                                </button>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="project-management-no-participants-message">
                                        Нет участников
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : activeTab === 'permissions' && canManageRights ? (
                        <BoardPermissionsTab board={board} />
                    ) : null}
                </div>
            </div>

            {/* Emoji Picker */}
            <EmojiPicker 
                isOpen={isEmojiPickerOpen} 
                onClose={() => setIsEmojiPickerOpen(false)}
                selectedEmoji={form.emoji}
                onSelectEmoji={handleEmojiSelect}
            />
        </div>
    );
}

export default BoardManagementModal; 