import { useState, useEffect } from 'react';
import { useUpdateProjectMutation } from '../services/api/projectsApi';
import '../styles/components/ProjectManagementModal.css';
import CloseCross from '../assets/icons/close_cross.svg';
import Girl from '../assets/icons/girl.svg';

function ProjectManagementModal({ project, onClose }) {
    const [activeTab, setActiveTab] = useState('info');
    const [updateProject] = useUpdateProjectMutation();
    const [form, setForm] = useState({
        title: project?.title || '',
        description: project?.description || '',
        participantUsernames: []
    });
    const [participantInput, setParticipantInput] = useState('');

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
            await updateProject({ id: project.id, ...projectData }).unwrap();
            onClose();
        } catch (err) {
            console.error('Failed to update project:', err);
        }
    };
    
    const handleAddParticipant = () => {
        if (participantInput && !form.participantUsernames.includes(participantInput)) {
            setForm({ 
                ...form, 
                participantUsernames: [...form.participantUsernames, participantInput] 
            });
            setParticipantInput('');
        }
    };
    
    const handleRemoveParticipant = (username) => {
        setForm({
            ...form,
            participantUsernames: form.participantUsernames.filter(p => p !== username)
        });
    };

    return (
        <div className="project-management-modal-overlay">
            <div className="project-management-modal">
                <div className="project-management-modal-header">
                    <div className="project-management-modal-title">Управление проектом</div>
                    <img 
                        src={CloseCross} 
                        alt="close" 
                        className="project-management-modal-close" 
                        onClick={onClose}
                    />
                </div>
                
                <div className="project-management-tabs">
                    <div 
                        className={`project-management-tab ${activeTab === 'info' ? 'active' : ''}`}
                        onClick={() => setActiveTab('info')}
                    >
                        Информация
                    </div>
                    <div 
                        className={`project-management-tab ${activeTab === 'participants' ? 'active' : ''}`}
                        onClick={() => setActiveTab('participants')}
                    >
                        Участники
                    </div>
                    <div 
                        className={`project-management-tab ${activeTab === 'settings' ? 'active' : ''}`}
                        onClick={() => setActiveTab('settings')}
                    >
                        Настройки
                    </div>
                </div>
                
                <form onSubmit={handleSubmit}>
                    {activeTab === 'info' && (
                        <div className="project-management-tab-content">
                            <div className="project-management-modal-label">Название</div>
                            <input 
                                className="project-management-modal-input" 
                                name="title" 
                                value={form.title} 
                                onChange={handleFormChange} 
                                placeholder="Введите название"
                                required
                            />
                            
                            <div className="project-management-modal-label">Описание</div>
                            <input 
                                className="project-management-modal-input" 
                                name="description" 
                                value={form.description} 
                                onChange={handleFormChange} 
                                placeholder="Введите описание"
                            />

                            <button 
                                type="submit" 
                                className="project-management-save-button"
                            >
                                Сохранить
                            </button>
                        </div>
                    )}

                    {activeTab === 'participants' && (
                        <div className="project-management-tab-content">
                            <div className="project-management-modal-label">Добавить участника</div>
                            <div className="project-management-participants-row">
                                <input 
                                    className="project-management-modal-input-participant" 
                                    value={participantInput} 
                                    onChange={e => setParticipantInput(e.target.value)} 
                                    placeholder="Имя пользователя"
                                />
                                <button 
                                    type="button" 
                                    className="project-management-add-participant" 
                                    onClick={handleAddParticipant}
                                >
                                    Добавить
                                </button>
                            </div>
                            
                            <div className="project-management-modal-label">Текущие участники</div>
                            {form.participantUsernames.length > 0 ? (
                                <div className="project-management-participants-list">
                                    {form.participantUsernames.map(username => (
                                        <div key={username} className="participant-item">
                                            <div className="participant-avatar">
                                                <img src={Girl} alt={username} />
                                            </div>
                                            <div className="participant-info">
                                                <span className="participant-username">{username}</span>
                                                <span className="participant-role">Участник</span>
                                            </div>
                                            <button 
                                                type="button" 
                                                className="remove-participant-button"
                                                onClick={() => handleRemoveParticipant(username)}
                                            >
                                                Удалить
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="no-participants-message">
                                    В проекте пока нет участников
                                </div>
                            )}

                            <button 
                                type="submit" 
                                className="project-management-save-button"
                            >
                                Сохранить изменения
                            </button>
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="project-management-tab-content">
                            <div className="project-settings-section">
                                <h3>Настройки проекта</h3>
                                <p>Дополнительные настройки проекта будут добавлены позже.</p>
                            </div>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}

export default ProjectManagementModal; 