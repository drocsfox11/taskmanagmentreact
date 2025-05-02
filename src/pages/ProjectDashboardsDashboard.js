import TopBar from "../components/TopBar";
import '../styles/pages/ProjectDashboardsDashboard.css'
import ProjectMenu from "../components/ProjectMenu";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { useGetBoardsQuery, useCreateBoardMutation, useUpdateBoardMutation, useDeleteBoardMutation } from "../services/api/boardsApi";
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
    const [updateBoard] = useUpdateBoardMutation();
    const [deleteBoard] = useDeleteBoardMutation();
    
    const [isBoardModalOpen, setIsBoardModalOpen] = useState(false);
    const [boardModalMode, setBoardModalMode] = useState('create');
    const [editBoard, setEditBoard] = useState(null);
    const [boardForm, setBoardForm] = useState({ title: '', description: '', tags: [] });
    const [tagTitle, setTagTitle] = useState('');
    const [tagColor, setTagColor] = useState('#FFD700');
    const modalRef = useRef(null);
    const navigate = useNavigate();
    
    const isLoading = isProjectLoading || isBoardsLoading;

    const handleOpenBoardModal = (board = null) => {
        setEditBoard(board);
        setBoardModalMode(board ? 'edit' : 'create');
        setBoardForm(board ? {
            title: board.title,
            description: board.description,
            tags: Array.isArray(board.tags) ? [...board.tags] : []
        } : { title: '', description: '', tags: [] });
        setIsBoardModalOpen(true);
    };
    
    const handleCloseBoardModal = () => {
        setIsBoardModalOpen(false);
        setEditBoard(null);
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
            id: editBoard?.id,
        };
        
        try {
            if (boardModalMode === 'create') {
                await createBoard(payload);
            } else if (boardModalMode === 'edit') {
                await updateBoard(payload);
            }
            handleCloseBoardModal();
        } catch (error) {
            console.error('Error saving board:', error);
        }
    };
    
    const handleDeleteBoard = async (boardId) => {
        try {
            await deleteBoard(boardId);
        } catch (error) {
            console.error('Error deleting board:', error);
        }
    };
    
    // If there's an error loading the project
    if (!project && !isLoading) {
        return (
            <div style={{ textAlign: 'center', padding: '50px 20px' }}>
                <h2>Проект не найден</h2>
                <p>Возможно, он был удален или у вас нет прав доступа.</p>
                <button 
                    onClick={() => navigate('/system/project')}
                    style={{
                        padding: '10px 20px',
                        background: '#007bff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        marginTop: '20px'
                    }}
                >
                    Вернуться к проектам
                </button>
            </div>
        );
    }
    
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
                                        onEdit={() => handleOpenBoardModal(board)}
                                        onDelete={() => handleDeleteBoard(board.id)}
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
            </div>
            
            {isBoardModalOpen && project && (
                <div className="create-project-modal-overlay">
                    <form className="create-project-modal" ref={modalRef} onSubmit={handleBoardSubmit}>
                        <div className="create-task-modal-header">
                            <div className="create-project-modal-title">{boardModalMode === 'edit' ? 'Редактировать доску' : 'Создать доску'}</div>
                            <img src={CloseCross} alt="close" className="create-task-modal-close" onClick={handleCloseBoardModal}/>
                        </div>
                        <div className="create-project-modal-label">Название доски</div>
                        <input className="create-project-modal-input" name="title" value={boardForm.title} onChange={handleBoardFormChange} placeholder="Введите название доски"/>
                        <div className="create-project-modal-label">Описание доски</div>
                        <input className="create-project-modal-input" name="description" value={boardForm.description} onChange={handleBoardFormChange} placeholder="Введите описание доски"/>
                        <div className="create-project-modal-label">Теги</div>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                            <input 
                                className="create-project-modal-input" 
                                style={{ flex: 2 }}
                                value={tagTitle}
                                onChange={e => setTagTitle(e.target.value)}
                                placeholder="Название тега"
                            />
                            <input 
                                type="color" 
                                value={tagColor}
                                onChange={e => setTagColor(e.target.value)}
                                style={{ width: 40, height: 40, border: 'none', background: 'none', cursor: 'pointer' }}
                            />
                            <button type="button" className="create-project-modal-add-participant" style={{ minWidth: 80 }} onClick={handleAddTag}>Добавить</button>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                            {(boardForm.tags || []).map((tag, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', background: tag.color, borderRadius: 8, padding: '4px 10px', color: '#222', fontWeight: 500 }}>
                                    <span>{tag.name}</span>
                                    <span style={{ marginLeft: 8, cursor: 'pointer', fontWeight: 'bold' }} onClick={() => handleRemoveTag(idx)}>×</span>
                                </div>
                            ))}
                        </div>
                        <button type="submit" className="create-project-modal-add-participant" style={{marginTop: 16}}>
                            {boardModalMode === 'edit' ? 'Сохранить' : 'Создать'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
}

export default ProjectDashBoardsDashboard;
