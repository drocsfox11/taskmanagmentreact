import { EmojiProvider, Emoji } from "react-apple-emojis"
import emojiData from "react-apple-emojis/src/data.json"
import '../styles/components/ProjectAndDashboardCard.css'
import OptionsPassive from "../assets/icons/options_passive.svg";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDeleteBoardMutation } from "../services/api/boardsApi";
import BoardManagementModal from "./BoardManagementModal";
import { PROJECT_RIGHTS, BOARD_RIGHTS } from "../constants/rights";
import { useGetAllUserRightsQuery } from "../services/api/projectsApi";
import { useGetCurrentUserQuery } from "../services/api/usersApi";
import { useBoardRights } from "../hooks/useRights";

function DashboardCard({ board, onClick }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isManagementModalOpen, setIsManagementModalOpen] = useState(false);
    const modalRef = useRef(null);
    const optionsRef = useRef(null);
    const navigate = useNavigate();
    const [deleteBoard] = useDeleteBoardMutation();
    
    const boardId = board?.id;
    const projectId = board?.projectId;
    const title = board?.title;
    const description = board?.description;
    
    const { data: currentUser } = useGetCurrentUserQuery();
    const userId = currentUser?.id;
    
    const { data: allProjectRights = {}, isLoading: isRightsLoading } = useGetAllUserRightsQuery(
        userId,
        { skip: !userId }
    );
    
    // Project level rights
    const checkProjectRights = (rightName) => {
        if (projectId && allProjectRights && !isRightsLoading) {
            const projectRights = allProjectRights[projectId];
            return projectRights && Array.isArray(projectRights) && projectRights.includes(rightName);
        }
        return false;
    };
    
    const canEditBoard = checkProjectRights(PROJECT_RIGHTS.EDIT_BOARDS);
    const canDeleteBoard = checkProjectRights(PROJECT_RIGHTS.DELETE_BOARDS);
    
    // Board level rights
    const { hasRight: hasBoardRight, isLoading: isBoardRightsLoading } = useBoardRights(boardId);
    
    const canManageMembers = hasBoardRight && hasBoardRight(BOARD_RIGHTS.MANAGE_MEMBERS);
    const canManageRights = hasBoardRight && hasBoardRight(BOARD_RIGHTS.MANAGE_RIGHTS);
    
    // Show options if user has any of the required rights
    const showOptionsIcon = canEditBoard || canDeleteBoard || canManageMembers || canManageRights;
    
    useEffect(() => {
        console.log(`DashboardCard for board ${boardId}:`);
        console.log(`projectId: ${projectId}`);
        console.log(`allProjectRights:`, allProjectRights);
        console.log(`isRightsLoading: ${isRightsLoading}`);
        console.log(`Board rights: canManageMembers=${canManageMembers}, canManageRights=${canManageRights}`);
        console.log(`Final permissions: canEdit=${canEditBoard}, canDelete=${canDeleteBoard}`);
        console.log(`Show options icon: ${showOptionsIcon}`);
    }, [boardId, projectId, allProjectRights, isRightsLoading, canEditBoard, canDeleteBoard, canManageMembers, canManageRights, showOptionsIcon]);
    
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
            e.target.closest('.project-card-modal-container')) {
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
                        {(canEditBoard || canManageMembers || canManageRights) && (
                            <div className="project-card-modal-option" onClick={handleManage}>Управление</div>
                        )}
                        {canDeleteBoard && (
                            <div className="project-card-modal-delete" onClick={handleDelete}>Удалить</div>
                        )}
                    </div>
                </div>
            )}
            
            {isManagementModalOpen && board && (
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
