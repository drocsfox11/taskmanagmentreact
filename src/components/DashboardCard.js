import { EmojiProvider, Emoji } from "react-apple-emojis"
import emojiData from "react-apple-emojis/src/data.json"
import '../styles/components/ProjectAndDashboardCard.css'
import OptionsPassive from "../assets/icons/options_passive.svg";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDeleteBoardMutation } from "../services/api/boardsApi";
import BoardManagementModal from "./BoardManagementModal";
import { PROJECT_RIGHTS, BOARD_RIGHTS } from "../constants/rights";
import { useGetCurrentUserRightsQuery } from "../services/api/projectsApi";
import { useGetCurrentUserQuery } from "../services/api/usersApi";
import { useBoardRights } from "../hooks/useRights";

function DashboardCard({ board, onClick }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isManagementModalOpen, setIsManagementModalOpen] = useState(false);
    const [isDeleted, setIsDeleted] = useState(false);
    const modalRef = useRef(null);
    const optionsRef = useRef(null);
    const navigate = useNavigate();
    const [deleteBoard] = useDeleteBoardMutation();
    
    const boardId = board?.id;
    const projectId = board?.projectId;
    const title = board?.title;
    const description = board?.description;
    const completionPercentage = board?.completionPercentage ?? 0;
    const isTemporary = board?.tempId !== undefined;
    
    const { data: currentUser } = useGetCurrentUserQuery();
    const userId = currentUser?.id;
    
    const { data: allProjectRights = {}, isLoading: isRightsLoading } = useGetCurrentUserRightsQuery(
        { skip: !userId }
    );
    
    const checkProjectRights = (rightName) => {
        if (projectId && allProjectRights && !isRightsLoading) {
            const projectRights = allProjectRights[projectId];
            return projectRights && Array.isArray(projectRights) && projectRights.includes(rightName);
        }
        return false;
    };
    
    const canEditBoard = checkProjectRights(PROJECT_RIGHTS.EDIT_BOARDS);
    const canDeleteBoard = checkProjectRights(PROJECT_RIGHTS.DELETE_BOARDS);
    
    const { hasRight: hasBoardRight, isLoading: isBoardRightsLoading } = useBoardRights(boardId);
    
    const canManageMembers = hasBoardRight && hasBoardRight(BOARD_RIGHTS.MANAGE_MEMBERS);
    const canManageRights = hasBoardRight && hasBoardRight(BOARD_RIGHTS.MANAGE_RIGHTS);
    
    const showOptionsIcon = canEditBoard || canDeleteBoard || canManageMembers || canManageRights;
    
    useEffect(() => {
        console.log(`DashboardCard for board ${boardId}:`);
        console.log(`projectId: ${projectId}`);
        console.log(`allProjectRights:`, allProjectRights);
        console.log(`isRightsLoading: ${isRightsLoading}`);
        console.log(`Board rights: canManageMembers=${canManageMembers}, canManageRights=${canManageRights}`);
        console.log(`Final permissions: canEdit=${canEditBoard}, canDelete=${canDeleteBoard}`);
        console.log(`Show options icon: ${showOptionsIcon}`);
        console.log(`Is temporary board: ${isTemporary}`);
    }, [boardId, projectId, allProjectRights, isRightsLoading, canEditBoard, canDeleteBoard, canManageMembers, canManageRights, showOptionsIcon, isTemporary]);
    
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
        if (isManagementModalOpen ||
            e.target.closest('.project-management-modal-overlay') || 
            e.target.closest('.project-card-modal-container') || 
            isTemporary) {
            return;
        }
        
        if (boardId && projectId) {
            navigate(`/system/project/${projectId}/board/${boardId}/tasks`);
        } else if (onClick) {
            onClick();
        }
    };
    
    const handleDelete = async (e) => {
        e.stopPropagation();
        
        setIsDeleted(true);
        setIsModalOpen(false);
        
        try {
            await deleteBoard(boardId);
            console.log(`Board ${boardId} successfully deleted`);
        } catch (error) {
            setIsDeleted(false);
            console.error('Error deleting board:', error);
            alert('Не удалось удалить доску. Пожалуйста, попробуйте снова.');
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

    if (isDeleted || !board) return null;

    const formattedPercentage = Math.round(completionPercentage);

    return (
        <div className='project-card-container' onClick={handleCardClick} style={{ position: 'relative' }}>
            <div className='project-card-icon-row-container'>
                <div className='project-card-icon-container'>
                    <EmojiProvider data={emojiData}>
                        <Emoji name={board.emoji || "clipboard"} width={22}/>
                    </EmojiProvider>
                </div>
                {showOptionsIcon && !isTemporary && (
                    <div ref={optionsRef} onClick={handleOptionsClick} className='project-card-icon-row-container-options'>
                        <img src={OptionsPassive} alt="Options"/>
                    </div>
                )}
                {isTemporary && (
                    <div className='project-card-icon-row-container-temp'>
                        Создается...
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
                <div className='project-card-progress-bar' style={{ 
                    background: `linear-gradient(270deg, #ECECEC ${100 - formattedPercentage}%, #5558FF ${100 - formattedPercentage}%)` 
                }}>
                </div>
                <div className='project-card-progress-text'>
                    {formattedPercentage}% завершено
                </div>
            </div>
            {isModalOpen && !isTemporary && (
                <div ref={modalRef} className="project-card-modal-container" onClick={(e) => e.stopPropagation()}>
                    <div className="project-card-modal-content">
                        {(canEditBoard || canManageMembers || canManageRights) && (
                            <div className="project-card-modal-option" onClick={handleManage}>Управление</div>
                        )}
                        {canDeleteBoard && (
                            <div className="project-card-modal-delete" onClick={handleDelete}>Удалить</div>
                        )}
                    </div>
                </div>
            )}
            
            {isManagementModalOpen && board && !isTemporary && (
                <BoardManagementModal 
                    board={board} 
                    onClose={() => setIsManagementModalOpen(false)}
                    isOpen={isManagementModalOpen}
                />
            )}
        </div>
    );
}

export default DashboardCard;
