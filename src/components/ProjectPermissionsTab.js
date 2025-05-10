import { useState, useEffect } from 'react';
import { 
    useGrantProjectRightMutation, 
    useRevokeProjectRightMutation, 
    useGetUserRightsQuery
} from '../services/api/projectsApi';
import { PROJECT_RIGHTS, PROJECT_RIGHT_DESCRIPTIONS } from '../constants/rights';
import '../styles/components/ProjectPermissionsTab.css';
import Girl from '../assets/icons/girl.svg';

function ProjectPermissionsTab({ project }) {
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [userRights, setUserRights] = useState([]);
    const [hasAccessToAllBoards, setHasAccessToAllBoards] = useState(false);
    
    const [grantRight] = useGrantProjectRightMutation();
    const [revokeRight] = useRevokeProjectRightMutation();
    
    const { data: fetchedUserRights, isLoading, refetch } = useGetUserRightsQuery(
        { projectId: project?.id, userId: selectedUserId },
        { skip: !selectedUserId }
    );
    
    useEffect(() => {
        if (fetchedUserRights) {
            setUserRights(fetchedUserRights);
            // Проверяем наличие права ACCESS_ALL_BOARDS в списке
            setHasAccessToAllBoards(fetchedUserRights.includes(PROJECT_RIGHTS.ACCESS_ALL_BOARDS));
        }
    }, [fetchedUserRights]);
    
    const handleUserSelect = (userId) => {
        setSelectedUserId(userId);
    };

    const handleToggleRight = async (rightName, hasRight) => {
        if (!selectedUserId) return;
        
        try {
            if (hasRight) {
                await revokeRight({
                    projectId: project.id,
                    userId: selectedUserId,
                    rightName,
                }).unwrap();
            } else {
                await grantRight({
                    projectId: project.id,
                    userId: selectedUserId,
                    rightName,
                }).unwrap();
            }
            
            refetch();
        } catch (error) {
            console.error("Failed to update right:", error);
        }
    };

    const handleToggleAllBoardsAccess = async (hasAccess) => {
        if (!selectedUserId) return;
        
        try {
            if (hasAccess) {
                await revokeRight({
                    projectId: project.id,
                    userId: selectedUserId,
                    rightName: PROJECT_RIGHTS.ACCESS_ALL_BOARDS,
                }).unwrap();
            } else {
                await grantRight({
                    projectId: project.id,
                    userId: selectedUserId,
                    rightName: PROJECT_RIGHTS.ACCESS_ALL_BOARDS,
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
            <h3>Управление правами проекта</h3>
            
            <div className="permissions-container">
                <div className="select-user-section">
                    <h4>Выберите участника</h4>
                    <div className="user-list">
                        {project?.participants && project.participants.length > 0 ? (
                            project.participants.map((user) => (
                                <div 
                                    key={user.id} 
                                    className={`user-item ${selectedUserId === user.id ? 'selected' : ''}`}
                                    onClick={() => handleUserSelect(user.id)}
                                >
                                    <img src={user.avatarURL || Girl} alt={user.name} />
                                    <span>{user.name}</span>
                                </div>
                            ))
                        ) : (
                            <div className="no-users-message">
                                Нет участников в проекте
                            </div>
                        )}
                    </div>
                </div>
                
                {selectedUserId && (
                    <div className="user-rights-section">
                        <h4>Права пользователя {project?.participants?.find(p => p.id === selectedUserId)?.name}</h4>
                        
                        {isLoading ? (
                            <div className="loading-rights">Загрузка прав...</div>
                        ) : (
                            <>
                                <div className="rights-list-header">Права проекта</div>
                                <div className="rights-list">
                                    {projectRightsToDisplay.map((rightName) => {
                                        const hasRight = userRights.includes(rightName);
                                        return (
                                            <div key={rightName} className="right-item">
                                                <div className="right-info">
                                                    <div className="right-name">{rightName}</div>
                                                    <div className="right-description">{PROJECT_RIGHT_DESCRIPTIONS[rightName]}</div>
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
                                
                                <div className="all-boards-access-section">
                                    <h4>Доступ ко всем доскам</h4>
                                    <div className="right-item">
                                        <div className="right-info">
                                            <div className="right-name">Доступ ко всем доскам</div>
                                            <div className="right-description">
                                                Предоставляет доступ ко всем доскам проекта
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
                            </>
                        )}
                    </div>
                )}
                
                {!selectedUserId && (
                    <div className="select-user-prompt">
                        Выберите участника для управления правами
                    </div>
                )}
            </div>
        </div>
    );
}

export default ProjectPermissionsTab; 