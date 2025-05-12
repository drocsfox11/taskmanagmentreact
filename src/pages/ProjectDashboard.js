import TopBar from "../components/TopBar";
import ProjectCard from "../components/ProjectCard";
import '../styles/pages/ProjectDashboard.css'
import {useNavigate} from "react-router-dom";
import {useState, useRef, useEffect} from "react";
import { useGetProjectsQuery, useCreateProjectMutation, useGetAllUserRightsQuery } from '../services/api/projectsApi';
import { useGetCurrentUserQuery } from "../services/api/usersApi";
import CloseCross from '../assets/icons/close_cross.svg';
import LoadingSpinner from "../components/LoadingSpinner";
import EmojiPicker from "../components/EmojiPicker";
import { EmojiProvider, Emoji } from "react-apple-emojis";
import emojiData from "react-apple-emojis/src/data.json";


function ProjectDashboard() {
    const navigate = useNavigate();
    const { data: projects = [], isLoading } = useGetProjectsQuery();
    const [createProject, { isLoading: isCreating }] = useCreateProjectMutation();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
    const modalRef = useRef(null);
    
    const { data: currentUser } = useGetCurrentUserQuery();
    
    const { refetch: refetchRights } = useGetAllUserRightsQuery(
        currentUser?.id,
        { skip: !currentUser?.id }
    );

    console.log(projects);

    const handleRedirect = (id) => {
        navigate(`/system/project/dashboards/${id}`);
    };

    const handleAddProjectClick = () => {
        setIsModalOpen(true);
    };


    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const handleClickOutside = (e) => {
        if (modalRef.current && !modalRef.current.contains(e.target)) {
            setIsModalOpen(false);
        }
    };

    useEffect(() => {
        if (isModalOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isModalOpen]);

    const [form, setForm] = useState({ 
        title: '', 
        description: '',
        emoji: 'teacher-light-skin-tone'
    });
    
    useEffect(() => {
        setForm({ 
            title: '', 
            description: '',
            emoji: 'teacher-light-skin-tone'
        });
    }, [isModalOpen]);

    const handleFormChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleEmojiSelect = (emojiName) => {
        setForm({ ...form, emoji: emojiName });
    };

    const handleOpenEmojiPicker = (e) => {
        e.stopPropagation();
        setIsEmojiPickerOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const projectData = {
            title: form.title,
            description: form.description,
            emoji: form.emoji
        };
        
        try {
            const response = await createProject(projectData).unwrap();
            console.log('Проект успешно создан:', response);
            
            if (currentUser?.id) {
                await refetchRights();
                console.log('Права пользователя обновлены');
            }
            
            setIsModalOpen(false);
            setForm({ 
                title: '', 
                description: '',
                emoji: 'teacher-light-skin-tone'
            });
        } catch (err) {
            console.error('Failed to create project:', err);
        }
    };

    return (
        <div className='project-dashboard-container'>
            <TopBar/>
            <div className='project-dashboard-add-bar-container'>
                <div className='project-dashboard-add-bar-label'>Мои проекты</div>
                <div className='project-dashboard-add-bar-add-button' onClick={handleAddProjectClick}>
                    + Добавить проект
                </div>
            </div>
            <div className='project-dashboard-cards-container'>
                {(isLoading || isCreating) && <LoadingSpinner />}

                <div className='project-dashboard-card-row'>
                    {projects.map(project => (
                        <ProjectCard
                            key={project.id}
                            project={project}
                            onClick={() => handleRedirect(project.id)}
                        />
                    ))}
                </div>
            </div>
            
            {/* Modal */}
            {isModalOpen && (
                <div className="create-project-modal-overlay">
                    <form className="create-project-modal" ref={modalRef} onSubmit={handleSubmit}>
                        <div className="create-task-modal-header">
                            <div className="create-project-modal-title">Создать проект</div>
                            <img src={CloseCross} alt="close" className="create-task-modal-close" onClick={handleCloseModal}/>
                        </div>
                        
                        <div className="create-project-modal-label">Иконка</div>
                        <div className="create-project-emoji-selector" onClick={handleOpenEmojiPicker}>
                            <div className="selected-emoji">
                                <EmojiProvider data={emojiData}>
                                    <Emoji name={form.emoji} width={24} />
                                </EmojiProvider>
                            </div>
                            <span>Выбрать иконку</span>
                        </div>
                        
                        <div className="create-project-modal-label">Название</div>
                        <input 
                            className="create-project-modal-input" 
                            name="title" 
                            value={form.title} 
                            onChange={handleFormChange} 
                            placeholder="Введите название"
                            required
                        />
                        
                        <div className="create-project-modal-label">Описание</div>
                        <input 
                            className="create-project-modal-input" 
                            name="description" 
                            value={form.description} 
                            onChange={handleFormChange} 
                            placeholder="Введите описание"
                        />
                        
                        <div className="create-project-modal-description">
                            Управление участниками проекта будет доступно после создания.
                        </div>
                        
                        <button 
                            type="submit" 
                            className="create-project-modal-submit-button"
                            disabled={isCreating}
                        >
                            {isCreating ? 'Создание...' : 'Создать'}
                        </button>
                    </form>
                </div>
            )}
            
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

export default ProjectDashboard;
