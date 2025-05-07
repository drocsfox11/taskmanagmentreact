import TopBar from "../components/TopBar";
import '../styles/pages/ProjectDashboardsDashboard.css'
import ProjectMenu from "../components/ProjectMenu";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { useGetBoardsQuery, useCreateBoardMutation } from "../services/api/boardsApi";
import { useGetProjectQuery } from "../services/api/projectsApi";
import CloseCross from '../assets/icons/close_cross.svg';
import DashboardCard from "../components/DashboardCard";
import LoadingSpinner from "../components/LoadingSpinner";

function ProjectDashBoardsDashboard() {
    const { projectId } = useParams();
    const numericProjectId = Number(projectId);
    
    // Use RTK Query hooks
    const { data: project, isLoading: isProjectLoading } = useGetProjectQuery(numericProjectId);
    const { data: boards = [], isLoading: isBoardsLoading } = useGetBoardsQuery(numericProjectId);
    const [createBoard] = useCreateBoardMutation();
    
    const [isBoardModalOpen, setIsBoardModalOpen] = useState(false);
    const [boardForm, setBoardForm] = useState({ title: '', description: '', tags: [] });
    const [tagTitle, setTagTitle] = useState('');
    const [tagColor, setTagColor] = useState('#FFD700');
    const modalRef = useRef(null);
    const navigate = useNavigate();
    
    const isLoading = isProjectLoading || isBoardsLoading;

    const handleOpenBoardModal = () => {
        setBoardForm({ title: '', description: '', tags: [] });
        setIsBoardModalOpen(true);
    };
    
    const handleCloseBoardModal = () => {
        setIsBoardModalOpen(false);
        setBoardForm({ title: '', description: '', tags: [] });
    };
    
    const handleBoardFormChange = (e) => {
        setBoardForm({ ...boardForm, [e.target.name]: e.target.value });
    };
    
    const handleAddTag = () => {
        if (tagTitle.trim()) {
            setBoardForm(prev => ({
                ...prev,
                tags: [...(prev.tags || []), { name: tagTitle, color: tagColor }]
            }));
            setTagTitle('');
            setTagColor('#FFD700');
        }
    };
    
    const handleRemoveTag = (idx) => {
        setBoardForm(prev => ({
            ...prev,
            tags: prev.tags.filter((_, i) => i !== idx)
        }));
    };
    
    const handleBoardSubmit = async (e) => {
        e.preventDefault();
        if (!project) return;
        
        // Get participant IDs directly from the project
        const participantIds = project.participants 
            ? project.participants.map(user => user.username)
            : [];
        
        // Add owner if not already in the list
        if (project.owner && !participantIds.includes(project.owner.username)) {
            participantIds.push(project.owner.username);
        }
        
        const payload = {
            ...boardForm,
            projectId: numericProjectId,
            participantIds,
        };
        
        console.log('Submitting board with payload:', payload);
        
        try {
            await createBoard(payload).unwrap();
            
            // Добавляем задержку для обновления UI
            setTimeout(() => {
                handleCloseBoardModal();
            }, 500);
        } catch (error) {
            console.error('Error creating board:', error);
        }
    };
    
    return (
        <div id='project-dashboards-dashboard-container'>
            <ProjectMenu />
            <div id='project-dashboard-container'>
                <TopBar />
                {isLoading && <LoadingSpinner />}
                
                {project ? (
                    <>
                        <div id='project-dashboard-add-bar-container'>
                            <div id='project-dashboard-add-bar-label'>{project.title || 'Загрузка проекта...'}</div>
                            <div id='project-dashboard-add-bar-add-button' onClick={() => handleOpenBoardModal()}>
                                + Добавить доску
                            </div>
                        </div>
                        <div id='project-dashboard-cards-container'>
                            <div id='project-dashboard-card-row'>
                                {boards.map(board => (
                                    <DashboardCard
                                        key={board.id}
                                        boardId={board.id}
                                        projectId={numericProjectId}
                                        title={board.title}
                                        description={board.description}
                                    />
                                ))}
                            </div>
                        </div>
                    </>
                ) : (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
                        <LoadingSpinner /> <span style={{ marginLeft: '10px' }}>Загрузка данных проекта...</span>
                    </div>
                )}
                
                {isBoardModalOpen && project && (
                    <div className="create-project-modal-overlay">
                        <form className="create-project-modal" ref={modalRef} onSubmit={handleBoardSubmit}>
                            <div className="create-task-modal-header">
                                <div className="create-project-modal-title">Создать доску</div>
                                <img src={CloseCross} alt="close" className="create-task-modal-close" onClick={handleCloseBoardModal}/>
                            </div>
                            <div className="create-project-modal-label">Название доски</div>
                            <input className="create-project-modal-input" name="title" value={boardForm.title} onChange={handleBoardFormChange} placeholder="Введите название доски"/>
                            <div className="create-project-modal-label">Описание доски</div>
                            <input className="create-project-modal-input" name="description" value={boardForm.description} onChange={handleBoardFormChange} placeholder="Введите описание доски"/>
                            <div className="create-project-modal-label">Теги</div>
                            
                            <div className="create-project-modal-tag-row">
                                <input className="create-project-modal-input" value={tagTitle} onChange={(e) => setTagTitle(e.target.value)} placeholder="Название тега"/>
                                <input type="color" value={tagColor} onChange={(e) => setTagColor(e.target.value)} className="create-project-modal-color-picker" />
                                <button type="button" className="create-project-modal-add-button" onClick={handleAddTag}>Добавить</button>
                            </div>
                            <div className="create-project-modal-tags">
                                {boardForm.tags && boardForm.tags.length > 0 ? (
                                    boardForm.tags.map((tag, idx) => (
                                        <div key={idx} className="create-project-modal-tag" style={{ backgroundColor: tag.color }}>
                                            {tag.name}
                                            <button type="button" className="create-project-modal-remove-tag" onClick={() => handleRemoveTag(idx)}>×</button>
                                        </div>
                                    ))
                                ) : (
                                    <p className="create-project-modal-no-tags">Нет тегов</p>
                                )}
                            </div>
                            <button type="submit" className="create-project-modal-submit">Создать</button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ProjectDashBoardsDashboard;
