import { useState, useEffect } from 'react';
import { 
    useGrantProjectRightMutation, 
    useRevokeProjectRightMutation, 
    useGetUserRightsQuery,
    useAddUserToAllBoardsMutation,
    useRemoveUserFromAllBoardsMutation
} from '../services/api/projectsApi';
import { PROJECT_RIGHTS, RIGHT_DESCRIPTIONS } from '../constants/rights';
import '../styles/components/ProjectPermissionsTab.css';

function ProjectPermissionsTab({ project }) {
    const [selectedUser, setSelectedUser] = useState(null);
    const [userRights, setUserRights] = useState([]);
    const [hasAccessToAllBoards, setHasAccessToAllBoards] = useState(false);
    
    const [grantRight] = useGrantProjectRightMutation();
    const [revokeRight] = useRevokeProjectRightMutation();
    const [addUserToAllBoards] = useAddUserToAllBoardsMutation();
    const [removeUserFromAllBoards] = useRemoveUserFromAllBoardsMutation();
    
    const { data: fetchedUserRights, isLoading, refetch } = useGetUserRightsQuery(
        { projectId: project?.id, username: selectedUser },
        { skip: !selectedUser }
    );
    
    useEffect(() => {
        if (fetchedUserRights) {
            setUserRights(fetchedUserRights);
            // Проверяем наличие права ACCESS_ALL_BOARDS в списке
            setHasAccessToAllBoards(fetchedUserRights.includes(PROJECT_RIGHTS.ACCESS_ALL_BOARDS));
        }
    }, [fetchedUserRights]);
    
    const handleUserSelect = (username) => {
        setSelectedUser(username);
    };

    const handleToggleRight = async (rightName, hasRight) => {
        if (!selectedUser) return;
        
        try {
            if (hasRight) {
                await revokeRight({
                    projectId: project.id,
                    username: selectedUser,
                    rightName,
                }).unwrap();
            } else {
                await grantRight({
                    projectId: project.id,
                    username: selectedUser,
                    rightName,
                }).unwrap();
            }
            
            refetch();
        } catch (error) {
            console.error("Failed to update right:", error);
        }
    };

    const handleToggleAllBoardsAccess = async (hasAccess) => {
        if (!selectedUser) return;
        
        try {
            if (hasAccess) {
                await removeUserFromAllBoards({
                    projectId: project.id,
                    username: selectedUser,
                }).unwrap();
            } else {
                await addUserToAllBoards({
                    projectId: project.id,
                    username: selectedUser,
                }).unwrap();
            }
            
            setHasAccessToAllBoards(!hasAccess);
            refetch(); // Refresh rights in case this impacts other rights
        } catch (error) {
            console.error("Failed to update board access:", error);
        }
    };

    // Фильтруем стандартные права проекта, исключая ACCESS_ALL_BOARDS
    const projectRightsToDisplay = Object.values(PROJECT_RIGHTS).filter(
        right => right !== PROJECT_RIGHTS.ACCESS_ALL_BOARDS
    );

    return (
        <div className="project-permissions-tab">
            <h3>Управление правами участников проекта</h3>
            
            <div className="permissions-container">
                <div className="select-user-section">
                    <h4>Выберите участника</h4>
                    <div className="user-list">
                        {project?.participants?.map((user) => (
                            <div 
                                key={user.username}
                                className={`user-item ${selectedUser === user.username ? 'selected' : ''}`}
                                onClick={() => handleUserSelect(user.username)}
                            >
                                <img src={user.avatarURL || user.avatar} alt={user.username} />
                                <span>{user.username}</span>
                            </div>
                        ))}
                        
                        {(!project?.participants || project?.participants.length === 0) && (
                            <div className="no-users-message">
                                Нет участников в проекте
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
                                <div className="special-rights-section">
                                    <div className="right-item special">
                                        <div className="right-info">
                                            <div className="right-name">Доступ ко всем доскам</div>
                                            <div className="right-description">
                                                {RIGHT_DESCRIPTIONS[PROJECT_RIGHTS.ACCESS_ALL_BOARDS]}
                                            </div>
                                        </div>
                                        <label className="toggle-switch">
                                            <input
                                                type="checkbox"
                                                checked={hasAccessToAllBoards}
                                                onChange={() => handleToggleAllBoardsAccess(hasAccessToAllBoards)}
                                            />
                                            <span className="toggle-slider"></span>
                                        </label>
                                    </div>
                                </div>
                                
                                <div className="rights-list-header">Права проекта</div>
                                <div className="rights-list">
                                    {projectRightsToDisplay.map((rightName) => {
                                        const hasRight = userRights.includes(rightName);
                                        return (
                                            <div key={rightName} className="right-item">
                                                <div className="right-info">
                                                    <div className="right-name">{rightName}</div>
                                                    <div className="right-description">{RIGHT_DESCRIPTIONS[rightName]}</div>
                                                </div>
                                                <label className="toggle-switch">
                                                    <input
                                                        type="checkbox"
                                                        checked={hasRight}
                                                        onChange={() => handleToggleRight(rightName, hasRight)}
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

export default ProjectPermissionsTab; 