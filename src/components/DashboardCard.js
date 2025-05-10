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
import { useGetUserRightsQuery } from "../services/api/projectsApi";
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
    
    // Напрямую получаем права пользователя для отладки
    const { data: directUserRights = [], isLoading: isRightsLoading } = useGetUserRightsQuery(
        { projectId, userId },
        { skip: !projectId || !userId }
    );
    
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
        skip: !boardId || (!!projectId && isManagementModalOpen) // Получаем данные, если projectId отсутствует или нужно открыть модалку
    });
    
    // Если projectId не был указан изначально, но получен через API, используем его
    const effectiveProjectId = projectId || boardWithData?.projectId;
    
    // Повторно получаем права с effectiveProjectId, если он изменился
    const { data: updatedRights = [] } = useGetUserRightsQuery(
        { projectId: effectiveProjectId, userId },
        { skip: !effectiveProjectId || !userId || (projectId && projectId === effectiveProjectId) }
    );
    
    // Определяем окончательные права на основе всех доступных данных
    const finalCanEditBoard = 
        directCanEditBoard || 
        canEditBoard || 
        updatedRights.includes(PROJECT_RIGHTS.EDIT_BOARDS);
    const finalCanDeleteBoard = 
        directCanDeleteBoard || 
        canDeleteBoard || 
        updatedRights.includes(PROJECT_RIGHTS.DELETE_BOARDS);
    
    // Окончательное решение о показе иконки
    const finalShowOptionsIcon = finalCanEditBoard || finalCanDeleteBoard;
    
    // Отладочный вывод для проверки прав
    useEffect(() => {
        console.log(`DashboardCard for board ${boardId} (initial projectId: ${projectId}):`);
        console.log(`Board with data:`, boardWithData);
        console.log(`Effective projectId: ${effectiveProjectId}`);
        console.log(`Current user:`, currentUser);
        console.log(`Direct rights:`, directUserRights);
        console.log(`Hook rights:`, rights);
        console.log(`Updated rights:`, updatedRights);
        console.log(`Final permissions: canEdit=${finalCanEditBoard}, canDelete=${finalCanDeleteBoard}`);
        console.log(`Show options icon: ${finalShowOptionsIcon}`);
    }, [boardId, projectId, effectiveProjectId, directUserRights, rights, 
        updatedRights, boardWithData, finalCanEditBoard, finalCanDeleteBoard, 
        finalShowOptionsIcon, currentUser]);
    
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
        setIsManagementModalOpen(true);
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
                        <Emoji name="clipboard" width={22}/>
                    </EmojiProvider>
                </div>
                {finalShowOptionsIcon && (
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
                        {finalCanEditBoard && (
                            <div className="project-card-modal-option" onClick={handleManage}>Управление</div>
                        )}
                        {finalCanDeleteBoard && (
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
