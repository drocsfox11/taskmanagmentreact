import { useState, useEffect } from 'react';
import { 
    useGrantProjectRightMutation, 
    useRevokeProjectRightMutation, 
    useGetAllUserRightsQuery
} from '../services/api/projectsApi';
import { PROJECT_RIGHTS, PROJECT_RIGHT_DESCRIPTIONS } from '../constants/rights';
import '../styles/components/ProjectPermissionsTab.css';
import Girl from '../assets/icons/girl.svg';
import { useGetCurrentUserQuery } from '../services/api/usersApi';

function ProjectPermissionsTab({ project }) {
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [userRights, setUserRights] = useState([]);
    const [hasAccessToAllBoards, setHasAccessToAllBoards] = useState(false);
    
    const [grantRight] = useGrantProjectRightMutation();
    const [revokeRight] = useRevokeProjectRightMutation();
    
    const { data: currentUser } = useGetCurrentUserQuery();
    
    const { data: allProjectRights = {}, isLoading, refetch } = useGetAllUserRightsQuery(
        selectedUserId,
        { skip: !selectedUserId }
    );
    
    useEffect(() => {
        if (selectedUserId && project?.id && allProjectRights) {
            const projectRights = allProjectRights[project.id] || [];
            setUserRights(projectRights);
            
            setHasAccessToAllBoards(projectRights.includes(PROJECT_RIGHTS.ACCESS_ALL_BOARDS));
        }
    }, [selectedUserId, project?.id, allProjectRights]);
    
    const handleUserSelect = (userId) => {
        setSelectedUserId(userId);
    };

    const handleToggleRight = async (rightName, hasRight) => {
        if (!selectedUserId) return;
        
        if (currentUser && currentUser.id === selectedUserId) {
            console.log("Нельзя изменять собственные права доступа");
            return;
        }
        
        try {
            if (hasRight) {
                await revokeRight({
                    projectId: project.id,
                    userId: selectedUserId,
                    rightName,
                }).unwrap();
                
                setUserRights(prev => prev.filter(right => right !== rightName));
            } else {
                await grantRight({
                    projectId: project.id,
                    userId: selectedUserId,
                    rightName,
                }).unwrap();
                
                setUserRights(prev => [...prev, rightName]);
            }
            
        } catch (error) {
            console.error("Failed to update right:", error);
        }
    };

    const handleToggleAllBoardsAccess = async (hasAccess) => {
        if (!selectedUserId) return;
        
        if (currentUser && currentUser.id === selectedUserId) {
            console.log("Нельзя изменять собственные права доступа");
            return;
        }
        
        try {
            if (hasAccess) {
                await revokeRight({
                    projectId: project.id,
                    userId: selectedUserId,
                    rightName: PROJECT_RIGHTS.ACCESS_ALL_BOARDS,
                }).unwrap();
                
                setHasAccessToAllBoards(false);
                setUserRights(prev => prev.filter(right => right !== PROJECT_RIGHTS.ACCESS_ALL_BOARDS));
            } else {
                await grantRight({
                    projectId: project.id,
                    userId: selectedUserId,
                    rightName: PROJECT_RIGHTS.ACCESS_ALL_BOARDS,
                }).unwrap();
                
                setHasAccessToAllBoards(true);
                setUserRights(prev => [...prev, PROJECT_RIGHTS.ACCESS_ALL_BOARDS]);
            }
            
        } catch (error) {
            console.error("Failed to update board access:", error);
        }
    };

    const projectRightsToDisplay = Object.values(PROJECT_RIGHTS).filter(
        right => right !== PROJECT_RIGHTS.ACCESS_ALL_BOARDS
    );
    
    const isCurrentUser = currentUser && selectedUserId === currentUser.id;
    
    const isProjectOwner = selectedUserId === project?.owner?.id;

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
                                    className={`user-item ${selectedUserId === user.id ? 'selected' : ''} ${user.id === project?.owner?.id ? 'owner' : ''}`}
                                    onClick={() => handleUserSelect(user.id)}
                                >
                                    <img src={user.avatarURL || Girl} alt={user.name} />
                                    <div className="user-details">
                                        <span className="user-name">{user.name}</span>
                                        {user.id === project?.owner?.id && (
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
                                Нет участников в проекте
                            </div>
                        )}
                    </div>
                </div>
                
                {selectedUserId && (
                    <div className="user-rights-section">
                        <h4>Права пользователя {project?.participants?.find(p => p.id === selectedUserId)?.name}</h4>
                        
                        {isProjectOwner && (
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
                                                <label className={`toggle-switch ${isCurrentUser ? 'disabled' : ''}`}>
                                                    <input
                                                        type="checkbox"
                                                        checked={hasRight}
                                                        onChange={() => handleToggleRight(rightName, hasRight)}
                                                        disabled={isCurrentUser}
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
                                        <label className={`toggle-switch ${isCurrentUser ? 'disabled' : ''}`}>
                                            <input
                                                type="checkbox"
                                                checked={hasAccessToAllBoards}
                                                onChange={() => handleToggleAllBoardsAccess(hasAccessToAllBoards)}
                                                disabled={isCurrentUser}
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