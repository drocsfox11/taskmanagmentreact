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
import { ProjectRightGuard } from "../components/permissions";
import { PROJECT_RIGHTS } from "../constants/rights";
import EmojiPicker from "../components/EmojiPicker";
import { EmojiProvider, Emoji } from "react-apple-emojis";
import emojiData from "react-apple-emojis/src/data.json";

function ProjectDashBoardsDashboard() {
    const { projectId } = useParams();
    const numericProjectId = Number(projectId);
    
    const { data: project, isLoading: isProjectLoading } = useGetProjectQuery(numericProjectId);
    const { data: boards = [], isLoading: isBoardsLoading } = useGetBoardsQuery(numericProjectId);
    const [createBoard] = useCreateBoardMutation();
    
    const [isBoardModalOpen, setIsBoardModalOpen] = useState(false);
    const [boardForm, setBoardForm] = useState({ title: '', description: '', tags: [], emoji: 'clipboard' });
    const [tagTitle, setTagTitle] = useState('');
    const [tagColor, setTagColor] = useState('#FFD700');
    const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
    const modalRef = useRef(null);
    const navigate = useNavigate();
    
    const isLoading = isProjectLoading || isBoardsLoading;

    const handleOpenBoardModal = () => {
        setBoardForm({ title: '', description: '', tags: [], emoji: 'clipboard' });
        setIsBoardModalOpen(true);
    };
    
    const handleCloseBoardModal = () => {
        setIsBoardModalOpen(false);
        setBoardForm({ title: '', description: '', tags: [], emoji: 'clipboard' });
    };
    
    const handleBoardFormChange = (e) => {
        setBoardForm({ ...boardForm, [e.target.name]: e.target.value });
    };
    
    const handleEmojiSelect = (emoji) => {
        setBoardForm({ ...boardForm, emoji });
    };

    const handleOpenEmojiPicker = () => {
        setIsEmojiPickerOpen(true);
    };
    
    const handleBoardClick = (boardId) => {
        // Prevent navigation for temporary boards (optimistic updates)
        if (boardId.toString().includes('temp-')) {
            console.log("Cannot navigate to a temporary board that's still being created");
            return;
        }
        navigate(`/system/project/${numericProjectId}/board/${boardId}/tasks`);
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
        
        const participantIds = [];
        
        if (project.participants && Array.isArray(project.participants)) {
            project.participants.forEach(user => {
                if (user && user.username) {
                    participantIds.push(user.username);
                }
            });
        }
        
        if (project.owner && project.owner.username && !participantIds.includes(project.owner.username)) {
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
            
            setTimeout(() => {
                handleCloseBoardModal();
            }, 500);
        } catch (error) {
            console.error('Error creating board:', error);
        }
    };
    
    return (
        <div className='project-dashboards-container'>
            <TopBar/>
            <div className='project-dashboards-content'>
                <ProjectMenu />
                <div className='project-dashboards-main-content'>
                    <div className='project-dashboards-header'>
                        <div className='project-dashboards-header-title'>{project?.title}</div>
                        <ProjectRightGuard projectId={numericProjectId} requires={PROJECT_RIGHTS.CREATE_BOARDS}>
                            <button className='project-dashboards-header-button' onClick={handleOpenBoardModal}>
                                + Создать доску
                            </button>
                        </ProjectRightGuard>
                    </div>
                    
                    {isLoading ? (
                        <LoadingSpinner />
                    ) : (
                        <div className='project-dashboards-cards-container'>
                            {boards.length === 0 ? (
                                <div className='project-dashboards-empty-message'>
                                    <p>У вас пока нет досок в этом проекте.</p>
                                    <ProjectRightGuard projectId={numericProjectId} requires={PROJECT_RIGHTS.CREATE_BOARDS}>
                                        <button 
                                            className='project-dashboards-create-button'
                                            onClick={handleOpenBoardModal}
                                        >
                                            + Создать доску
                                        </button>
                                    </ProjectRightGuard>
                                </div>
                            ) : (
                                <div className='project-dashboards-cards-grid'>
                                    {boards.map(board => (
                                        <DashboardCard 
                                            key={board.id} 
                                            board={board} 
                                            onClick={() => handleBoardClick(board.id)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {isBoardModalOpen && project && (
                <div className="create-project-modal-overlay">
                    <form className="create-project-modal" ref={modalRef} onSubmit={handleBoardSubmit}>
                        <div className="create-task-modal-header">
                            <div className="create-project-modal-title">Создать доску</div>
                            <img src={CloseCross} alt="close" className="create-task-modal-close" onClick={handleCloseBoardModal}/>
                        </div>

                        <div className="create-project-modal-label">Иконка доски</div>
                        <div className="project-emoji-selector" onClick={handleOpenEmojiPicker}>
                            <div className="selected-emoji">
                                <EmojiProvider data={emojiData}>
                                    <Emoji name={boardForm.emoji || "clipboard"} width={24} />
                                </EmojiProvider>
                            </div>
                            <span>Выбрать иконку</span>
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

            {/* Emoji Picker */}
            <EmojiPicker 
                isOpen={isEmojiPickerOpen} 
                onClose={() => setIsEmojiPickerOpen(false)}
                selectedEmoji={boardForm.emoji}
                onSelectEmoji={handleEmojiSelect}
            />
        </div>
    );
}

export default ProjectDashBoardsDashboard;
