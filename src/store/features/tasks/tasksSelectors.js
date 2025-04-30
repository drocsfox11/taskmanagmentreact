import { createSelector } from '@reduxjs/toolkit';

// Basic selectors
export const selectTasksById = state => state.tasks.byId;
export const selectTasksByColumnId = state => state.tasks.byColumnId;
export const selectTasksByBoardId = state => state.tasks.byBoardId;
export const selectAllTasksIds = state => state.tasks.allIds;

// Select a single task by id
export const selectTaskById = (state, taskId) => state.tasks.byId[taskId];

// Select all tasks from a specific column
export const selectTasksForColumn = createSelector(
  [selectTasksById, selectTasksByColumnId, (_, columnId) => columnId],
  (tasksById, tasksByColumnId, columnId) => {
    console.log("Селектор задач для колонки. ID колонки:", columnId);
    console.log("Структура tasksByColumnId:", tasksByColumnId);
    console.log("Доступные ID задач в колонке:", tasksByColumnId[columnId]);
    
    if (!columnId) {
      console.warn("ID колонки не определен в селекторе!");
      return [];
    }
    
    const columnTaskIds = tasksByColumnId[columnId] || [];
    console.log("ID задач для колонки:", columnTaskIds);
    
    const tasks = columnTaskIds.map(id => {
      const task = tasksById[id];
      if (!task) {
        console.warn(`Задача с ID ${id} не найдена в хранилище!`);
      }
      return task;
    }).filter(Boolean);
    
    console.log("Итоговые задачи для колонки:", tasks);
    return tasks;
  }
);

// Select all tasks from a specific board
export const selectTasksForBoard = createSelector(
  [selectTasksById, selectTasksByBoardId, (_, boardId) => boardId],
  (tasksById, tasksByBoardId, boardId) => {
    const boardTaskIds = tasksByBoardId[boardId] || [];
    return boardTaskIds.map(id => tasksById[id]);
  }
);

// Select task count by column
export const selectTaskCountForColumn = createSelector(
  [selectTasksByColumnId, (_, columnId) => columnId],
  (tasksByColumnId, columnId) => {
    return (tasksByColumnId[columnId] || []).length;
  }
);

// Select task count by board
export const selectTaskCountForBoard = createSelector(
  [selectTasksByBoardId, (_, boardId) => boardId],
  (tasksByBoardId, boardId) => {
    return (tasksByBoardId[boardId] || []).length;
  }
); 