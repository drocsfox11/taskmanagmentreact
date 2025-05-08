import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchUsersQuery } from '../services/api/usersApi';
import { useAddProjectParticipantMutation, useRemoveProjectParticipantMutation } from '../services/api/projectParticipantsApi';
import { useUpdateProjectMutation } from '../services/api/projectsApi';
import '../styles/components/ProjectManagementModal.css';
import ProjectPermissionsTab from './ProjectPermissionsTab';
import CloseCross from '../assets/icons/close_cross.svg';
import Girl from '../assets/icons/girl.svg';

function ProjectManagementModal({ project, onClose, isOpen = true }) {
    const [activeTab, setActiveTab] = useState('info');
    const [updateProject] = useUpdateProjectMutation();
    const [addParticipant] = useAddProjectParticipantMutation();
    const [removeParticipant] = useRemoveProjectParticipantMutation();
    const [form, setForm] = useState({
        title: project?.title || '',
        description: project?.description || ''
    });
    const modalRef = useRef(null);
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

    const queryArg = {
        name: searchParams.query,
        page: searchParams.page,
        size: 2
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

    console.log(searchData);
    const users = searchData? searchData.users : [];
    const hasNextPage = searchData? searchData.hasNext : true;

    const filteredUsers = users.filter(user => 
        !project?.participants?.some(participant => participant.id === user.id)
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
            filteredUsers.length === 0 && 
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
                description: project.description || ''
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
            await updateProject({
                id: project.id,
                ...form
            }).unwrap();
            onClose();
        } catch (error) {
            console.error('Error updating project:', error);
        }
    };

    const handleAddUser = async (user) => {
        try {
            await addParticipant({ projectId: project.id, user }).unwrap();
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
        } catch (error) {
            console.error('Failed to remove participant:', error);
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

    if (!isOpen) return null;

    return (
        <div className="project-management-modal-overlay" onClick={handleModalClick}>
            <div className="project-management-modal" ref={modalRef} onClick={handleModalClick}>
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
                    <button 
                        className={`tab-button ${activeTab === 'participants' ? 'active' : ''}`}
                        onClick={() => setActiveTab('participants')}
                    >
                        Участники
                    </button>
                    <button 
                        className={`tab-button ${activeTab === 'permissions' ? 'active' : ''}`}
                        onClick={() => setActiveTab('permissions')}
                    >
                        Права доступа
                    </button>
                </div>
                <div className="project-management-modal-content">
                    {activeTab === 'info' ? (
                        <form onSubmit={handleSubmit}>
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
                    ) : activeTab === 'participants' ? (
                        <div className="participants-section">
                            <h3>Участники проекта</h3>
                            <p className="section-description">
                                Добавьте пользователей, которые смогут работать с этим проектом
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
                                {project?.participants && project.participants.length > 0 ? (
                                    project.participants.map((participant) => (
                                        <div key={participant.id} className="participant-item">
                                            <div className="participant-info">
                                                <img src={participant.avatarURL || Girl} alt={participant.name} />
                                                <span>{participant.name}</span>
                                            </div>
                                            <button
                                                className="project-management-remove-participant-button"
                                                onClick={() => handleRemoveParticipant(participant.id)}
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
                    ) : (
                        <ProjectPermissionsTab project={project} />
                    )}
                </div>
            </div>
        </div>
    );
}

export default ProjectManagementModal; 