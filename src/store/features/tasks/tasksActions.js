import { createAction } from '@reduxjs/toolkit';

export const fetchTasksByBoardRequest = createAction('tasks/fetchTasksByBoardRequest');
export const fetchTasksByBoardSuccess = createAction('tasks/fetchTasksByBoardSuccess');
export const fetchTasksByBoardFailure = createAction('tasks/fetchTasksByBoardFailure');

export const createTaskRequest = createAction('tasks/createTaskRequest');
export const createTaskSuccess = createAction('tasks/createTaskSuccess');
export const createTaskFailure = createAction('tasks/createTaskFailure');

export const updateTaskRequest = createAction('tasks/updateTaskRequest');
export const updateTaskSuccess = createAction('tasks/updateTaskSuccess');
export const updateTaskFailure = createAction('tasks/updateTaskFailure');

export const deleteTaskRequest = createAction('tasks/deleteTaskRequest');
export const deleteTaskSuccess = createAction('tasks/deleteTaskSuccess');
export const deleteTaskFailure = createAction('tasks/deleteTaskFailure');

export const moveTaskRequest = createAction('tasks/moveTaskRequest');

export const uploadAttachmentRequest = createAction('tasks/uploadAttachmentRequest');

export const reorderTasksRequest = createAction('tasks/reorderTasksRequest'); 