import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProjectPermissions, updateProjectPermissions } from '../store/features/permissions/permissionsActions';
import '../styles/components/ProjectPermissionsManager.css';

const ProjectPermissionsManager = ({ projectId, userId }) => {
  const dispatch = useDispatch();
  const { projectPermissions, loading, error } = useSelector((state) => state.permissions);
  const [localPermissions, setLocalPermissions] = useState({});

  useEffect(() => {
    dispatch(fetchProjectPermissions(projectId));
  }, [dispatch, projectId]);

  useEffect(() => {
    setLocalPermissions(projectPermissions);
  }, [projectPermissions]);

  const handlePermissionChange = (permission) => {
    setLocalPermissions((prev) => ({
      ...prev,
      [permission]: !prev[permission],
    }));
  };

  const handleSave = () => {
    dispatch(updateProjectPermissions(projectId, userId, localPermissions));
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="permissions-manager">
      <h3>Project Permissions</h3>
      <div className="permissions-list">
        <div className="permission-item">
          <input
            type="checkbox"
            id="UPDATE_PROJECT"
            checked={localPermissions.UPDATE_PROJECT}
            onChange={() => handlePermissionChange('UPDATE_PROJECT')}
          />
          <label htmlFor="UPDATE_PROJECT">Update Project</label>
        </div>
        <div className="permission-item">
          <input
            type="checkbox"
            id="MANAGE_PROJECT_PARTICIPANTS"
            checked={localPermissions.MANAGE_PROJECT_PARTICIPANTS}
            onChange={() => handlePermissionChange('MANAGE_PROJECT_PARTICIPANTS')}
          />
          <label htmlFor="MANAGE_PROJECT_PARTICIPANTS">Manage Project Participants</label>
        </div>
      </div>
      <button onClick={handleSave} className="save-button">
        Save Permissions
      </button>
    </div>
  );
};

export default ProjectPermissionsManager; 