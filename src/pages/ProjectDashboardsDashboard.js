import TopBar from "../components/TopBar";
import '../styles/pages/ProjectDashboardsDashboard.css'
import ProjectMenu from "../components/ProjectMenu";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchBoardsByProjectRequest, createBoardRequest, updateBoardRequest, deleteBoardRequest } from "../store/features/boards/boardsActions";
import { selectBoardsByProjectId } from "../store/features/boards/boardsSelectors";
import { selectProjects } from "../store/features/projects/projectsSelectors";
import CloseCross from '../assets/icons/close_cross.svg';
import DashboardCard from "../components/DashboardCard";
import LoadingSpinner from "../components/LoadingSpinner";

function ProjectDashBoardsDashboard() {
    const dispatch = useDispatch();
    const { projectId } = useParams();
    const boards = useSelector(state => selectBoardsByProjectId(state, Number(projectId)));
    const projects = useSelector(selectProjects);
    const project = projects.find(p => p.id === Number(projectId));
    const usersByUsername = useSelector(state => state.users.byUsername);
    const isLoading = useSelector(state => state.ui.loading.boards);
    const [isBoardModalOpen, setIsBoardModalOpen] = useState(false);
    const [boardModalMode, setBoardModalMode] = useState('create');
    const [editBoard, setEditBoard] = useState(null);
    const [boardForm, setBoardForm] = useState({ title: '', description: '', tags: [] });
    const [tagTitle, setTagTitle] = useState('');
    const [tagColor, setTagColor] = useState('#FFD700');
    const modalRef = useRef(null);
    const navigate = useNavigate();
    
    // Add state to track loading attempts
    const [loadAttempts, setLoadAttempts] = useState(0);
    const maxLoadAttempts = 3;

    useEffect(() => {
        if (projectId) {
            dispatch(fetchBoardsByProjectRequest(Number(projectId)));
            // Also fetch projects to make sure we have the project data
            dispatch({ type: 'projects/fetchProjectsRequest' });
            
            // Increment load attempts
            setLoadAttempts(prev => prev + 1);
        }
    }, [dispatch, projectId]);

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
    const handleBoardSubmit = (e) => {
        e.preventDefault();
        if (!project) return;
        const participantUsernames = [...(project?.participants || []), project?.owner].filter(Boolean);
        const participantIds = participantUsernames
            .map(username => usersByUsername[username]?.id)
            .filter(Boolean);
        const payload = {
            ...boardForm,
            projectId: project?.id,
            participantIds,
            id: editBoard?.id,
        };
        if (boardModalMode === 'create') {
            dispatch(createBoardRequest(payload));
        } else if (boardModalMode === 'edit') {
            dispatch(updateBoardRequest(payload));
        }
        handleCloseBoardModal();
    };
    const handleDeleteBoard = (boardId) => {
        dispatch(deleteBoardRequest(boardId));
    };
    
    // If we've tried loading a few times and still don't have data, show a proper error
    if (!project && !isLoading && loadAttempts >= maxLoadAttempts) {
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
    
    // If the project doesn't exist yet and we're not loading, show loading instead of "not found"
    if (!project && !isLoading) {
        return <div><LoadingSpinner /> Загрузка проекта...</div>;
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
                                        projectId={Number(projectId)}
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
