import { EmojiProvider, Emoji } from "react-apple-emojis"
import emojiData from "react-apple-emojis/src/data.json"
import '../styles/components/ProjectAndDashboardCard.css'
import OptionsPassive from "../assets/icons/options_passive.svg";
import { useState, useRef, useEffect } from "react";
import { useDeleteProjectMutation } from '../services/api/projectsApi';
import Girl from '../assets/icons/girl.svg';
import ProjectManagementModal from './ProjectManagementModal';
import { ProjectRightGuard, useProjectRights } from './permissions';
import { PROJECT_RIGHTS } from '../constants/rights';

function ProjectCard({ project, onClick }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isManagementModalOpen, setIsManagementModalOpen] = useState(false);
    const modalRef = useRef(null);
    const optionsRef = useRef(null);
    const [deleteProject] = useDeleteProjectMutation();
    
    // Получаем права пользователя для проверки
    const { hasRight } = useProjectRights(project.id);
    
    // Проверяем, есть ли у пользователя права на редактирование или удаление
    const canEditProject = hasRight(PROJECT_RIGHTS.EDIT_PROJECT);
    const canDeleteProject = hasRight(PROJECT_RIGHTS.DELETE_BOARDS);
    
    // Показывать троеточие только если есть хотя бы одно право
    const showOptionsIcon = canEditProject || canDeleteProject;

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

    const handleDelete = async (e) => {
        e.stopPropagation();
        try {
            await deleteProject(project.id);
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error deleting project:', error);
        }
    };

    const handleManage = (e) => {
        e.stopPropagation();
        setIsModalOpen(false);
        setIsManagementModalOpen(true);
    };

    // Если project не определен, не отображаем карточку
    if (!project) return null;
    
    return (
        <div className='project-card-container' onClick={(e) => {
            if (e.target.closest('.project-management-modal') || e.target.closest('.project-card-modal-container')) {
                return;
            }
            onClick();
        }} style={{ position: 'relative' }}>
            <div className='project-card-icon-row-container'>
                <div className='project-card-icon-container'>
                    <EmojiProvider data={emojiData}>
                        <Emoji name="teacher-light-skin-tone" width={22}/>
                    </EmojiProvider>
                </div>
                {showOptionsIcon && (
                    <div className='project-card-icon-row-container-options' ref={optionsRef} onClick={handleOptionsClick}>
                        <img src={OptionsPassive} alt="Options Active"/>
                    </div>
                )}
            </div>
            <div className='project-card-text-container'>
                <div className='project-card-text-header'>{project.title}</div>
                <div className='project-card-text-descr'>{project.description}</div>
            </div>
            <div className='project-card-progress-container'>
                <div className='project-card-progress-bar'></div>
                <div className='project-card-progress-text'>13% завершено</div>
            </div>
            {isModalOpen && (
                <div ref={modalRef} className="project-card-modal-container">
                    <div className="project-card-modal-content">
                        {canEditProject && (
                            <div className="project-card-modal-option" onClick={handleManage}>Управление</div>
                        )}
                        {canDeleteProject && (
                            <div className="project-card-modal-delete" onClick={handleDelete}>Удалить</div>
                        )}
                    </div>
                </div>
            )}
            
            {isManagementModalOpen && (
                <ProjectManagementModal
                    projectId={project.id}
                    onClose={() => setIsManagementModalOpen(false)}
                />
            )}
        </div>
    );
}

export default ProjectCard;
