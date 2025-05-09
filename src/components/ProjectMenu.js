import '../styles/components/ProjectMenu.css'
import OptionsActive from '../assets/icons/options_active.svg'
import OptionsPassive from '../assets/icons/options_passive.svg'
import { EmojiProvider, Emoji } from "react-apple-emojis"
import emojiData from "react-apple-emojis/src/data.json"
import Girl from "../assets/icons/girl.svg"
import { useNavigate, useParams } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { useGetProjectsQuery, useGetProjectQuery } from '../services/api/projectsApi'

function ProjectMenu() {
    const navigate = useNavigate();
    const { projectId } = useParams();
    const currentProjectId = projectId ? Number(projectId) : null;
    
    const { data: projects = [] } = useGetProjectsQuery();
    const { data: currentProject } = useGetProjectQuery(currentProjectId, {
        skip: !currentProjectId 
    });
    console.log(currentProject)
    const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
    const [openDropdownId, setOpenDropdownId] = useState(null);
    const modalRef = useRef(null);

    const displayedProjects = projects.slice(0, 4);
    const moreProjects = projects.length > 4 ? projects.slice(4) : [];
    const projectParticipants = currentProject? [currentProject.owner, ...((currentProject.participants) || [])] : [];

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (modalRef.current && !modalRef.current.contains(e.target)) {
                setIsProjectModalOpen(false);
            }
        };

        if (isProjectModalOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isProjectModalOpen]);

    // Close dropdown menu when clicking outside
    useEffect(() => {
        const handleGlobalClick = () => {
            setOpenDropdownId(null);
        };
        
        document.addEventListener('click', handleGlobalClick);
        
        return () => {
            document.removeEventListener('click', handleGlobalClick);
        };
    }, []);

    // Navigate to project dashboard
    const handleProjectClick = (id) => {
        navigate(`/system/project/dashboards/${id}`);
        setIsProjectModalOpen(false);
    };

    // Navigate to project tasks
    const handleProjectTasksClick = (id, e) => {
        e.stopPropagation();
        navigate(`/system/project/tasks/${id}`);
        setOpenDropdownId(null);
    };

    const handleProjectCalendarClick = (id, e) => {
        e.stopPropagation();
        navigate(`/system/calendar/${id}`);
        setOpenDropdownId(null);
    };

    const handleAddProject = () => {
        navigate('/system/project');
    };

    const toggleDropdown = (id, e) => {
        e.stopPropagation();
        setOpenDropdownId(openDropdownId === id ? null : id);
    };

    const handleUserMessageClick = (username, e) => {
        e.stopPropagation();
        navigate(`/system/messenger?user=${username}`);
        setOpenDropdownId(null);
    };

    const handleUserProfileClick = (username, e) => {
        e.stopPropagation();
        setOpenDropdownId(null);
    };



    return (
        <div className='project-menu-container'>
            <div className='project-menu-project-list-container'>
                <div className='project-menu-project-list-label'>Проекты</div>

                <div className='project-menu-project-list'>
                    {displayedProjects.map((project) => (
                        <div 
                            key={project.id}
                            className={project.id === currentProjectId ? 'project-menu-project-list-item-active' : 'project-menu-project-list-item-passive'}
                            onClick={() => handleProjectClick(project.id)}
                        >
                            <div className='project-menu-project-list-item-label-group'>
                                <div className={project.id === currentProjectId ? 'project-menu-project-list-item-label-group-icon' : 'project-menu-project-list-item-label-group-icon-passive'}>
                                    <EmojiProvider data={emojiData}>
                                        <Emoji name="teacher-light-skin-tone" width={12}/>
                                    </EmojiProvider>
                                </div>
                                <div className={project.id === currentProjectId ? 'project-menu-project-list-item-label-group-label' : 'project-menu-project-list-item-label-group-label-passive'}>
                                    {project.title}
                                </div>
                            </div>
                            <div 
                                className='project-menu-project-list-item-options dropdown-container' 
                                onClick={(e) => toggleDropdown(project.id, e)}
                            >
                                <img src={project.id === currentProjectId ? OptionsActive : OptionsPassive} alt="Options" />
                                {openDropdownId === project.id && (
                                    <div className="dropdown-menu">
                                        <div className="dropdown-item" onClick={(e) => handleProjectTasksClick(project.id, e)}>Задачи</div>
                                        <div className="dropdown-item" onClick={(e) => handleProjectCalendarClick(project.id, e)}>Календарь</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {moreProjects.length > 0 && (
                        <div 
                            className='project-menu-project-list-item-passive project-menu-show-more'
                            onClick={() => setIsProjectModalOpen(true)}
                        >
                            <div className='project-menu-project-list-item-label-group'>
                                <div className='project-menu-project-list-item-label-group-label-passive'>
                                    Показать еще ({moreProjects.length})
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {currentProject && projectParticipants.length > 0 && (
                <div className='project-menu-people-list-container'>
                    <div className='project-menu-people-list-label'>Участники</div>

                    <div className='project-menu-people-list'>
                        {projectParticipants.map((user, index) => (
                            <div className='project-menu-people-list-item' key={user.username || index}>
                                <div className='project-menu-people-list-item-label-group'>
                                    <div className='project-menu-people-list-item-label-group-icon'>
                                        <img 
                                            src={user.avatarURL || Girl} 
                                            alt={user.username}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                                        />
                                    </div>
                                    <div className='project-menu-people-list-item-label-group-label-container'>
                                        <div className='project-menu-people-list-item-label-group-label-username'>
                                            {user.name || user.username}
                                        </div>
                                        <div className='project-menu-people-list-item-label-group-label-status-container'>
                                            <div className='project-menu-people-list-item-label-group-label-status-color-active'></div>
                                            <div className='project-menu-people-list-item-label-group-label-status-text'>Онлайн</div>
                                        </div>
                                    </div>
                                </div>

                                <div 
                                    className='project-menu-people-list-item-options dropdown-container'
                                    onClick={(e) => toggleDropdown(`user-${user.username}`, e)}
                                >
                                    <img src={OptionsPassive} alt="Options"/>
                                    {openDropdownId === `user-${user.username}` && (
                                        <div className="dropdown-menu">
                                            <div className="dropdown-item" onClick={(e) => handleUserMessageClick(user.username, e)}>Сообщение</div>
                                            <div className="dropdown-item" onClick={(e) => handleUserProfileClick(user.username, e)}>Профиль</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className='project-menu-events-container'>
                <div className='project-menu-events-label'>События</div>

                <div className='project-menu-events-window'>
                    <div className='project-menu-events-window-all'>Всего</div>

                    <div className='project-menu-events-window-events'>
                        <div className='project-menu-events-window-events-counter'>1087 событий</div>
                        <div className='project-menu-people-list-item-options'>
                            <img src={OptionsPassive} alt="Options Active"/>
                        </div>
                    </div>

                    <div className='project-menu-events-window-events-added'>
                        <div className='project-menu-events-window-events-added-text'>+25</div>
                        <div className='project-menu-events-window-events-added-label'>новых событий</div>
                    </div>
                </div>
            </div>

            <div className='project-menu-add-project-button' onClick={handleAddProject}>
                <div className='project-menu-add-project-button-text'>+ Добавить проект</div>
            </div>

            {/* Modal for "Show more" projects */}
            {isProjectModalOpen && (
                <div className="project-menu-list-modal">
                    <div className="project-menu-list-container">
                        {moreProjects.map(project => (
                            <div 
                                key={project.id}
                                className={`project-menu-list-item ${currentProjectId === project.id ? 'active' : ''}`}
                                onClick={() => handleProjectClick(project.id)}
                            >
                                <div className="project-menu-list-item-content">
                                    <div className="project-menu-list-item-icon">
                                        <EmojiProvider data={emojiData}>
                                            <Emoji name="teacher-light-skin-tone" width={16}/>
                                        </EmojiProvider>
                                    </div>
                                    <div className="project-menu-list-item-title">{project.title}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

export default ProjectMenu;
