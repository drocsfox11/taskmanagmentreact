import { useState, useEffect, useRef } from 'react';
import { useUpdateProjectMutation, useAddProjectParticipantMutation, useRemoveProjectParticipantMutation } from '../services/api/projectsApi';
import InvitationStatusBadge from './InvitationStatusBadge';
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
        
        // Format the data for the API
        const projectData = {
            title: form.title,
            description: form.description,
            participants: form.participantUsernames
        };
        
        try {
            // Оптимистично обновляем UI
            const optimisticUpdate = {
                ...project,
                ...projectData
            };
            
            // Вызываем мутацию с оптимистичным обновлением
            await updateProject({ 
                id: project.id, 
                ...projectData,
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
                // Оптимистично обновляем UI
                const optimisticUpdate = {
                    ...project,
                    participants: [...(project.participants || []), { username: participantInput }],
                    pendingInvitations: {
                        ...project.pendingInvitations,
                        [participantInput]: 'PENDING'
                    }
                };
                
                // Вызываем мутацию для добавления участника
                await addParticipant({ 
                    projectId: project.id, 
                    userId: participantInput,
                    optimisticUpdate
                }).unwrap();
                
                setParticipantInput('');
            } catch (err) {
                console.error('Failed to add participant:', err);
            }
        }
    };

    const handleRemoveParticipant = async (username) => {
        try {
            // Оптимистично обновляем UI
            const optimisticUpdate = {
                ...project,
                participants: project.participants.filter(user => user.username !== username),
                pendingInvitations: {
                    ...project.pendingInvitations,
                    [username]: undefined
                }
            };
            
            // Вызываем мутацию для удаления участника
            await removeParticipant({ 
                projectId: project.id, 
                userId: username,
                optimisticUpdate
            }).unwrap();
        } catch (err) {
            console.error('Failed to remove participant:', err);
        }
    };

    const getInvitationStatus = (username) => {
        // Сначала проверяем статус приглашения
        if (project.pendingInvitations?.[username]) {
            return project.pendingInvitations[username];
        }
        // Если нет приглашения, но есть в участниках - значит принял
        if (project.participants?.some(user => user.username === username)) {
            return 'ACCEPTED';
        }
        return null;
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
                    ) : (
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
                                {/* Показываем участников */}
                                {project.participants?.map((user) => (
                                    <div key={user.id} className="participant-item">
                                        <div className="participant-info">
                                            <img src={user.avatar || Girl} alt="avatar" />
                                            <span>{user.username}</span>
                                            {/* Не показываем статус для участников */}
                                        </div>
                                        <button 
                                            className="remove-button"
                                            onClick={() => handleRemoveParticipant(user.username)}
                                        >
                                            Удалить
                                        </button>
                                    </div>
                                ))}
                                {/* Показываем ожидающих подтверждения */}
                                {Object.entries(project.pendingInvitations || {}).map(([username, status]) => {
                                    // Пропускаем, если пользователь уже в participants
                                    if (project.participants?.some(user => user.username === username)) {
                                        return null;
                                    }
                                    return (
                                        <div key={username} className="participant-item">
                                            <div className="participant-info">
                                                <img src={Girl} alt="avatar" />
                                                <span>{username}</span>
                                                <InvitationStatusBadge status={status} />
                                            </div>
                                            <button 
                                                className="remove-button"
                                                onClick={() => handleRemoveParticipant(username)}
                                            >
                                                Удалить
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ProjectManagementModal; 