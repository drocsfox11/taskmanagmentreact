import { EmojiProvider, Emoji } from "react-apple-emojis"
import emojiData from "react-apple-emojis/src/data.json"
import '../styles/components/ProjectAndDashboardCard.css'
import OptionsPassive from "../assets/icons/options_passive.svg";
import { useState, useRef, useEffect } from "react";
import { useDeleteProjectMutation } from '../services/api/projectsApi';
import Girl from '../assets/icons/girl.svg';
import ProjectManagementModal from './ProjectManagementModal';

function ProjectCard({ project, onClick, onEdit }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isManagementModalOpen, setIsManagementModalOpen] = useState(false);
    const modalRef = useRef(null);
    const optionsRef = useRef(null);
    const [deleteProject] = useDeleteProjectMutation();

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

    const handleDelete = async () => {
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

    // Get the first few participants to display (if any)
    const participants = project.participants || [];
    
    return (
        <div id='project-card-container' onClick={(e) => {
            // Prevent navigation if clicking on modal or its children
            if (e.target.closest('.project-management-modal') || e.target.closest('.project-card-modal-container')) {
                return;
            }
            onClick();
        }} style={{ position: 'relative' }}>
            <div id='project-card-icon-row-container'>
                <div id='project-card-icon-container'>
                    <EmojiProvider data={emojiData}>
                        <Emoji name="teacher-light-skin-tone" width={22}/>
                    </EmojiProvider>
                </div>
                <div ref={optionsRef} onClick={handleOptionsClick}>
                    <img src={OptionsPassive} alt="Options Active"/>
                </div>
            </div>
            <div id='project-card-text-container'>
                <div id='project-card-text-header'>{project.title}</div>
                <div id='project-card-text-descr'>{project.description}</div>
            </div>
            <div id='project-card-progress-container'>
                <div id='project-card-progress-bar'></div>
                <div id='project-card-progress-text'>13% завершено</div>
            </div>
            {isModalOpen && (
                <div ref={modalRef} className="project-card-modal-container">
                    <div className="project-card-modal-content">
                        <div className="project-card-modal-option" onClick={handleManage}>Управление</div>
                        <div className="project-card-modal-option" onClick={e => { e.stopPropagation(); setIsModalOpen(false); onEdit && onEdit(project); }}>Редактировать</div>
                        <div className="project-card-modal-delete" onClick={e => { e.stopPropagation(); handleDelete(); }}>Удалить</div>
                    </div>
                </div>
            )}
            
            {isManagementModalOpen && (
                <ProjectManagementModal 
                    project={project} 
                    onClose={() => setIsManagementModalOpen(false)}
                />
            )}
        </div>
    );
}

export default ProjectCard;
