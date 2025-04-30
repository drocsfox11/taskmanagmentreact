import TopBar from "../components/TopBar";
import ProjectCard from "../components/ProjectCard";
import '../styles/pages/ProjectDashboard.css'
import {useNavigate} from "react-router-dom";
import {useState, useRef, useEffect} from "react";
import { useDispatch, useSelector } from 'react-redux';
import { fetchProjectsRequest, createProjectRequest, updateProjectRequest } from '../store/features/projects/projectsActions';
import { selectProjects } from '../store/features/projects/projectsSelectors';
import CloseCross from '../assets/icons/close_cross.svg';
import Girl from '../assets/icons/girl.svg';
import Man from '../assets/icons/man.svg';
import Man2 from '../assets/icons/man2.svg';
import LoadingSpinner from "../components/LoadingSpinner";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL;

function ProjectDashboard() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const projects = useSelector(selectProjects);
    const isLoading = useSelector(state => state.ui.loading.projects);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
    const [editProject, setEditProject] = useState(null);
    const modalRef = useRef(null);
    const usersByUsername = useSelector(state => state.users.byUsername);

    useEffect(() => {
        // Всегда загружаем свежие данные при монтировании компонента
        dispatch(fetchProjectsRequest());
    }, [dispatch]);

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
    const [form, setForm] = useState({ title: '', description: '', participants: [] });
    useEffect(() => {
        if (modalMode === 'edit' && editProject) {
            setForm({
                title: editProject.title || '',
                description: editProject.description || '',
                participants: editProject.participants || [],
            });
            // Загружаем данные пользователей через redux-saga, если их нет
            (editProject.participants || []).forEach(username => {
                if (!usersByUsername[username]) {
                    dispatch({ type: 'users/fetchUser', payload: username });
                }
            });
        } else {
            setForm({ title: '', description: '', participants: [] });
        }
    }, [modalMode, editProject, isModalOpen, usersByUsername, dispatch]);

    const handleFormChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (modalMode === 'create') {
            dispatch(createProjectRequest(form));
            setTimeout(() => dispatch(fetchProjectsRequest()), 500);
        } else if (modalMode === 'edit' && editProject) {
            dispatch(updateProjectRequest({ id: editProject.id, ...form }));
        }
        setIsModalOpen(false);
    };

    // Участники (email добавление)
    const [participantInput, setParticipantInput] = useState('');
    const handleAddParticipant = () => {
        if (participantInput && !form.participants.includes(participantInput)) {
            dispatch({ type: 'users/fetchUser', payload: participantInput });
            setForm({ ...form, participants: [...form.participants, participantInput] });
            setParticipantInput('');
        }
    };

    return (
        <div id='project-dashboard-container'>
            <TopBar/>
            {isLoading && <LoadingSpinner />}
            <div id='project-dashboard-add-bar-container'>
                <div id='project-dashboard-add-bar-label'>Мои проекты</div>
                <div id='project-dashboard-add-bar-add-button' onClick={handleAddProjectClick}>
                    + Добавить проект
                </div>
            </div>
            <div id='project-dashboard-cards-container'>
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
                        
                        <div className="create-project-modal-label">Участники</div>
                        <div className="create-project-modal-participants-row">
                            <input 
                                className="create-project-modal-input-participant" 
                                value={participantInput} 
                                onChange={e => setParticipantInput(e.target.value)} 
                                placeholder="email@example.com"
                            />
                            <button 
                                type="button" 
                                className="create-project-modal-add-participant" 
                                onClick={handleAddParticipant}
                            >
                                Добавить участника
                            </button>
                        </div>
                        
                        <div className="create-project-modal-avatars-row">
                            {form.participants.slice(0, 3).map((username, idx) => {
                                const user = usersByUsername[username];
                                return (
                                    <img
                                        key={username}
                                        src={user?.avatarURL || Girl}
                                        alt={username}
                                        className="create-project-modal-avatar"
                                    />
                                );
                            })}
                            {form.participants.length > 3 && (
                                <span className="create-project-modal-avatars-more">+{form.participants.length - 3}</span>
                            )}
                        </div>
                        
                        <button 
                            type="submit" 
                            className="create-project-modal-add-participant" 
                            style={{marginTop: 16}}
                        >
                            {modalMode === 'edit' ? 'Сохранить' : 'Создать'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}

export default ProjectDashboard;
