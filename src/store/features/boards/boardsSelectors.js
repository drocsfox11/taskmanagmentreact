import { createSelector } from '@reduxjs/toolkit';

// Basic selectors
export const selectBoardsById = state => state.boards.byId;
export const selectBoardIds = state => state.boards.allIds;

// Get a specific board by ID
export const selectBoardById = (state, boardId) => state.boards.byId[boardId];

// Get all boards as an array
export const selectBoards = createSelector(
  [selectBoardsById, selectBoardIds],
  (byId, allIds) => allIds.map(id => byId[id])
);

// Get boards for a specific project
export const selectBoardsByProjectId = createSelector(
  [selectBoards, (_, projectId) => projectId],
  (boards, projectId) => boards.filter(board => board.projectId === projectId)
); 