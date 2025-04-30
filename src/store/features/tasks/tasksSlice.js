import { createSlice } from '@reduxjs/toolkit';
import {
  fetchTasksByBoardSuccess,
  createTaskSuccess,
  updateTaskSuccess,
  deleteTaskSuccess,
} from './tasksActions';

const initialState = {
  byId: {},
  byColumnId: {},
  byBoardId: {},
  allIds: [],
};

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    reorderTasksOptimistic: (state, action) => {
      const { columnId, newOrder } = action.payload;
      state.byColumnId[columnId] = [...newOrder];
    },
    resetTasksOrder: (state, action) => {
      const { columnId, prevOrder } = action.payload;
      state.byColumnId[columnId] = [...prevOrder];
    },
    moveTaskOptimistic: (state, action) => {
      const { taskId, sourceColumnId, destColumnId, destIndex } = action.payload;
      console.log('moveTaskOptimistic:', { taskId, sourceColumnId, destColumnId, destIndex });
      
      // Удаляем из старой колонки
      if (state.byColumnId[sourceColumnId]) {
        console.log('Removing task from source column:', sourceColumnId);
        console.log('Column before:', state.byColumnId[sourceColumnId]);
        state.byColumnId[sourceColumnId] = state.byColumnId[sourceColumnId].filter(id => String(id) !== String(taskId));
        console.log('Column after:', state.byColumnId[sourceColumnId]);
      }
      
      // Вставляем в новую колонку
      if (!state.byColumnId[destColumnId]) {
        state.byColumnId[destColumnId] = [];
      }
      console.log('Adding task to destination column:', destColumnId);
      console.log('Column before:', state.byColumnId[destColumnId]);
      state.byColumnId[destColumnId].splice(destIndex, 0, taskId);
      console.log('Column after:', state.byColumnId[destColumnId]);
      
      // Обновляем columnId у задачи
      if (state.byId[taskId]) {
        console.log('Updating task columnId from', state.byId[taskId].columnId, 'to', destColumnId);
        state.byId[taskId].columnId = destColumnId;
      } else {
        console.error('Task not found in byId:', taskId);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasksByBoardSuccess, (state, action) => {
        const tasks = action.payload;
        console.log('Redux: Получены задачи от сервера:', tasks);
        
        let boardId = null;
        
        // Reset for this board's data
        if (tasks.length > 0) {
          boardId = tasks[0].boardId;
          console.log('Redux: Найден boardId для задач:', boardId);
          
          // Полностью сбрасываем данные для этой доски
          state.byBoardId[boardId] = [];
          
          // Очищаем задачи в колонках, относящихся к этой доске
          Object.keys(state.byColumnId).forEach(columnId => {
            const columnTasks = state.byColumnId[columnId];
            if (columnTasks && columnTasks.length > 0) {
              const firstTask = state.byId[columnTasks[0]];
              if (firstTask && firstTask.boardId === boardId) {
                state.byColumnId[columnId] = [];
              }
            }
          });
          
          // Удаляем задачи этой доски из byId и allIds
          const tasksToRemove = Object.values(state.byId)
            .filter(task => task.boardId === boardId)
            .map(task => task.id);
          
          tasksToRemove.forEach(taskId => {
            delete state.byId[taskId];
          });
          
          state.allIds = state.allIds.filter(id => !tasksToRemove.includes(id));
        }
        
        // Add tasks to state
        tasks.forEach(task => {
          if (!task.id) {
            console.error('Redux: Задача без ID!', task);
            return;
          }
          
          if (!task.columnId) {
            console.error('Redux: Задача без ID колонки!', task);
            return;
          }
          
          // Сохраняем задачу по ID
          state.byId[task.id] = task;
          
          // Добавляем в общий список ID
          if (!state.allIds.includes(task.id)) {
            state.allIds.push(task.id);
          }
          
          // Add to board mapping
          if (boardId && !state.byBoardId[boardId]?.includes(task.id)) {
            if (!state.byBoardId[boardId]) {
              state.byBoardId[boardId] = [];
            }
            state.byBoardId[boardId].push(task.id);
          }
          
          // Add to column mapping
          const columnId = task.columnId;
          console.log(`Redux: Добавление задачи ${task.id} в колонку ${columnId}`);
          
          if (!state.byColumnId[columnId]) {
            state.byColumnId[columnId] = [];
          }
          if (!state.byColumnId[columnId].includes(task.id)) {
            state.byColumnId[columnId].push(task.id);
          }
        });
        
        console.log('Redux: Состояние после обновления:', {
          byId: state.byId,
          byColumnId: state.byColumnId,
          byBoardId: state.byBoardId,
          allIds: state.allIds
        });
      })
      .addCase(createTaskSuccess, (state, action) => {
        const task = action.payload;
        
        // Проверка наличия необходимых полей
        if (!task || !task.id) {
          console.error('Ошибка: задача без ID', task);
          return;
        }
        
        console.log('Обработка новой задачи в Redux:', task);
        
        // Гарантируем, что необходимые поля существуют
        const processedTask = {
          ...task,
          checklist: Array.isArray(task.checklist) ? task.checklist : [],
          participants: Array.isArray(task.participants) ? task.participants : [],
          startDate: task.startDate || null,
          endDate: task.endDate || null
        };
        
        state.byId[task.id] = processedTask;
        
        if (!state.allIds.includes(task.id)) {
          state.allIds.push(task.id);
        }
        
        // Add to board mapping
        if (!state.byBoardId[task.boardId]) {
          state.byBoardId[task.boardId] = [];
        }
        if (!state.byBoardId[task.boardId].includes(task.id)) {
          state.byBoardId[task.boardId].push(task.id);
        }
        
        // Add to column mapping
        if (!state.byColumnId[task.columnId]) {
          state.byColumnId[task.columnId] = [];
        }
        if (!state.byColumnId[task.columnId].includes(task.id)) {
          state.byColumnId[task.columnId].push(task.id);
        }
        
        console.log('Задача добавлена в Redux:', processedTask);
      })
      .addCase(updateTaskSuccess, (state, action) => {
        const task = action.payload;
        
        // Проверка наличия необходимых полей
        if (!task || !task.id) {
          console.error('Ошибка: обновляемая задача без ID', task);
          return;
        }
        
        console.log('Обработка обновленной задачи в Redux:', task);
        
        const oldTask = state.byId[task.id];
        
        // Гарантируем, что необходимые поля существуют
        const processedTask = {
          ...task,
          checklist: Array.isArray(task.checklist) ? task.checklist : [],
          participants: Array.isArray(task.participants) ? task.participants : [],
          startDate: task.startDate || null,
          endDate: task.endDate || null
        };
        
        // Handle column change
        if (oldTask && oldTask.columnId !== task.columnId) {
          console.log(`Задача перемещена из колонки ${oldTask.columnId} в колонку ${task.columnId}`);
          
          // Remove from old column
          if (oldTask.columnId && state.byColumnId[oldTask.columnId]) {
            state.byColumnId[oldTask.columnId] = state.byColumnId[oldTask.columnId]
              .filter(id => id !== task.id);
          }
          
          // Add to new column
          if (!state.byColumnId[task.columnId]) {
            state.byColumnId[task.columnId] = [];
          }
          if (!state.byColumnId[task.columnId].includes(task.id)) {
            state.byColumnId[task.columnId].push(task.id);
          }
        }
        
        // Handle board change (редко, но возможно)
        if (oldTask && oldTask.boardId !== task.boardId) {
          console.log(`Задача перемещена из доски ${oldTask.boardId} в доску ${task.boardId}`);
          
          // Remove from old board
          if (oldTask.boardId && state.byBoardId[oldTask.boardId]) {
            state.byBoardId[oldTask.boardId] = state.byBoardId[oldTask.boardId]
              .filter(id => id !== task.id);
          }
          
          // Add to new board
          if (!state.byBoardId[task.boardId]) {
            state.byBoardId[task.boardId] = [];
          }
          if (!state.byBoardId[task.boardId].includes(task.id)) {
            state.byBoardId[task.boardId].push(task.id);
          }
        }
        
        // Если задачи нет в общем списке, добавляем
        if (!state.allIds.includes(task.id)) {
          state.allIds.push(task.id);
        }
        
        // Если задачи нет в колонке, добавляем
        if (task.columnId && !state.byColumnId[task.columnId]?.includes(task.id)) {
          if (!state.byColumnId[task.columnId]) {
            state.byColumnId[task.columnId] = [];
          }
          state.byColumnId[task.columnId].push(task.id);
        }
        
        // Если задачи нет в доске, добавляем
        if (task.boardId && !state.byBoardId[task.boardId]?.includes(task.id)) {
          if (!state.byBoardId[task.boardId]) {
            state.byBoardId[task.boardId] = [];
          }
          state.byBoardId[task.boardId].push(task.id);
        }
        
        // Update task in store
        state.byId[task.id] = processedTask;
        console.log('Задача обновлена в Redux:', processedTask);
      })
      .addCase(deleteTaskSuccess, (state, action) => {
        const taskId = action.payload;
        const task = state.byId[taskId];
        
        if (task) {
          // Remove from column mapping
          if (state.byColumnId[task.columnId]) {
            state.byColumnId[task.columnId] = state.byColumnId[task.columnId]
              .filter(id => id !== taskId);
          }
          
          // Remove from board mapping
          if (state.byBoardId[task.boardId]) {
            state.byBoardId[task.boardId] = state.byBoardId[task.boardId]
              .filter(id => id !== taskId);
          }
          
          // Remove from allIds
          state.allIds = state.allIds.filter(id => id !== taskId);
          
          // Remove task itself
          delete state.byId[taskId];
        }
      });
  }
});

export default tasksSlice.reducer;
export const { reorderTasksOptimistic, resetTasksOrder, moveTaskOptimistic } = tasksSlice.actions; 