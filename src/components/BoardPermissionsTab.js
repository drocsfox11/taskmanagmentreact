import { useState, useEffect } from 'react';
import { 
    useGrantBoardRightMutation, 
    useRevokeBoardRightMutation, 
    useGetBoardUserRightsQuery
} from '../services/api/boardsApi';
import { BOARD_RIGHTS, BOARD_RIGHT_DESCRIPTIONS } from '../constants/rights';
import '../styles/components/ProjectPermissionsTab.css';
import Girl from '../assets/icons/girl.svg';
import { useGetProjectQuery } from '../services/api/projectsApi';
import { useGetCurrentUserQuery } from '../services/api/usersApi';

function BoardPermissionsTab({ board }) {
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [userRights, setUserRights] = useState([]);
    
    const [grantRight] = useGrantBoardRightMutation();
    const [revokeRight] = useRevokeBoardRightMutation();
    
    const { data: currentUser } = useGetCurrentUserQuery();
    
    const { data: project } = useGetProjectQuery(board.projectId, {
        skip: !board.projectId
    });
    
    const { data: fetchedUserRights, isLoading } = useGetBoardUserRightsQuery(
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
        
        if (currentUser && currentUser.id === selectedUserId) {
            console.log("Нельзя изменять собственные права доступа");
            return;
        }
        
        try {
            if (hasRight) {
                await revokeRight({
                    boardId: board.id,
                    userId: selectedUserId,
                    rightName,
                }).unwrap();
                
                setUserRights(prev => prev.filter(right => right !== rightName));
            } else {
                await grantRight({
                    boardId: board.id,
                    userId: selectedUserId,
                    rightName,
                }).unwrap();
                
                setUserRights(prev => [...prev, rightName]);
            }
            

        } catch (error) {
            console.error("Failed to update right:", error);
        }
    };

    const boardRightsToDisplay = Object.values(BOARD_RIGHTS);
    
    const isProjectOwner = (userId) => {
        return project && project.owner && project.owner.id === userId;
    };
    
    const isCurrentUser = currentUser && selectedUserId === currentUser.id;

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
                                        {currentUser && currentUser.id === user.id && (
                                            <span className="user-role" style={{ backgroundColor: '#e6f7ff' }}>Вы</span>
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
                    {isCurrentUser && (
                        <div className="user-role" style={{marginBottom: '10px', backgroundColor: '#e6f7ff'}}>
                            Вы не можете редактировать свои права доступа
                        </div>
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
                                            <label className={`toggle-switch ${isCurrentUser ? 'disabled' : ''}`} onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    checked={hasRight}
                                                    onChange={(e) => handleToggleRight(rightName, hasRight, e)}
                                                    disabled={isCurrentUser}
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