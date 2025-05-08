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

        // Оптимистично обновляем UI
        const patchResult = dispatch(
            baseApi.util.updateQueryData('getBoardWithData', task.boardId, (draft) => {
              const column = draft.columns.find(col => col.id === task.columnId);
              if (column) {
                column.tasks.push({
                  ...task,
                  id: tempId,
                  position: column.tasks.length
                });
              }
            })
        );

        try {
          // Ждем ответа от сервера
          const { data: createdTask } = await queryFulfilled;

          // Обновляем временный ID на реальный
          dispatch(
              baseApi.util.updateQueryData('getBoardWithData', task.boardId, (draft) => {
                const column = draft.columns.find(col => col.id === task.columnId);
                if (column) {
                  const taskIndex = column.tasks.findIndex(t => t.id === tempId);
                  if (taskIndex !== -1) {
                    column.tasks[taskIndex] = createdTask;
                  }
                }
              })
          );
        } catch {
          // В случае ошибки откатываем изменения
          patchResult.undo();
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
        // Оптимистично обновляем UI
        const patchResult = dispatch(
            baseApi.util.updateQueryData('getBoardWithData', boardId, (draft) => {
              const column = draft.columns.find(col => col.id === columnId);
              if (column) {
                const taskIndex = column.tasks.findIndex(t => t.id === id);
                if (taskIndex !== -1) {
                  Object.assign(column.tasks[taskIndex], updates);
                }
              }
            })
        );

        try {
          // Ждем ответа от сервера
          await queryFulfilled;
        } catch {
          // В случае ошибки откатываем изменения
          patchResult.undo();
        }
      },
      invalidatesTags: (result, error, { boardId }) => [
        { type: 'Board', id: boardId },
        'Tasks'
      ],
    }),
    deleteTask: builder.mutation({
      query: (id) => ({
        url: `api/tasks/${id}`,
        method: 'DELETE',
      }),
      async onQueryStarted({ id, boardId }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
            baseApi.util.updateQueryData('getBoardWithData', boardId, (draft) => {
              draft.columns.forEach(column => {
                const taskIndex = column.tasks.findIndex(t => t.id === id);
                if (taskIndex !== -1) {
                  column.tasks.splice(taskIndex, 1);
                  column.tasks.forEach((task, index) => {
                    task.position = index;
                  });
                }
              });
            })
        );

        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
      invalidatesTags: ['Tasks']
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
        // Оптимистично обновляем UI
        const patchResult = dispatch(
            baseApi.util.updateQueryData('getBoardWithData', boardId, (draft) => {
              // Находим исходную колонку
              const sourceColumn = draft.columns.find(col => col.id === sourceColumnId);
              if (!sourceColumn) return;

              // Находим задачу в исходной колонке
              const taskIndex = sourceColumn.tasks.findIndex(t => t.id === taskId);
              if (taskIndex === -1) return;

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
                  sourceColumn.tasks.forEach((t, i) => { t.position = i; });
                  targetColumn.tasks.forEach((t, i) => { t.position = i; });
                }
              } else {
                // Вставляем задачу в новую позицию в той же колонке
                sourceColumn.tasks.splice(newPosition, 0, task);

                // Обновляем позиции задач
                sourceColumn.tasks.forEach((t, i) => { t.position = i; });
              }
            })
        );

        try {
          // Ждем ответа от сервера
          await queryFulfilled;
        } catch {
          // В случае ошибки откатываем изменения
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