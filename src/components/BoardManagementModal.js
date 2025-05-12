import { useState, useEffect, useRef, useCallback } from 'react';
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
import { BOARD_RIGHTS, PROJECT_RIGHTS } from '../constants/rights';
import { BoardRightGuard } from './permissions';
import { useGetAllUserRightsQuery, useGetProjectQuery } from '../services/api/projectsApi';
import { useSearchUsersQuery, useGetCurrentUserQuery } from '../services/api/usersApi';
import EmojiPicker from './EmojiPicker';
import { EmojiProvider, Emoji } from "react-apple-emojis";
import emojiData from "react-apple-emojis/src/data.json";

function BoardManagementModal({ board, onClose, isOpen = true }) {
    const [activeTab, setActiveTab] = useState('info');
    const [updateBoard] = useUpdateBoardMutation();
    const [addUserToBoard] = useAddUserToBoardMutation();
    const [removeUserFromBoard] = useRemoveUserFromBoardMutation();
    const [form, setForm] = useState({
        title: board?.title || '',
        description: board?.description || '',
        tags: board?.tags || [],
        emoji: board?.emoji || 'clipboard'
    });
    const [tagName, setTagName] = useState('');
    const [tagColor, setTagColor] = useState('#FFD700');
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
    const modalRef = useRef(null);
    
    // Для поиска пользователей
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
    
    // Получаем данные о проекте для определения владельца
    const { data: projectData } = useGetProjectQuery(board.projectId, {
        skip: !board.projectId
    });
    
    // Получаем все права пользователя на всех проектах
    const { data: allProjectRights = {} } = useGetAllUserRightsQuery(
        currentUser?.id,
        { skip: !currentUser?.id }
    );

    // Получаем права пользователя на уровне доски, но только если активен соответствующий таб
    const { hasRight: hasBoardRight, rights: boardRights, isLoading: isBoardRightsLoading } = useBoardRights(board.id, {
        skip: activeTab !== 'permissions' && activeTab !== 'participants'
    });
    
    // Проверяем, является ли текущий пользователь владельцем проекта
    const isProjectOwner = currentUser && projectData && projectData.owner && 
                          currentUser.id === projectData.owner.id;
    
    // Проверяем, является ли текущий пользователь владельцем доски
    const isBoardOwner = currentUser && board.ownerId && currentUser.id === board.ownerId;
    
    // Получаем права пользователя для текущего проекта из всех прав
    const projectRights = allProjectRights[board.projectId] || [];
    
    // Проверяем права на уровне проекта напрямую
    const hasProjectRight = (rightName) => {
        return projectRights.includes(rightName);
    };
    
    // Проверяем, имеет ли пользователь право управлять участниками доски
    // Владелец проекта и владелец доски всегда имеют это право
    // Иначе проверяем наличие соответствующих прав
    const canManageMembers = 
        isProjectOwner || 
        isBoardOwner || 
        hasBoardRight?.(BOARD_RIGHTS.MANAGE_MEMBERS) || 
        hasProjectRight(PROJECT_RIGHTS.MANAGE_ACCESS);
    
    // Проверяем, имеет ли пользователь право управлять правами на доске
    // Владелец проекта и владелец доски всегда имеют это право
    // Иначе проверяем наличие соответствующих прав
    const canManageRights = 
        isProjectOwner || 
        isBoardOwner || 
        hasBoardRight?.(BOARD_RIGHTS.MANAGE_RIGHTS) || 
        hasProjectRight(PROJECT_RIGHTS.MANAGE_BOARD_RIGHTS);
    
    // Запрос поиска пользователей, выполняется только если таб участников активен
    const queryArg = {
        name: searchParams.query,
        page: searchParams.page,
        size: usersOnPage
    };

    const { 
        data: searchData, 
        isLoading: isSearching, 
        isFetching 
    } = useSearchUsersQuery(
        queryArg,
        { 
            skip: !searchParams.query || activeTab !== 'participants',
            refetchOnMountOrArgChange: true,
            refetchOnFocus: false
        }
    );

    const users = searchData ? searchData.users : [];
    const hasNextPage = searchData ? searchData.hasNext : true;

    const filteredUsers = users.filter(user => 
        !board?.participants?.some(participant => participant.id === user.id) &&
        (currentUser ? user.id !== currentUser.id : true)
    );
    
    // Обновляем форму при изменении исходных данных доски
    useEffect(() => {
        setForm({
            title: board?.title || '',
            description: board?.description || '',
            tags: board?.tags || [],
            emoji: board?.emoji || 'clipboard'
        });
    }, [board]);

    // Добавляем логирование для диагностики
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
        canManageMembers,
        canManageRights
    ]);

    // Функция загрузки следующей страницы результатов поиска
    const loadNextPage = useCallback(() => {
        if (hasNextPage && !isFetching) {
            setSearchParams(prev => ({
                ...prev,
                page: prev.page + 1
            }));
        }
    }, [hasNextPage, isFetching]);

    // Обработчик прокрутки результатов поиска
    const handleScroll = useCallback(() => {
        if (!scrollableResultsRef.current || !hasNextPage || isFetching || isScrollLoading) {
            return;
        }

        const { scrollTop, scrollHeight, clientHeight } = scrollableResultsRef.current;
        
        if (scrollTop + clientHeight >= scrollHeight * 0.8) {
            setIsScrollLoading(true);
            loadNextPage();
        }
    }, [hasNextPage, isFetching, isScrollLoading, loadNextPage]);

    // Устанавливаем обработчик прокрутки
    useEffect(() => {
        const scrollableElement = scrollableResultsRef.current;
        if (scrollableElement) {
            scrollableElement.addEventListener('scroll', handleScroll);
            return () => {
                scrollableElement.removeEventListener('scroll', handleScroll);
            };
        }
    }, [handleScroll]);

    // Сбрасываем состояние загрузки при завершении запроса
    useEffect(() => {
        if (!isFetching) {
            setIsScrollLoading(false);
        }
    }, [isFetching]);

    // Автоматически загружаем следующую страницу, если результатов мало
    useEffect(() => {
        if (searchParams.query && 
            !isSearching && 
            !isFetching && 
            filteredUsers.length < usersOnPage &&
            hasNextPage && 
            !isScrollLoading) {
            setIsScrollLoading(true);
            loadNextPage();
        }
    }, [filteredUsers, searchParams.query, isSearching, isFetching, hasNextPage, isScrollLoading, usersOnPage, loadNextPage]);

    // Устанавливаем поисковый запрос
    const setSearchQuery = useCallback((query) => {
        setSearchParams({
            query,
            page: 0
        });
    }, []);

    // Обрабатываем изменение поискового запроса с задержкой
    useEffect(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        
        if (inputValue) {
            timeoutRef.current = setTimeout(() => {
                setSearchQuery(inputValue);
            }, 1000);
        } else {
            setSearchQuery('');
        }
        
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [inputValue, setSearchQuery]);

    // Обработчик изменения поля поиска
    const handleSearchChange = (e) => {
        const value = e.target.value;
        setInputValue(value);
        setShowSearchResults(!!value);
    };

    // Обработчик клика вне окна поиска
    const handleClickOutsideSearch = (event) => {
        if (searchResultsRef.current && !searchResultsRef.current.contains(event.target)) {
            setShowSearchResults(false);
        }
    };

    // Устанавливаем обработчик клика вне окна поиска
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
    };

    const handleOpenEmojiPicker = () => {
        setIsEmojiPickerOpen(true);
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

    const handleAddUser = async (user) => {
        try {
            await addUserToBoard({
                boardId: board.id,
                userId: user.id
            }).unwrap();
            
            setInputValue('');
            setShowSearchResults(false);
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

    // Добавим дополнительный эффект для инициализации формы при монтировании
    useEffect(() => {
        if (isOpen && board) {
            console.log("BoardManagementModal: модальное окно открыто, обновляем форму");
            // Принудительно обновляем форму с актуальными данными доски
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
                    {activeTab === 'info' ? (
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
                                    placeholder="Поиск пользователей..."
                                    value={inputValue}
                                    onChange={handleSearchChange}
                                />
                                {showSearchResults && inputValue && (
                                    <div className="search-results" ref={scrollableResultsRef}>
                                        {isSearching && searchParams.page === 0 ? (
                                            <div className="search-loading">Поиск...</div>
                                        ) : filteredUsers.length > 0 ? (
                                            <>
                                                {filteredUsers.map((user) => (
                                                    <div
                                                        key={user.id}
                                                        className="search-result-item"
                                                        onClick={() => handleAddUser(user)}
                                                    >
                                                        <img src={user.avatarURL || Girl} alt={user.name} />
                                                        <span>{user.name}</span>
                                                    </div>
                                                ))}
                                                {(isFetching || isScrollLoading) && hasNextPage && (
                                                    <div className="search-loading search-loading-more">
                                                        Загрузка...
                                                    </div>
                                                )}
                                            </>
                                        ) : searchParams.query && !isFetching ? (
                                            <div className="search-no-results">
                                                Пользователи не найдены
                                            </div>
                                        ) : (
                                            <div className="search-loading">
                                                {isFetching ? "Загрузка пользователей..." : "Введите имя для поиска"}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="project-management-participants">
                                {board?.participants && board.participants.length > 0 ? (
                                    board.participants.map((participant) => (
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