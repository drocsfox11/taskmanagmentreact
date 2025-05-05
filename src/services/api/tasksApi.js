import { baseApi } from './baseApi';

const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:3001';

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
      
      // WebSocket-подписка для обновлений задач в реальном времени
      async onCacheEntryAdded(
        boardId,
        { updateCachedData, cacheDataLoaded, cacheEntryRemoved }
      ) {
        await cacheDataLoaded;
        
        // Соединяемся с каналом задач для конкретной доски
        const ws = new WebSocket(`${WS_URL}/boards/${boardId}/tasks`);
        
        const listener = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            switch (data.type) {
              case 'TASK_CREATED':
                updateCachedData((draft) => {
                  draft.push(data.payload);
                });
                break;
                
              case 'TASK_UPDATED':
                updateCachedData((draft) => {
                  const index = draft.findIndex(task => task.id === data.payload.id);
                  if (index !== -1) {
                    draft[index] = { ...draft[index], ...data.payload };
                  }
                });
                break;
                
              case 'TASK_DELETED':
                updateCachedData((draft) => {
                  const index = draft.findIndex(task => task.id === data.payload.id);
                  if (index !== -1) {
                    draft.splice(index, 1);
                  }
                });
                break;
                
              case 'TASK_MOVED':
                updateCachedData((draft) => {
                  // Находим задачу, которую нужно переместить
                  const taskIndex = draft.findIndex(task => task.id === data.payload.taskId);
                  if (taskIndex !== -1) {
                    // Обновляем columnId и позицию
                    draft[taskIndex].columnId = data.payload.destColumnId;
                    // Если нужно обновить позицию задачи
                    if (data.payload.newPosition !== undefined) {
                      draft[taskIndex].position = data.payload.newPosition;
                    }
                  }
                });
                break;
                
              default:
                break;
            }
          } catch (error) {
            console.error('WebSocket message error:', error);
          }
        };
        
        ws.addEventListener('message', listener);
        
        // Закрываем соединение, когда компонент размонтирован
        await cacheEntryRemoved;
        ws.removeEventListener('message', listener);
        ws.close();
      },
    }),
    getTask: builder.query({
      query: (taskId) => `tasks/${taskId}`,
      providesTags: (result, error, id) => [{ type: 'Tasks', id }],
    }),
    getTasksByColumn: builder.query({
      query: (columnId) => `columns/${columnId}/tasks`,
      providesTags: (result, error, id) => [
        { type: 'Tasks', id: `column-${id}` },
      ],
    }),
    // DEPRECATED: Используйте эквивалентные мутации из boardsApi
    createTask: builder.mutation({
      query: (task) => ({
        url: 'tasks',
        method: 'POST',
        body: { ...task, socketEvent: true },
      }),
      // Не инвалидируем кеш, т.к. WebSocket обновит данные
    }),
    // DEPRECATED: Используйте эквивалентные мутации из boardsApi
    updateTask: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `tasks/${id}`,
        method: 'PUT',
        body: { ...data, socketEvent: true },
      }),
      // Не инвалидируем кеш, т.к. WebSocket обновит данные
    }),
    // DEPRECATED: Используйте эквивалентные мутации из boardsApi
    deleteTask: builder.mutation({
      query: (id) => ({
        url: `tasks/${id}`,
        method: 'DELETE',
        body: { socketEvent: true },
      }),
      // Не инвалидируем кеш, т.к. WebSocket обновит данные
    }),
    // DEPRECATED: Используйте эквивалентные мутации из boardsApi
    moveTask: builder.mutation({
      query: (data) => ({
        url: 'tasks/move',
        method: 'POST',
        body: { ...data, socketEvent: true },
      }),
      // Не инвалидируем кеш, т.к. WebSocket обновит данные
    }),
  }),
});

// Экспортируем только хуки для чтения, мутации теперь доступны из boardsApi
export const {
  useGetTasksQuery,
  useGetTaskQuery,
  useGetTasksByColumnQuery,
} = tasksApi; 