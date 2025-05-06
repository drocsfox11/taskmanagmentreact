import { useState, useEffect, useRef } from 'react';
import { useUpdateProjectMutation, useAddProjectParticipantMutation, useRemoveProjectParticipantMutation } from '../services/api/projectsApi';
import InvitationStatusBadge from './InvitationStatusBadge';
import ProjectPermissionsTab from './ProjectPermissionsTab';
import '../styles/components/ProjectManagementModal.css';
import CloseCross from '../assets/icons/close_cross.svg';
import Girl from '../assets/icons/girl.svg';

function ProjectManagementModal({ project, onClose }) {
    const [activeTab, setActiveTab] = useState('info');
    const [updateProject] = useUpdateProjectMutation();
    const [addParticipant] = useAddProjectParticipantMutation();
    const [removeParticipant] = useRemoveProjectParticipantMutation();
    const [form, setForm] = useState({
        title: project?.title || '',
        description: project?.description || '',
        participantUsernames: []
    });
    const [participantInput, setParticipantInput] = useState('');
    const modalRef = useRef(null);

    useEffect(() => {
        if (project) {
            // Extract usernames from participant objects
            const participantUsernames = project.participants 
                ? project.participants.map(user => user.username)
                : [];
                
            setForm({
                title: project.title || '',
                description: project.description || '',
                participantUsernames,
            });
        }
    }, [project]);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (modalRef.current && !modalRef.current.contains(e.target)) {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    const handleFormChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Format the data for the API - only include title and description
        const projectData = {
            title: form.title,
            description: form.description
            // Не отправляем participants при сохранении общей информации проекта
        };
        
        try {
            // Оптимистично обновляем UI
            const optimisticUpdate = {
                ...project,
                ...projectData
                // При оптимистичном обновлении сохраняем текущих участников
            };
            
            // Вызываем мутацию с оптимистичным обновлением
            await updateProject({ 
                id: project.id, 
                ...projectData, // Отправляем только title и description
                optimisticUpdate // Передаем оптимистичное обновление
            }).unwrap();
            
            onClose();
        } catch (err) {
            console.error('Failed to update project:', err);
            // В случае ошибки форма вернется к предыдущему состоянию
            setForm({
                title: project.title || '',
                description: project.description || '',
                participantUsernames: project.participants ? project.participants.map(user => user.username) : []
            });
        }
    };
    
    const handleAddParticipant = async () => {
        if (participantInput && !form.participantUsernames.includes(participantInput)) {
            try {
                // Создаем оптимистичное обновление на основе структуры данных с сервера
                const optimisticUpdate = {
                    ...project,
                    participants: [
                        ...(project.participants || []),
                        {
                            username: participantInput,
                            name: null, // Будет обновлено с сервера
                            avatarURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${participantInput}`, // Временный аватар
                            status: "PENDING" // Статус приглашения
                        }
                    ]
                };
                
                // Вызываем мутацию для добавления участника
                await addParticipant({ 
                    projectId: project.id, 
                    userId: participantInput,
                    optimisticUpdate
                }).unwrap();
                
                // Обновляем локальное состояние формы
                setForm(prevForm => ({
                    ...prevForm,
                    participantUsernames: [...prevForm.participantUsernames, participantInput]
                }));
                
                setParticipantInput('');
            } catch (err) {
                console.error('Failed to add participant:', err);
            }
        }
    };

    const handleRemoveParticipant = async (username) => {
        try {
            // Оптимистично обновляем UI на основе структуры данных с сервера
            const optimisticUpdate = {
                ...project,
                participants: project.participants.filter(user => user.username !== username)
            };
            
            // Вызываем мутацию для удаления участника
            await removeParticipant({ 
                projectId: project.id, 
                userId: username,
                optimisticUpdate
            }).unwrap();
            
            // Обновляем локальное состояние формы
            setForm(prevForm => ({
                ...prevForm,
                participantUsernames: prevForm.participantUsernames.filter(name => name !== username)
            }));
        } catch (err) {
            console.error('Failed to remove participant:', err);
        }
    };

    return (
        <div className="project-management-modal-overlay">
            <div className="project-management-modal" ref={modalRef}>
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
                            <div className="add-participant">
                                <input
                                    type="text"
                                    value={participantInput}
                                    onChange={(e) => setParticipantInput(e.target.value)}
                                    placeholder="Введите имя пользователя"
                                />
                                <button onClick={handleAddParticipant}>Добавить</button>
                            </div>
                            <div className="participants-list">
                                {/* Показываем всех участников и приглашенных */}
                                {project.participants?.map((user) => (
                                    <div key={user.id || user.username} className="participant-item">
                                        <div className="participant-info">
                                            <img src={user.avatarURL || user.avatar || Girl} alt="avatar" />
                                            <span>{user.username}</span>
                                            <InvitationStatusBadge status={user.status} />
                                        </div>
                                        <button 
                                            className="remove-button"
                                            onClick={() => handleRemoveParticipant(user.username)}
                                        >
                                            Удалить
                                        </button>
                                    </div>
                                ))}
                                {/* Если нет участников, показываем сообщение */}
                                {(!project.participants || project.participants.length === 0) && (
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