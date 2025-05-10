import { useState, useEffect } from 'react';
import { 
    useGrantBoardRightMutation, 
    useRevokeBoardRightMutation, 
    useGetBoardUserRightsQuery
} from '../services/api/boardsApi';
import { BOARD_RIGHTS, BOARD_RIGHT_DESCRIPTIONS } from '../constants/rights';
import '../styles/components/ProjectPermissionsTab.css'; // Reuse the same styles
import Girl from '../assets/icons/girl.svg';
import { useGetProjectQuery } from '../services/api/projectsApi';

function BoardPermissionsTab({ board }) {
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [userRights, setUserRights] = useState([]);
    
    const [grantRight] = useGrantBoardRightMutation();
    const [revokeRight] = useRevokeBoardRightMutation();
    
    // Получаем данные о проекте, чтобы определить владельца
    const { data: project } = useGetProjectQuery(board.projectId, {
        skip: !board.projectId
    });
    
    const { data: fetchedUserRights, isLoading, refetch } = useGetBoardUserRightsQuery(
        { boardId: board?.id, userId: selectedUserId },
        { skip: !selectedUserId || !board }
    );
    
    useEffect(() => {
        if (fetchedUserRights) {
            setUserRights(fetchedUserRights);
        }
    }, [fetchedUserRights]);
    
    const handleUserSelect = (userId, e) => {
        if (e) e.stopPropagation();
        setSelectedUserId(userId);
    };

    const handleToggleRight = async (rightName, hasRight, e) => {
        if (e) e.stopPropagation();
        if (!selectedUserId) return;
        
        try {
            if (hasRight) {
                await revokeRight({
                    boardId: board.id,
                    userId: selectedUserId,
                    rightName,
                }).unwrap();
            } else {
                await grantRight({
                    boardId: board.id,
                    userId: selectedUserId,
                    rightName,
                }).unwrap();
            }
            
            refetch();
        } catch (error) {
            console.error("Failed to update right:", error);
        }
    };

    // All board rights to display
    const boardRightsToDisplay = Object.values(BOARD_RIGHTS);
    
    // Проверяем, является ли пользователь владельцем проекта
    const isProjectOwner = (userId) => {
        return project && project.owner && project.owner.id === userId;
    };

    return (
        <div className="project-permissions-tab" onClick={(e) => e.stopPropagation()}>
            <h3>Управление правами на доске</h3>
            
            <div className="permissions-container">
                <div className="select-user-section">
                    <h4>Выберите участника</h4>
                    <div className="user-list">
                        {board?.participants && board.participants.length > 0 ? (
                            board.participants.map((user) => (
                                <div 
                                    key={user.id} 
                                    className={`user-item ${selectedUserId === user.id ? 'selected' : ''} ${isProjectOwner(user.id) ? 'owner' : ''}`}
                                    onClick={(e) => handleUserSelect(user.id, e)}
                                >
                                    <img src={user.avatarURL || Girl} alt={user.name} />
                                    <div className="user-details">
                                        <span className="user-name">{user.name}</span>
                                        {isProjectOwner(user.id) && (
                                            <span className="user-role">Владелец проекта</span>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="no-users-message">
                                Нет участников на доске
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="user-rights-section">
                    <h4>Права пользователя {board?.participants?.find(p => p.id === selectedUserId)?.name}</h4>
                    {isProjectOwner(selectedUserId) && (
                        <div className="user-role" style={{marginBottom: '10px'}}>Владелец проекта</div>
                    )}
                    
                    {isLoading ? (
                        <div className="loading-rights">Загрузка прав...</div>
                    ) : (
                        <>
                            <div className="rights-list-header">Права доски</div>
                            <div className="rights-list">
                                {boardRightsToDisplay.map((rightName) => {
                                    const hasRight = userRights.includes(rightName);
                                    return (
                                        <div key={rightName} className="right-item" onClick={(e) => e.stopPropagation()}>
                                            <div className="right-info">
                                                <div className="right-name">{rightName}</div>
                                                <div className="right-description">{BOARD_RIGHT_DESCRIPTIONS[rightName]}</div>
                                            </div>
                                            <label className="toggle-switch" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={hasRight}
                                                    onChange={(e) => handleToggleRight(rightName, hasRight, e)}
                                                />
                                                <span className="toggle-slider"></span>
                                            </label>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default BoardPermissionsTab; 