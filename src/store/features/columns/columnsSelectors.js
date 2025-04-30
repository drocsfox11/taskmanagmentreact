import { createSelector } from '@reduxjs/toolkit';

// Basic selectors
export const selectColumnsById = state => state.columns.byId;
export const selectColumnsByBoardId = state => state.columns.byBoardId;
export const selectAllColumnsIds = state => state.columns.allIds;

// Select a single column by id
export const selectColumnById = (state, columnId) => state.columns.byId[columnId];

// Select all columns for a specific board
export const selectColumnsForBoard = createSelector(
  [selectColumnsById, selectColumnsByBoardId, (_, boardId) => boardId],
  (columnsById, columnsByBoardId, boardId) => {
    console.log('Селектор columnsForBoard: boardId =', boardId, 'columnsByBoardId =', columnsByBoardId);
    // Проверяем, есть ли данные для этой доски
    if (!boardId) {
      console.warn('boardId не определен в селекторе!');
      return [];
    }
    
    const boardColumnIds = columnsByBoardId[boardId] || [];
    console.log('Найдены ID колонок для доски:', boardColumnIds);
    
    // Проверим, все ли колонки есть в byId
    const result = boardColumnIds.map(id => {
      const column = columnsById[id];
      if (!column) {
        console.warn(`Колонка с ID ${id} не найдена в хранилище!`);
      }
      return column;
    }).filter(Boolean); // Фильтруем undefined
    
    console.log('Колонки, отправляемые в компонент:', result);
    return result;
  }
);

// Select column count for a board
export const selectColumnCountForBoard = createSelector(
  [selectColumnsByBoardId, (_, boardId) => boardId],
  (columnsByBoardId, boardId) => {
    return (columnsByBoardId[boardId] || []).length;
  }
); 