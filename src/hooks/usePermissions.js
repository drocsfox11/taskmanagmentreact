import { useSelector } from 'react-redux';

export const usePermissions = () => {
  const { projectPermissions, boardPermissions } = useSelector((state) => state.permissions);

  const hasProjectPermission = (permission) => {
    return projectPermissions[permission] || false;
  };

  const hasBoardPermission = (permission) => {
    return boardPermissions[permission] || false;
  };

  const canUpdateProject = () => hasProjectPermission('UPDATE_PROJECT');
  const canManageProjectParticipants = () => hasProjectPermission('MANAGE_PROJECT_PARTICIPANTS');

  const canUpdateBoard = () => hasBoardPermission('UPDATE_BOARD');
  const canManageBoardParticipants = () => hasBoardPermission('MANAGE_BOARD_PARTICIPANTS');
  const canManageBoardTags = () => hasBoardPermission('MANAGE_BOARD_TAGS');
  const canCreateTask = () => hasBoardPermission('CREATE_TASK');
  const canUpdateTask = () => hasBoardPermission('UPDATE_TASK');
  const canDeleteTask = () => hasBoardPermission('DELETE_TASK');
  const canManageTaskColumn = () => hasBoardPermission('MANAGE_TASK_COLUMN');
  const canMoveTask = () => hasBoardPermission('MOVE_TASK');
  const canUpdateTaskStatus = () => hasBoardPermission('UPDATE_TASK_STATUS');

  return {
    hasProjectPermission,
    hasBoardPermission,
    canUpdateProject,
    canManageProjectParticipants,
    canUpdateBoard,
    canManageBoardParticipants,
    canManageBoardTags,
    canCreateTask,
    canUpdateTask,
    canDeleteTask,
    canManageTaskColumn,
    canMoveTask,
    canUpdateTaskStatus,
  };
}; 