import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBoardPermissions, updateBoardPermissions } from '../store/features/permissions/permissionsActions';
import '../styles/components/BoardPermissionsManager.css';

const BoardPermissionsManager = ({ boardId, userId }) => {
  const dispatch = useDispatch();
  const { boardPermissions, loading, error } = useSelector((state) => state.permissions);
  const [localPermissions, setLocalPermissions] = useState({});

  useEffect(() => {
    dispatch(fetchBoardPermissions(boardId));
  }, [dispatch, boardId]);

  useEffect(() => {
    setLocalPermissions(boardPermissions);
  }, [boardPermissions]);

  const handlePermissionChange = (permission) => {
    setLocalPermissions((prev) => ({
      ...prev,
      [permission]: !prev[permission],
    }));
  };

  const handleSave = () => {
    dispatch(updateBoardPermissions(boardId, userId, localPermissions));
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="permissions-manager">
      <h3>Board Permissions</h3>
      <div className="permissions-list">
        <div className="permission-item">
          <input
            type="checkbox"
            id="UPDATE_BOARD"
            checked={localPermissions.UPDATE_BOARD}
            onChange={() => handlePermissionChange('UPDATE_BOARD')}
          />
          <label htmlFor="UPDATE_BOARD">Update Board</label>
        </div>
        <div className="permission-item">
          <input
            type="checkbox"
            id="MANAGE_BOARD_PARTICIPANTS"
            checked={localPermissions.MANAGE_BOARD_PARTICIPANTS}
            onChange={() => handlePermissionChange('MANAGE_BOARD_PARTICIPANTS')}
          />
          <label htmlFor="MANAGE_BOARD_PARTICIPANTS">Manage Board Participants</label>
        </div>
        <div className="permission-item">
          <input
            type="checkbox"
            id="MANAGE_BOARD_TAGS"
            checked={localPermissions.MANAGE_BOARD_TAGS}
            onChange={() => handlePermissionChange('MANAGE_BOARD_TAGS')}
          />
          <label htmlFor="MANAGE_BOARD_TAGS">Manage Board Tags</label>
        </div>
        <div className="permission-item">
          <input
            type="checkbox"
            id="CREATE_TASK"
            checked={localPermissions.CREATE_TASK}
            onChange={() => handlePermissionChange('CREATE_TASK')}
          />
          <label htmlFor="CREATE_TASK">Create Tasks</label>
        </div>
        <div className="permission-item">
          <input
            type="checkbox"
            id="UPDATE_TASK"
            checked={localPermissions.UPDATE_TASK}
            onChange={() => handlePermissionChange('UPDATE_TASK')}
          />
          <label htmlFor="UPDATE_TASK">Update Tasks</label>
        </div>
        <div className="permission-item">
          <input
            type="checkbox"
            id="DELETE_TASK"
            checked={localPermissions.DELETE_TASK}
            onChange={() => handlePermissionChange('DELETE_TASK')}
          />
          <label htmlFor="DELETE_TASK">Delete Tasks</label>
        </div>
        <div className="permission-item">
          <input
            type="checkbox"
            id="MANAGE_TASK_COLUMN"
            checked={localPermissions.MANAGE_TASK_COLUMN}
            onChange={() => handlePermissionChange('MANAGE_TASK_COLUMN')}
          />
          <label htmlFor="MANAGE_TASK_COLUMN">Manage Task Columns</label>
        </div>
        <div className="permission-item">
          <input
            type="checkbox"
            id="MOVE_TASK"
            checked={localPermissions.MOVE_TASK}
            onChange={() => handlePermissionChange('MOVE_TASK')}
          />
          <label htmlFor="MOVE_TASK">Move Tasks</label>
        </div>
        <div className="permission-item">
          <input
            type="checkbox"
            id="UPDATE_TASK_STATUS"
            checked={localPermissions.UPDATE_TASK_STATUS}
            onChange={() => handlePermissionChange('UPDATE_TASK_STATUS')}
          />
          <label htmlFor="UPDATE_TASK_STATUS">Update Task Status</label>
        </div>
      </div>
      <button onClick={handleSave} className="save-button">
        Save Permissions
      </button>
    </div>
  );
};

export default BoardPermissionsManager; 