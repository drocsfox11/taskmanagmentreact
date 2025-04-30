import { createAction } from '@reduxjs/toolkit';

export const fetchBoardsByProjectRequest = createAction('boards/fetchBoardsByProjectRequest');
export const createBoardRequest = createAction('boards/createBoardRequest');
export const updateBoardRequest = createAction('boards/updateBoardRequest');
export const updateBoardFailure = createAction('boards/updateBoardFailure');
export const deleteBoardRequest = createAction('boards/deleteBoardRequest'); 