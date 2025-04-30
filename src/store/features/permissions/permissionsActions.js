import { setProjectPermissions, setBoardPermissions, setLoading, setError } from './permissionsSlice';

export const fetchProjectPermissions = (projectId) => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    const response = await fetch(`/api/projects/${projectId}/permissions`);
    const data = await response.json();
    dispatch(setProjectPermissions(data));
  } catch (error) {
    dispatch(setError(error.message));
  } finally {
    dispatch(setLoading(false));
  }
};

export const fetchBoardPermissions = (boardId) => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    const response = await fetch(`/api/boards/${boardId}/permissions`);
    const data = await response.json();
    dispatch(setBoardPermissions(data));
  } catch (error) {
    dispatch(setError(error.message));
  } finally {
    dispatch(setLoading(false));
  }
};

export const updateProjectPermissions = (projectId, userId, permissions) => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    const response = await fetch(`/api/projects/${projectId}/permissions/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(permissions),
    });
    const data = await response.json();
    dispatch(setProjectPermissions(data));
  } catch (error) {
    dispatch(setError(error.message));
  } finally {
    dispatch(setLoading(false));
  }
};

export const updateBoardPermissions = (boardId, userId, permissions) => async (dispatch) => {
  try {
    dispatch(setLoading(true));
    const response = await fetch(`/api/boards/${boardId}/permissions/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(permissions),
    });
    const data = await response.json();
    dispatch(setBoardPermissions(data));
  } catch (error) {
    dispatch(setError(error.message));
  } finally {
    dispatch(setLoading(false));
  }
}; 