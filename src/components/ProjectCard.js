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
import { useGetCurrentUserQuery } from '../services/api/usersApi';

function ProjectCard({ project, onClick }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isManagementModalOpen, setIsManagementModalOpen] = useState(false);
    const [isDeleted, setIsDeleted] = useState(false);
    const modalRef = useRef(null);
    const optionsRef = useRef(null);
    const [deleteProject] = useDeleteProjectMutation();
    
    // Get completion percentage from project data with fallback to 0
    const completionPercentage = project?.completionPercentage ?? 0;
    
    const { data: currentUser } = useGetCurrentUserQuery();
    
    const { hasRight } = useProjectRights(project.id);
    
    const canEditProject = hasRight(PROJECT_RIGHTS.EDIT_PROJECT);
    
    const isProjectOwner = (currentUser && project.owner && currentUser.id === project.owner.id)
    
    const showOptionsIcon = canEditProject || isProjectOwner;

    // Отладочная информация
    useEffect(() => {
        console.log(`ProjectCard ${project.id} (${project.title}):`);
        console.log('project.owner:', project.owner);
        console.log('currentUser:', currentUser);
        console.log('isProjectOwner:', isProjectOwner);
        console.log('canEditProject:', canEditProject);
        console.log('showOptionsIcon:', showOptionsIcon);
    }, [project, currentUser, isProjectOwner, canEditProject, showOptionsIcon]);

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
        
        setIsDeleted(true);
        setIsModalOpen(false);
        
        try {
            await deleteProject(project.id);
            console.log(`Проект ${project.id} успешно удален`);
        } catch (error) {
            setIsDeleted(false);
            console.error('Error deleting project:', error);
            alert('Не удалось удалить проект. Пожалуйста, попробуйте снова.');
        }
    };

    const handleManage = (e) => {
        e.stopPropagation();
        setIsModalOpen(false);
        setIsManagementModalOpen(true);
    };

    if (isDeleted || !project) return null;
    
    // Format percentage number to integer
    const formattedPercentage = Math.round(completionPercentage);
    
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
                        <Emoji name={project.emoji || "teacher-light-skin-tone"} width={22}/>
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
                <div className='project-card-progress-bar' style={{ 
                    background: `linear-gradient(270deg, #ECECEC ${100 - formattedPercentage}%, #5558FF ${100 - formattedPercentage}%)` 
                }}></div>
                <div className='project-card-progress-text'>{formattedPercentage}% завершено</div>
            </div>
            {isModalOpen && (
                <div ref={modalRef} className="project-card-modal-container">
                    <div className="project-card-modal-content">
                        {canEditProject && (
                            <div className="project-card-modal-option" onClick={handleManage}>Управление</div>
                        )}
                        {isProjectOwner && (
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
