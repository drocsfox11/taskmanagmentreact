import { createSlice } from '@reduxjs/toolkit';
import {
  fetchColumnsByBoardSuccess,
  createColumnSuccess,
  updateColumnSuccess,
  deleteColumnSuccess,
} from './columnsActions';

const initialState = {
  byId: {},
  byBoardId: {},
  allIds: []
};

const columnsSlice = createSlice({
  name: 'columns',
  initialState,
  reducers: {
    reorderColumns: (state, action) => {
      const { boardId, sourceIndex, destinationIndex } = action.payload;
      if (state.byBoardId[boardId]) {
        const [removed] = state.byBoardId[boardId].splice(sourceIndex, 1);
        state.byBoardId[boardId].splice(destinationIndex, 0, removed);
      }
    },
    reorderColumnsOptimistic: (state, action) => {
      const { boardId, newOrder } = action.payload;
      if (state.byBoardId[boardId]) {
        state.byBoardId[boardId] = [...newOrder];
      }
    },
    resetColumnsOrder: (state, action) => {
      const { boardId, prevOrder } = action.payload;
      if (state.byBoardId[boardId]) {
        state.byBoardId[boardId] = [...prevOrder];
      }
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchColumnsByBoardSuccess, (state, action) => {
        const columns = action.payload;
        console.log('Колонки в reducer:', columns);
        
        // Получить boardId из первой колонки или параметра запроса
        let boardId = null;
        
        if (columns.length > 0) {
          // Теперь boardId напрямую доступен в колонке
          boardId = columns[0].boardId;
          console.log('Найден boardId:', boardId);
          
          // Если boardId существует, полностью очистить состояние для этой доски
          if (boardId) {
            // Очищаем отображение по ID доски
            state.byBoardId[boardId] = [];
            
            // Удаляем колонки этой доски из основных хранилищ
            const columnsToRemove = Object.values(state.byId)
              .filter(col => col.boardId === boardId)
              .map(col => col.id);
              
            columnsToRemove.forEach(colId => {
              delete state.byId[colId];
            });
            
            state.allIds = state.allIds.filter(id => !columnsToRemove.includes(id));
          }
        }
        
        // Добавить колонки в состояние
        columns.forEach(column => {
          // Убедимся, что у колонки есть boardId
          if (!column.boardId && boardId) {
            column.boardId = boardId;
          }
          
          // Сохраняем колонку по ID
          state.byId[column.id] = column;
          
          // Добавляем ID в список всех ID, если его еще нет
          if (!state.allIds.includes(column.id)) {
            state.allIds.push(column.id);
          }
          
          // Добавляем в отображение по ID доски
          const colBoardId = column.boardId;
          if (colBoardId) {
            if (!state.byBoardId[colBoardId]) {
              state.byBoardId[colBoardId] = [];
            }
            if (!state.byBoardId[colBoardId].includes(column.id)) {
              state.byBoardId[colBoardId].push(column.id);
            }
          }
        });
      })
      .addCase(createColumnSuccess, (state, action) => {
        const column = action.payload;
        const columnBoardId = column.boardId;
        
        state.byId[column.id] = column;
        
        if (!state.allIds.includes(column.id)) {
          state.allIds.push(column.id);
        }
        
        // Добавляем связь с доской
        if (columnBoardId) {
          if (!state.byBoardId[columnBoardId]) {
            state.byBoardId[columnBoardId] = [];
          }
          if (!state.byBoardId[columnBoardId].includes(column.id)) {
            state.byBoardId[columnBoardId].push(column.id);
          }
        }
      })
      .addCase(updateColumnSuccess, (state, action) => {
        const column = action.payload;
        state.byId[column.id] = column;
      })
      .addCase(deleteColumnSuccess, (state, action) => {
        const columnId = action.payload;
        const column = state.byId[columnId];
        
        if (column) {
          // Удаляем из связи с доской
          const boardId = column.boardId;
          if (boardId && state.byBoardId[boardId]) {
            state.byBoardId[boardId] = state.byBoardId[boardId]
              .filter(id => id !== columnId);
          }
          
          // Удаляем из списка всех ID
          state.allIds = state.allIds.filter(id => id !== columnId);
          
          // Удаляем саму колонку
          delete state.byId[columnId];
        }
      });
  }
});

export const { reorderColumns, reorderColumnsOptimistic, resetColumnsOrder } = columnsSlice.actions;
export default columnsSlice.reducer; 