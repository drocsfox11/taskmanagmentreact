import { EmojiProvider, Emoji } from "react-apple-emojis"
import emojiData from "react-apple-emojis/src/data.json"
import '../styles/components/ProjectAndDashboardCard.css'
import OptionsPassive from "../assets/icons/options_passive.svg";
import { useState, useRef, useEffect } from "react";
import { useDispatch } from 'react-redux';
import { deleteProjectRequest } from '../store/features/projects/projectsActions';
import Girl from '../assets/icons/girl.svg';

function ProjectCard({ project, onClick, onEdit }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const modalRef = useRef(null);
    const optionsRef = useRef(null);
    const dispatch = useDispatch();

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

    const handleDelete = () => {
        dispatch(deleteProjectRequest(project.id));
        setIsModalOpen(false);
    };

    return (
        <div id='project-card-container' onClick={onClick} style={{ position: 'relative' }}>
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
                <div ref={modalRef} className="modal-container">
                    <div className="modal-content-custom">
                        <div className="modal-edit" onClick={e => { e.stopPropagation(); setIsModalOpen(false); onEdit && onEdit(project); }}>Редактировать</div>
                        <div className="modal-delete" onClick={e => { e.stopPropagation(); handleDelete(); }}>Удалить</div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ProjectCard;
