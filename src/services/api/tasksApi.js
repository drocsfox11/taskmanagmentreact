import { baseApi } from './baseApi';



/**
 * @deprecated Используйте вместо этого соответствующие хуки из boardsApi.js
 * ВАЖНО: Эти хуки теперь экспортируются из boardsApi.js и не должны использоваться напрямую отсюда
 * Для получения задач используйте результат из запроса board/full
 */
export const tasksApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTasks: builder.query({
      query: (boardId) => `boards/${boardId}/tasks`,
      providesTags: ['Tasks'],
    }),
    getTask: builder.query({
      query: (taskId) => ({url: `tasks/${taskId}`}),
      providesTags: (result, error, id) => [{ type: 'Tasks', id }],
    }),
    getTasksByColumn: builder.query({
      query: (columnId) => `columns/${columnId}/tasks`,
      providesTags: (result, error, id) => [
        { type: 'Tasks', id: `column-${id}` },
      ],
    }),
    createTask: builder.mutation({
      query: (task) => ({
        url: 'api/tasks',
        method: 'POST',
        body: task,
      }),
      async onQueryStarted(task, { dispatch, queryFulfilled }) {
        // Генерируем временный ID для оптимистичного обновления
        const tempId = `temp-${Date.now()}`;

        try {
          // Ждем ответа от сервера вместо оптимистичного обновления
          const { data: createdTask } = await queryFulfilled;

          // Добавляем задачу только после получения ответа от сервера
          dispatch(
            baseApi.util.updateQueryData('getBoardWithData', task.boardId, (draft) => {
              const column = draft.columns.find(col => col.id === task.columnId);
              if (column) {
                // Проверяем, не существует ли уже задача с таким ID
                const existingTaskIndex = column.tasks.findIndex(t => t.id === createdTask.id);
                if (existingTaskIndex === -1) {
                  column.tasks.push(createdTask);
                  // Обновляем позиции
                  column.tasks.forEach((t, index) => {
                    t.position = index;
                  });
                }
              }
            })
          );
        } catch (error) {
          console.error('Failed to create task:', error);
        }
      },
      invalidatesTags: (result, error, { boardId }) => [
        { type: 'Board', id: boardId },
        'Tasks'
      ],
    }),
    updateTask: builder.mutation({
      query: ({ id, ...updates }) => ({
        url: `api/tasks/${id}`,
        method: 'PUT',
        body: updates,
      }),
      async onQueryStarted({ id, boardId, columnId, ...updates }, { dispatch, queryFulfilled }) {
        console.log(`Optimistically updating task ${id} in column ${columnId}, board ${boardId}`);
        
        // Сохраняем копию обновлений для отладки
        console.log('Task updates:', updates);
        
        // Оптимистично обновляем UI
        const patchResult = dispatch(
            baseApi.util.updateQueryData('getBoardWithData', boardId, (draft) => {
              // Ищем задачу во всех колонках, так как она могла переместиться
              let foundTask = false;
              draft.columns.forEach(column => {
                const taskIndex = column.tasks.findIndex(t => t.id === id);
                if (taskIndex !== -1) {
                  foundTask = true;
                  console.log(`Found task ${id} in column ${column.id}`);
                  
                  // Обновляем задачу, сохраняя исходный id и position
                  const taskId = column.tasks[taskIndex].id;
                  const taskPosition = column.tasks[taskIndex].position;
                  
                  // Создаем новый объект вместо мутации существующего
                  const updatedTask = { 
                    ...column.tasks[taskIndex], 
                    ...updates,
                    id: taskId, // Явно восстанавливаем id
                    position: taskPosition // Сохраняем position
                  };
                  
                  // Заменяем существующую задачу новой
                  column.tasks[taskIndex] = updatedTask;
                }
              });
              
              if (!foundTask) {
                console.warn(`Task ${id} not found in any column of board ${boardId}`);
              }
            })
        );

        try {
          // Ждем ответа от сервера
          const result = await queryFulfilled;
          console.log(`Server response for task ${id} update:`, result);
        } catch (error) {
          // В случае ошибки откатываем изменения
          console.error(`Error updating task ${id}:`, error);
          patchResult.undo();
        }
      },
      invalidatesTags: (result, error, { boardId }) => [
        { type: 'Board', id: boardId },
        'Tasks'
      ],
    }),
    deleteTask: builder.mutation({
      query: (params) => {
        // Handle both object format {id, boardId} and direct taskId number format
        const taskId = typeof params === 'object' ? params.id : params;
        return {
          url: `api/tasks/${taskId}`,
          method: 'DELETE',
          // Add socketEvent parameter to ensure WebSocket notifications are sent
          params: { socketEvent: true },
        };
      },
      async onQueryStarted(params, { dispatch, queryFulfilled }) {
        // Extract the id and boardId from params
        const id = typeof params === 'object' ? params.id : params;
        const boardId = typeof params === 'object' ? params.boardId : undefined;
        
        // Skip optimistic update if boardId is not available
        if (!boardId) return;
        
        console.log(`Starting optimistic update for task deletion: Task ${id} from board ${boardId}`);
        
        const patchResult = dispatch(
            baseApi.util.updateQueryData('getBoardWithData', boardId, (draft) => {
              draft.columns.forEach(column => {
                const taskIndex = column.tasks.findIndex(t => t.id === id);
                if (taskIndex !== -1) {
                  column.tasks.splice(taskIndex, 1);
                  column.tasks.forEach((task, index) => {
                    task.position = index;
                  });
                  console.log(`Optimistically removed task ${id} from column ${column.id}`);
                }
              });
            })
        );

        try {
          await queryFulfilled;
          console.log(`Task ${id} deleted successfully`);
          
          // Force refresh the board data after successful deletion
          // This is the part that ensures UI is updated without page reload
          dispatch(baseApi.util.invalidateTags([
            { type: 'Board', id: boardId },
            { type: 'Tasks' }
          ]));
        } catch (error) {
          console.error(`Error deleting task ${id}:`, error);
          patchResult.undo();
        }
      },
      // Additional invalidation - ensure we're properly formatting the invalidation tags
      invalidatesTags: (result, error, params) => {
        // Extract boardId properly regardless of param format
        const boardId = typeof params === 'object' ? params.boardId : undefined;
        return [
          { type: 'Tasks' },
          boardId ? { type: 'Board', id: boardId } : { type: 'Board' }
        ];
      }
    }),
    moveTask: builder.mutation({
      query: ({ taskId, sourceColumnId, targetColumnId, newPosition }) => ({
        url: `api/tasks/${taskId}/move`,
        method: 'PUT',
        body: {
          sourceColumnId,
          targetColumnId,
          newPosition
        },
      }),
      async onQueryStarted({ taskId, sourceColumnId, targetColumnId, newPosition, boardId }, { dispatch, queryFulfilled }) {
        console.log('Moving task with data:', { taskId, sourceColumnId, targetColumnId, newPosition, boardId });
        
        // Оптимистично обновляем UI
        const patchResult = dispatch(
            baseApi.util.updateQueryData('getBoardWithData', boardId, (draft) => {
              // Находим исходную колонку
              const sourceColumn = draft.columns.find(col => col.id === sourceColumnId);
              if (!sourceColumn) {
                console.error(`Source column ${sourceColumnId} not found`);
                return;
              }

              // Находим задачу в исходной колонке
              const taskIndex = sourceColumn.tasks.findIndex(t => t.id === taskId);
              if (taskIndex === -1) {
                console.error(`Task ${taskId} not found in source column ${sourceColumnId}`);
                return;
              }

              // Копируем задачу перед удалением
              const task = { ...sourceColumn.tasks[taskIndex] };

              // Удаляем задачу из исходной колонки
              sourceColumn.tasks.splice(taskIndex, 1);

              // Если перемещение в другую колонку
              if (sourceColumnId !== targetColumnId) {
                // Находим целевую колонку
                const targetColumn = draft.columns.find(col => col.id === targetColumnId);
                if (targetColumn) {
                  // Обновляем columnId задачи
                  task.columnId = targetColumnId;

                  // Вставляем задачу в новую позицию
                  targetColumn.tasks.splice(newPosition, 0, task);

                  // Обновляем позиции всех задач в обеих колонках
                  sourceColumn.tasks.forEach((t, i) => { 
                    t.position = i;
                    console.log(`Updating task ${t.id} position to ${i} in source column`);
                  });
                  targetColumn.tasks.forEach((t, i) => { 
                    t.position = i;
                    console.log(`Updating task ${t.id} position to ${i} in target column`);
                  });
                } else {
                  console.error(`Target column ${targetColumnId} not found`);
                  // Возвращаем задачу обратно, если целевая колонка не найдена
                  sourceColumn.tasks.splice(taskIndex, 0, task);
                }
              } else {
                // Вставляем задачу в новую позицию в той же колонке
                sourceColumn.tasks.splice(newPosition, 0, task);

                // Обновляем позиции задач
                sourceColumn.tasks.forEach((t, i) => { 
                  t.position = i;
                  console.log(`Updating task ${t.id} position to ${i} in column`);
                });
              }
            })
        );

        try {
          // Ждем ответа от сервера
          const result = await queryFulfilled;
          console.log('Task moved successfully on server:', result);
        } catch (error) {
          // В случае ошибки откатываем изменения
          console.error('Failed to move task:', error);
          patchResult.undo();
        }
      },
      invalidatesTags: (result, error, { boardId }) => [
        { type: 'Board', id: boardId },
        'Tasks'
      ],
    }),
  }),
});

// Экспортируем только хуки для чтения, мутации теперь доступны из boardsApi
export const {
  useGetTaskQuery,
  useGetTasksByColumnQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useMoveTaskMutation,
} = tasksApi;