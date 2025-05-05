import TopBar from "../components/TopBar";
import ProjectCard from "../components/ProjectCard";
import '../styles/pages/ProjectDashboard.css'
import {useNavigate} from "react-router-dom";
import {useState, useRef, useEffect} from "react";
import { useGetProjectsQuery, useCreateProjectMutation, useUpdateProjectMutation } from '../services/api/projectsApi';
import CloseCross from '../assets/icons/close_cross.svg';
import Girl from '../assets/icons/girl.svg';
import LoadingSpinner from "../components/LoadingSpinner";


function ProjectDashboard() {
    const navigate = useNavigate();
    const { data: projects = [], isLoading } = useGetProjectsQuery();
    const [createProject, { isLoading: isCreating }] = useCreateProjectMutation();
    const [updateProject, { isLoading: isUpdating }] = useUpdateProjectMutation();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
    const [editProject, setEditProject] = useState(null);
    const modalRef = useRef(null);

    console.log(projects);

    const handleRedirect = (id) => {
        navigate(`/system/project/dashboards/${id}`);
    };

    const handleAddProjectClick = () => {
        setModalMode('create');
        setEditProject(null);
        setIsModalOpen(true);
    };

    const handleEditProject = (project) => {
        setModalMode('edit');
        setEditProject(project);
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

    // Форма создания/редактирования
    const [form, setForm] = useState({ title: '', description: '' });
    
    useEffect(() => {
        if (modalMode === 'edit' && editProject) {
            setForm({
                title: editProject.title || '',
                description: editProject.description || '',
            });
        } else {
            setForm({ title: '', description: '' });
        }
    }, [modalMode, editProject, isModalOpen]);

    const handleFormChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Format the data for the API
        const projectData = {
            title: form.title,
            description: form.description,
        };
        
        if (modalMode === 'create') {
            try {
                await createProject(projectData).unwrap();
            } catch (err) {
                console.error('Failed to create project:', err);
            }
        } else if (modalMode === 'edit' && editProject) {
            try {
                await updateProject({ id: editProject.id, ...projectData }).unwrap();
            } catch (err) {
                console.error('Failed to update project:', err);
            }
        }
        setIsModalOpen(false);
    };

    return (
        <div id='project-dashboard-container'>
            <TopBar/>
            <div id='project-dashboard-add-bar-container'>
                <div id='project-dashboard-add-bar-label'>Мои проекты</div>
                <div id='project-dashboard-add-bar-add-button' onClick={handleAddProjectClick}>
                    + Добавить проект
                </div>
            </div>
            <div id='project-dashboard-cards-container'>
                {(isLoading || isCreating || isUpdating) && <LoadingSpinner />}

                <div id='project-dashboard-card-row'>
                    {projects.map(project => (
                        <ProjectCard
                            key={project.id}
                            project={project}
                            onClick={() => handleRedirect(project.id)}
                            onEdit={() => handleEditProject(project)}
                        />
                    ))}
                </div>
            </div>
            
            {/* Modal */}
            {isModalOpen && (
                <div className="create-project-modal-overlay">
                    <form className="create-project-modal" ref={modalRef} onSubmit={handleSubmit}>
                        <div className="create-task-modal-header">
                            <div className="create-project-modal-title">{modalMode === 'edit' ? 'Редактирование' : 'Создать проект'}</div>
                            <img src={CloseCross} alt="close" className="create-task-modal-close" onClick={handleCloseModal}/>
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
                            disabled={isCreating || isUpdating}
                        >
                            {modalMode === 'edit' 
                                ? (isUpdating ? 'Сохранение...' : 'Сохранить') 
                                : (isCreating ? 'Создание...' : 'Создать')}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}

export default ProjectDashboard;
