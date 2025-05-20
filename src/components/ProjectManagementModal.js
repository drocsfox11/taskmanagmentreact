import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchUsersQuery } from '../services/api/usersApi';
import { useRemoveProjectParticipantMutation } from '../services/api/projectParticipantsApi';
import {
    useUpdateProjectMutation,
    useGrantProjectRightMutation,
    useRevokeProjectRightMutation,
    useGetUserRightsQuery,
    useGetProjectQuery
} from '../services/api/projectsApi';
import { 
    useSendInvitationMutation, 
    useGetProjectInvitationsQuery,
    useCancelInvitationMutation
} from '../services/api/invitationsApi';
import { PROJECT_RIGHTS, PROJECT_RIGHT_DESCRIPTIONS } from '../constants/rights';
import '../styles/components/ProjectManagementModal.css';
import CloseCross from '../assets/icons/close_cross.svg';
import Girl from '../assets/icons/girl.svg';
import { useGetCurrentUserQuery } from '../services/api/usersApi';
import { ProjectRightGuard, useProjectRights } from './permissions';
import ProjectPermissionsTab from './ProjectPermissionsTab';
import EmojiPicker from './EmojiPicker';
import { EmojiProvider, Emoji } from "react-apple-emojis";
import emojiData from "react-apple-emojis/src/data.json";

