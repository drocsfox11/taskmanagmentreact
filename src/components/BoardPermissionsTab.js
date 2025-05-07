import { useState, useEffect } from 'react';
import { 
    useGrantBoardRightByUsernameMutation, 
    useRevokeBoardRightByUsernameMutation, 
    useGetBoardUserRightsByUsernameQuery
} from '../services/api/boardsApi';
import { BOARD_RIGHTS, RIGHT_DESCRIPTIONS } from '../constants/rights';
import '../styles/components/ProjectPermissionsTab.css'; // Reuse the same styles
import Girl from '../assets/icons/girl.svg';

function BoardPermissionsTab({ board }) {
    const [selectedUser, setSelectedUser] = useState(null);
    const [userRights, setUserRights] = useState([]);
    
    const [grantRight] = useGrantBoardRightByUsernameMutation();
    const [revokeRight] = useRevokeBoardRightByUsernameMutation();
    
    const { data: fetchedUserRights, isLoading, refetch } = useGetBoardUserRightsByUsernameQuery(
        { boardId: board?.id, username: selectedUser },
        { skip: !selectedUser || !board }
    );
    
    useEffect(() => {
        if (fetchedUserRights) {
            setUserRights(fetchedUserRights);
        }
    }, [fetchedUserRights]);
    
    const handleUserSelect = (username, e) => {
        if (e) e.stopPropagation();
        setSelectedUser(username);
    };

    const handleToggleRight = async (rightName, hasRight, e) => {
        if (e) e.stopPropagation();
        if (!selectedUser) return;
        
        try {
            if (hasRight) {
                await revokeRight({
                    boardId: board.id,
                    username: selectedUser,
                    rightName,
                }).unwrap();
            } else {
                await grantRight({
                    boardId: board.id,
                    username: selectedUser,
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
                                    key={user.username || user.id} 
                                    className={`user-item ${selectedUser === user.username ? 'selected' : ''}`}
                                    onClick={(e) => handleUserSelect(user.username, e)}
                                >
                                    <img src={user.avatarURL || Girl} alt={user.username} />
                                    <span>{user.username}</span>
                                </div>
                            ))
                        ) : (
                            <div className="no-users-message">
                                Нет участников на доске
                            </div>
                        )}
                    </div>
                </div>
                
                {selectedUser && (
                    <div className="user-rights-section">
                        <h4>Права пользователя {selectedUser}</h4>
                        
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
                                                    <div className="right-description">{RIGHT_DESCRIPTIONS[rightName]}</div>
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
                )}
                
                {!selectedUser && (
                    <div className="select-user-prompt">
                        Выберите участника для управления правами
                    </div>
                )}
            </div>
        </div>
    );
}

export default BoardPermissionsTab; 