import { EmojiProvider, Emoji } from "react-apple-emojis"
import emojiData from "react-apple-emojis/src/data.json"
import '../styles/components/ProjectAndDashboardCard.css'
import OptionsPassive from "../assets/icons/options_passive.svg";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDeleteBoardMutation, useGetBoardWithDataQuery } from "../services/api/boardsApi";
import BoardManagementModal from "./BoardManagementModal";
import { useProjectRights } from "./permissions";
import { PROJECT_RIGHTS } from "../constants/rights";
import { useGetAllUserRightsQuery } from "../services/api/projectsApi";
import { useGetCurrentUserQuery } from "../services/api/usersApi";

function DashboardCard({ board, onClick }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isManagementModalOpen, setIsManagementModalOpen] = useState(false);
    const modalRef = useRef(null);
    const optionsRef = useRef(null);
    const navigate = useNavigate();
    const [deleteBoard] = useDeleteBoardMutation();
    
    // Для отображения нужны эти данные из объекта board
    const boardId = board?.id;
    // Важно получить корректный projectId, так как он может быть не установлен
    const projectId = board?.projectId;
    const title = board?.title;
    const description = board?.description;
    
    // Получаем текущего пользователя напрямую для отладки
    const { data: currentUser } = useGetCurrentUserQuery();
    const userId = currentUser?.id;
    
    // Получаем все права пользователя на всех проектах
    const { data: allProjectRights = {}, isLoading: isRightsLoading } = useGetAllUserRightsQuery(
        userId,
        { skip: !userId }
    );
    
    // Извлекаем права для текущего проекта, если он известен
    const directUserRights = projectId && allProjectRights[projectId] ? allProjectRights[projectId] : [];
    
    // Получаем права пользователя через хук
    const { hasRight, rights, isLoading: isRightsHookLoading } = useProjectRights(projectId);
    
    // Проверяем, есть ли у пользователя права на редактирование или удаление на уровне проекта
    const canEditBoard = hasRight(PROJECT_RIGHTS.EDIT_BOARDS);
    const canDeleteBoard = hasRight(PROJECT_RIGHTS.DELETE_BOARDS);
    
    // Прямая проверка для отладки (без использования хука)
    const directCanEditBoard = directUserRights.includes(PROJECT_RIGHTS.EDIT_BOARDS);
    const directCanDeleteBoard = directUserRights.includes(PROJECT_RIGHTS.DELETE_BOARDS);
    
    // Показывать троеточие только если есть хотя бы одно право
    // Используем прямую проверку для большей надежности
    const showOptionsIcon = directCanEditBoard || directCanDeleteBoard;
    
    // Получаем boardWithData, чтобы получить дополнительную информацию о доске, включая projectId, если он отсутствует
    // Это важно для корректной работы прав
    const { data: boardWithData, isLoading: isBoardDataLoading } = useGetBoardWithDataQuery(boardId, {
        skip: !boardId // Всегда загружаем данные доски, если есть boardId
    });
    
    // Если projectId не был указан изначально, но получен через API, используем его
    const effectiveProjectId = projectId || boardWithData?.projectId;
    
    // Извлекаем права для эффективного projectId, если он отличается от исходного
    const updatedRights = effectiveProjectId && 
                         effectiveProjectId !== projectId && 
                         allProjectRights[effectiveProjectId] ? 
                         allProjectRights[effectiveProjectId] : [];
    
    // Отладочный вывод для проверки прав
    useEffect(() => {
        console.log(`DashboardCard for board ${boardId} (initial projectId: ${projectId}):`);
        console.log(`Board with data:`, boardWithData);
        console.log(`Effective projectId: ${effectiveProjectId}`);
        console.log(`Current user:`, currentUser);
        console.log(`Direct rights:`, directUserRights);
        console.log(`Hook rights:`, rights);
        console.log(`Updated rights:`, updatedRights);
        console.log(`Final permissions: canEdit=${canEditBoard}, canDelete=${canDeleteBoard}`);
        console.log(`Show options icon: ${showOptionsIcon}`);
    }, [boardId, projectId, effectiveProjectId, directUserRights, rights, 
        updatedRights, boardWithData, canEditBoard, canDeleteBoard, 
        showOptionsIcon, currentUser]);
    
    const handleOptionsClick = (e) => {
        e.stopPropagation();
        setIsModalOpen(true);
    };

    const handleClickOutside = (e) => {
        if (modalRef.current && !modalRef.current.contains(e.target) && 
            optionsRef.current && !optionsRef.current.contains(e.target)) {
            setIsModalOpen(false);
        }
    };

    const handleCardClick = (e) => {
        // Если клик был внутри модалки, то не выполняем навигацию
        if (isManagementModalOpen || 
            e.target.closest('.project-management-modal-overlay') || 
            e.target.closest('.project-card-modal-container')) {
            return;
        }
        
        // Используем effectiveProjectId, если он доступен
        if (boardId && effectiveProjectId) {
            navigate(`/system/project/${effectiveProjectId}/board/${boardId}/tasks`);
        } else if (onClick) {
            onClick();
        }
    };
    
    const handleDelete = async (e) => {
        e.stopPropagation();
        try {
            await deleteBoard(boardId);
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error deleting board:', error);
        }
    };
    
    const handleManage = (e) => {
        e.stopPropagation();
        setIsModalOpen(false);
        // Убедимся, что boardWithData загружено перед открытием модалки
        console.log("DashboardCard: Открываем модальное окно управления доской");
        console.log("DashboardCard: board:", board);
        console.log("DashboardCard: boardWithData:", boardWithData);
        
        if (boardWithData) {
            console.log("DashboardCard: Используем boardWithData для управления доской");
            setIsManagementModalOpen(true);
        } else {
            console.warn("DashboardCard: boardWithData не загружено, используем оригинальный board");
            setIsManagementModalOpen(true);
        }
    };

    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Если board не определен, не отображаем карточку
    if (!board) return null;

    return (
        <div className='project-card-container' onClick={handleCardClick} style={{ position: 'relative' }}>
            <div className='project-card-icon-row-container'>
                <div className='project-card-icon-container'>
                    <EmojiProvider data={emojiData}>
                        <Emoji name={board.emoji || "clipboard"} width={22}/>
                    </EmojiProvider>
                </div>
                {showOptionsIcon && (
                    <div ref={optionsRef} onClick={handleOptionsClick} className='project-card-icon-row-container-options'>
                        <img src={OptionsPassive} alt="Options"/>
                    </div>
                )}
            </div>
            <div className='project-card-text-container'>
                <div className='project-card-text-header'>
                    {title}
                </div>
                <div className='project-card-text-descr'>
                    {description}
                </div>
            </div>
            <div className='project-card-progress-container'>
                <div className='project-card-progress-bar'>
                </div>
                <div className='project-card-progress-text'>
                    13% завершено
                </div>
            </div>
            {isModalOpen && (
                <div ref={modalRef} className="project-card-modal-container" onClick={(e) => e.stopPropagation()}>
                    <div className="project-card-modal-content">
                        {canEditBoard && (
                            <div className="project-card-modal-option" onClick={handleManage}>Управление</div>
                        )}
                        {canDeleteBoard && (
                            <div className="project-card-modal-delete" onClick={handleDelete}>Удалить</div>
                        )}
                    </div>
                </div>
            )}
            
            {isManagementModalOpen && (boardWithData || board) && (
                <BoardManagementModal 
                    board={boardWithData || board} 
                    onClose={() => setIsManagementModalOpen(false)}
                    isOpen={isManagementModalOpen}
                />
            )}
        </div>
    );
}

export default DashboardCard;