function ProjectManagementModal({ projectId, onClose, isOpen = true }) {
    const {data: project, isLoading} = useGetProjectQuery(projectId)
    const { data: currentUser } = useGetCurrentUserQuery();
    console.log(project)

    const usersOnPage = 2;
    const [activeTab, setActiveTab] = useState('info');
    const [updateProject] = useUpdateProjectMutation();
    const [inviteUser] = useSendInvitationMutation();
    const [cancelInvitation] = useCancelInvitationMutation();
    const [removeParticipant] = useRemoveProjectParticipantMutation();
    const [form, setForm] = useState({
        title: project?.title || '',
        description: project?.description || '',
        emoji: project?.emoji || 'teacher-light-skin-tone'
    });
    const modalRef = useRef(null);
    const [inputValue, setInputValue] = useState('');
    
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [userRights, setUserRights] = useState([]);
    const [hasAccessToAllBoards, setHasAccessToAllBoards] = useState(false);
    const [showPermissions, setShowPermissions] = useState(false);
    
    const [grantRight] = useGrantProjectRightMutation();
    const [revokeRight] = useRevokeProjectRightMutation();
    
    const { data: fetchedUserRights, isLoading: isLoadingRights, refetch } = useGetUserRightsQuery(
        { projectId: project?.id, userId: selectedUserId },
        { skip: !selectedUserId || !showPermissions }
    );
    
    const [searchParams, setSearchParams] = useState({
        query: '',
        page: 0
    });
    
    const [showSearchResults, setShowSearchResults] = useState(false);
    const searchResultsRef = useRef(null);
    const scrollableResultsRef = useRef(null);
    const timeoutRef = useRef(null);
    const [isScrollLoading, setIsScrollLoading] = useState(false);

    const { hasRight } = useProjectRights(projectId);

    console.log(project?.invitations);
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
            skip: !searchParams.query,
            refetchOnMountOrArgChange: true,
            refetchOnFocus: false
        }
    );

    useEffect(() => {
        if (fetchedUserRights) {
            setUserRights(fetchedUserRights);
            setHasAccessToAllBoards(fetchedUserRights.includes(PROJECT_RIGHTS.ACCESS_ALL_BOARDS));
        }
    }, [fetchedUserRights]);

    const isCurrentUser = currentUser && selectedUserId === currentUser.id;

    const users = searchData? searchData.users : [];
    const hasNextPage = searchData? searchData.hasNext : true;

    const filteredUsers = users.filter(user => 
        !project?.participants?.some(participant => participant.id === user.id) &&
        !project?.invitations?.some(invitation => invitation.recipientId === user.id) &&
        (currentUser ? user.id !== currentUser.id : true)
    );

    const handleScroll = useCallback(() => {
        if (!scrollableResultsRef.current || !hasNextPage || isFetching || isScrollLoading) {
            return;
        }

        const { scrollTop, scrollHeight, clientHeight } = scrollableResultsRef.current;
        
        if (scrollTop + clientHeight >= scrollHeight * 0.8) {
            setIsScrollLoading(true);
            loadNextPage();
        }
    }, [hasNextPage, isFetching, isScrollLoading]);

    useEffect(() => {
        const scrollableElement = scrollableResultsRef.current;
        if (scrollableElement) {
            scrollableElement.addEventListener('scroll', handleScroll);
            return () => {
                scrollableElement.removeEventListener('scroll', handleScroll);
            };
        }
    }, [handleScroll]);

    useEffect(() => {
        if (!isFetching) {
            setIsScrollLoading(false);
        }
    }, [isFetching]);

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
    }, [filteredUsers, searchParams.query, isSearching, isFetching, hasNextPage, isScrollLoading]);

    const loadNextPage = useCallback(() => {
        if (hasNextPage && !isFetching) {
            setSearchParams(prev => ({
                ...prev,
                page: prev.page + 1
            }));
        }
    }, [hasNextPage, isFetching]);

    const setSearchQuery = useCallback((query) => {
        setSearchParams({
            query,
            page: 0
        });
    }, []);

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

    useEffect(() => {
        if (project) {
            setForm({
                title: project.title || '',
                description: project.description || '',
                emoji: project.emoji || 'teacher-light-skin-tone'
            });
        }
    }, [project]);

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
            const updatedForm = {
                title: form.title,
                description: form.description,
                emoji: form.emoji
            };
            
            await updateProject({
                id: projectId,
                title: form.title,
                description: form.description,
                emoji: form.emoji
            }).unwrap();
            
        } catch (error) {
            console.error('Failed to update project:', error);
            if (project) {
                setForm({
                    title: project.title || '',
                    description: project.description || '',
                    emoji: project.emoji || 'teacher-light-skin-tone'
                });
            }
        }
    };

    const handleAddUser = async (user) => {
        try {
            await inviteUser({ projectId: project.id, user: user }).unwrap();
            setInputValue('');
            setSearchQuery('');
            setShowSearchResults(false);
        } catch (error) {
            console.error('Failed to add participant:', error);
        }
    };
    
    const handleRemoveParticipant = async (userId) => {
        try {
            await removeParticipant({
                projectId: project.id,
                userId: userId
            }).unwrap();
            
            if (selectedUserId === userId) {
                setSelectedUserId(null);
                setShowPermissions(false);
            }
        } catch (error) {
            console.error('Failed to remove participant:', error);
        }
    };

    const handleCancelInvitation = async (invitationId) => {
        try {
            await cancelInvitation({invitationId: invitationId, projectId: project.id}).unwrap();
        } catch (error) {
            console.error('Failed to cancel invitation:', error);
        }
    };
    
    const handleModalClick = (e) => {
        e.stopPropagation();
    };

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setInputValue(value);
        setShowSearchResults(!!value);
    };

    const handleClickOutside = (event) => {
        if (searchResultsRef.current && !searchResultsRef.current.contains(event.target)) {
            setShowSearchResults(false);
        }
    };

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleUserSelect = (userId) => {
        setSelectedUserId(userId);
        setShowPermissions(true);
    };

    const handleToggleRight = async (rightName, hasRight) => {
        if (!selectedUserId || isCurrentUser) return;
        
        try {
            if (hasRight) {
                await revokeRight({
                    projectId: project.id,
                    userId: selectedUserId,
                    rightName,
                }).unwrap();
            } else {
                await grantRight({
                    projectId: project.id,
                    userId: selectedUserId,
                    rightName,
                }).unwrap();
            }
            
            refetch();
        } catch (error) {
            console.error("Failed to update right:", error);
        }
    };

    const handleToggleAllBoardsAccess = async (hasAccess) => {
        if (!selectedUserId || isCurrentUser) return;
        
        try {
            if (hasAccess) {
                await revokeRight({
                    projectId: project.id,
                    userId: selectedUserId,
                    rightName: PROJECT_RIGHTS.ACCESS_ALL_BOARDS,
                }).unwrap();
            } else {
                await grantRight({
                    projectId: project.id,
                    userId: selectedUserId,
                    rightName: PROJECT_RIGHTS.ACCESS_ALL_BOARDS,
                }).unwrap();
            }
            
            setHasAccessToAllBoards(!hasAccess);
            refetch();
        } catch (error) {
            console.error("Failed to update board access:", error);
        }
    };

    const getInvitationStatus = (status) => {
        switch (status) {
            case 'PENDING':
                return 'Ожидает ответа';
            case 'ACCEPTED':
                return 'Принято';
            case 'REJECTED':
                return 'Отклонено';
            case 'CANCELLED':
                return 'Отменено';
            default:
                return 'Неизвестный статус';
        }
    };

    const getStatusClass = (status) => {
        switch (status) {
            case 'PENDING':
                return 'status-pending';
            case 'ACCEPTED':
                return 'status-accepted';
            case 'REJECTED':
                return 'status-rejected';
            case 'CANCELLED':
                return 'status-cancelled';
            default:
                return '';
        }
    };

    const projectRightsToDisplay = Object.values(PROJECT_RIGHTS).filter(
        right => right !== PROJECT_RIGHTS.ACCESS_ALL_BOARDS
    );

    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

    const handleEmojiSelect = (emojiName) => {
        setForm({ ...form, emoji: emojiName });
        setIsEmojiPickerOpen(false);
    };

    const handleOpenEmojiPicker = (e) => {
        e.stopPropagation();
        setIsEmojiPickerOpen(true);
    };

    if (!isOpen) return null;

    return (
        <div className="project-management-modal-overlay" onClick={handleModalClick}>
            <div className="project-management-modal" ref={modalRef} onClick={e => e.stopPropagation()}>
                <div className="project-management-modal-header">
                    <h2>Управление проектом</h2>
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
                    <ProjectRightGuard projectId={projectId} requires={PROJECT_RIGHTS.MANAGE_MEMBERS}>
                        <button 
                            className={`tab-button ${activeTab === 'participants' ? 'active' : ''}`}
                            onClick={() => setActiveTab('participants')}
                        >
                            Права доступа
                        </button>
                    </ProjectRightGuard>
                    <ProjectRightGuard projectId={projectId} requires={PROJECT_RIGHTS.MANAGE_MEMBERS}>
                        <button 
                            className={`tab-button ${activeTab === 'permissions' ? 'active' : ''}`}
                            onClick={() => setActiveTab('permissions')}
                        >
                            Участники
                        </button>
                    </ProjectRightGuard>
                </div>
                <div className="project-management-modal-content">
                    {activeTab === 'info' && (
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label htmlFor="emoji">Иконка проекта</label>
                                <div className="project-emoji-selector" onClick={handleOpenEmojiPicker}>
                                    <div className="selected-emoji">
                                        <EmojiProvider data={emojiData}>
                                            <Emoji name={form.emoji || 'teacher-light-skin-tone'} width={24} />
                                        </EmojiProvider>
                                    </div>
                                    <span>Выбрать иконку</span>
                                </div>
                            </div>
                            <div className="form-group">
                                <label htmlFor="title">Название проекта</label>
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
                            <button type="submit" className="save-button">
                                Сохранить
                            </button>
                        </form>
                    )}

                    {activeTab === 'participants' && hasRight(PROJECT_RIGHTS.MANAGE_MEMBERS) && (
                        <div className="participants-section">
                            <h3>Участники проекта</h3>
                            
                            <div className="permissions-layout">
                                <div className="participants-list">
                                    {project?.owner && (
                                        <div className={`participant-item owner ${selectedUserId === project.owner.id ? 'selected' : ''}`} 
                                             onClick={() => handleUserSelect(project.owner.id)}>
                                            <div className="participant-info">
                                                <img src={project.owner.avatarURL || Girl} alt={project.owner.name} />
                                                <div className="participant-details">
                                                    <span className="participant-name">{project.owner.name}</span>
                                                    <span className="participant-role">Владелец проекта</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    
                                    {project?.participants && project.participants.length > 0 ? (
                                        project.participants.map((participant) => (
                                            <div 
                                                key={participant.id} 
                                                className={`participant-item ${selectedUserId === participant.id ? 'selected' : ''}`}
                                                onClick={() => handleUserSelect(participant.id)}
                                            >
                                                <div className="participant-info">
                                                    <img src={participant.avatarURL || Girl} alt={participant.name} />
                                                    <span className="participant-name">{participant.name}</span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="no-participants-message">
                                            Нет участников
                                        </div>
                                    )}
                                </div>
                                
                                {showPermissions && selectedUserId && (
                                    <div className="permission-settings">
                                        <h4>Права пользователя {project?.participants?.find(p => p.id === selectedUserId)?.name || project?.owner?.name}</h4>
                                        
                                        {isLoadingRights ? (
                                            <div className="loading-rights">Загрузка прав...</div>
                                        ) : (
                                            <>
                                                <div className="rights-list-header">Права проекта</div>
                                                <div className="rights-list">
                                                    {projectRightsToDisplay.map((rightName) => {
                                                        const hasRight = userRights.includes(rightName);
                                                        return (
                                                            <div key={rightName} className="right-item">
                                                                <div className="right-info">
                                                                    <div className="right-name">{rightName}</div>
                                                                    <div className="right-description">{PROJECT_RIGHT_DESCRIPTIONS[rightName]}</div>
                                                                </div>
                                                                <label className={`toggle-switch ${isCurrentUser ? 'disabled' : ''}`}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={hasRight}
                                                                        onChange={() => handleToggleRight(rightName, hasRight)}
                                                                        disabled={isCurrentUser}
                                                                    />
                                                                    <span className="toggle-slider"></span>
                                                                </label>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                
                                                <div className="all-boards-access-section">
                                                    <h4>Доступ ко всем доскам</h4>
                                                    <div className="right-item">
                                                        <div className="right-info">
                                                            <div className="right-name">Доступ ко всем доскам</div>
                                                            <div className="right-description">
                                                                Предоставляет доступ ко всем доскам проекта
                                                            </div>
                                                        </div>
                                                        <label className={`toggle-switch ${isCurrentUser ? 'disabled' : ''}`}>
                                                            <input
                                                                type="checkbox"
                                                                checked={hasAccessToAllBoards}
                                                                onChange={() => handleToggleAllBoardsAccess(hasAccessToAllBoards)}
                                                                disabled={isCurrentUser}
                                                            />
                                                            <span className="toggle-slider"></span>
                                                        </label>
                                                    </div>
                                                </div>

                                                {isCurrentUser && (
                                                    <div className="current-user-warning">
                                                        <p>Вы не можете изменять свои собственные права доступа</p>
                                                    </div>
                                                )}

                                                {/* Кнопка "Выгнать" в панели настройки прав */}
                                                {selectedUserId !== project?.owner?.id && selectedUserId !== currentUser?.id && (
                                                    <div className="kick-user-section">
                                                        <h4>Удаление из проекта</h4>
                                                        <div className="kick-user-description">
                                                            После удаления участник потеряет доступ ко всем ресурсам проекта
                                                        </div>
                                                        <button
                                                            className="kick-user-button"
                                                            onClick={() => handleRemoveParticipant(selectedUserId)}
                                                        >
                                                            Выгнать участника
                                                        </button>
                                                    </div>
                                                )}
                                                
                                                {selectedUserId === currentUser?.id && (
                                                    <div className="current-user-warning">
                                                        <p>Вы не можете удалить себя из проекта</p>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                        <button className="back-to-participants" onClick={() => setShowPermissions(false)}>
                                            ← Назад к списку
                                        </button>
                                    </div>
                                )}
                                
                                {!showPermissions && (
                                    <div className="select-participant-prompt">
                                        <p>Выберите участника для управления правами</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'permissions' && hasRight(PROJECT_RIGHTS.MANAGE_MEMBERS) && (
                        <div className="permissions-section">
                            <h3>Настройки прав доступа</h3>
                            <p className="section-description">
                                Настройте права доступа для участников проекта
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

                            <h3 className="invitation-list-header">Статусы приглашений</h3>
                            <div className="project-management-invitations">
                                {isLoading ? (
                                    <div className="loading-message">Загрузка приглашений...</div>
                                ) : project?.invitations.length > 0 ? (
                                    <table className="invitations-table">
                                        <thead>
                                            <tr>
                                                <th>Пользователь</th>
                                                <th>Статус</th>
                                                <th>Действия</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {project?.invitations.map((invitation) => (
                                                <tr key={invitation.id}>
                                                    <td className="user-cell">
                                                        <img 
                                                            src={invitation.recipient?.avatarURL || Girl} 
                                                            alt={invitation.recipient?.name || "User"} 
                                                            className="user-avatar"
                                                        />
                                                        <span>{invitation.recipient?.name || invitation.recipient?.username || invitation.recipientId}</span>
                                                    </td>
                                                    <td>
                                                        <span className={`status-badge ${getStatusClass(invitation.status)}`}>
                                                            {getInvitationStatus(invitation.status)}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {invitation.status === 'PENDING' && (
                                                            <button
                                                                className="cancel-invitation-button"
                                                                onClick={() => handleCancelInvitation(invitation.id)}
                                                            >
                                                                Отменить
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="no-invitations-message">
                                        Нет приглашений
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <EmojiPicker 
                isOpen={isEmojiPickerOpen} 
                onClose={() => setIsEmojiPickerOpen(false)}
                selectedEmoji={form.emoji}
                onSelectEmoji={handleEmojiSelect}
            />
        </div>
    );
}

export default ProjectManagementModal; 