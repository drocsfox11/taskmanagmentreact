import { baseApi } from './baseApi';

const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:3001';

/**
 * @deprecated Используйте вместо этого соответствующие хуки из boardsApi.js
 * ВАЖНО: Эти хуки теперь экспортируются из boardsApi.js и не должны использоваться напрямую отсюда
 * Для получения колонок используйте результат из запроса board/full
 */
export const columnsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getColumns: builder.query({
      query: (boardId) => ({url:`boards/${boardId}/columns`}),
      providesTags: ['Columns'],
      
      // WebSocket-подписка для обновлений колонок в реальном времени
      async onCacheEntryAdded(
        boardId,
        { updateCachedData, cacheDataLoaded, cacheEntryRemoved }
      ) {
        await cacheDataLoaded;
        
        // Соединяемся с каналом колонок для конкретной доски
        const ws = new WebSocket(`${WS_URL}/boards/${boardId}/columns`);
        
        const listener = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            switch (data.type) {
              case 'COLUMN_CREATED':
                updateCachedData((draft) => {
                  draft.push(data.payload);
                });
                break;
                
              case 'COLUMN_UPDATED':
                updateCachedData((draft) => {
                  const index = draft.findIndex(col => col.id === data.payload.id);
                  if (index !== -1) {
                    draft[index] = { ...draft[index], ...data.payload };
                  }
                });
                break;
                
              case 'COLUMN_DELETED':
                updateCachedData((draft) => {
                  const index = draft.findIndex(col => col.id === data.payload.id);
                  if (index !== -1) {
                    draft.splice(index, 1);
                  }
                });
                break;
                
              case 'COLUMNS_REORDERED':
                updateCachedData(() => {
                  // Заменяем список колонок на новый, отсортированный порядок
                  return data.payload.columns;
                });
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
    getColumn: builder.query({
      query: (columnId) => ({url:`columns/${columnId}`}),
      providesTags: (result, error, id) => [{ type: 'Columns', id }],
    }),
    // DEPRECATED: Используйте эквивалентные мутации из boardsApi
    createColumn: builder.mutation({
      query: (column) => ({
        url: 'columns',
        method: 'POST',
        body: { ...column, socketEvent: true },
      }),
      // Не инвалидируем кеш, т.к. WebSocket обновит данные
    }),
    // DEPRECATED: Используйте эквивалентные мутации из boardsApi
    updateColumn: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `columns/${id}`,
        method: 'PUT',
        body: { ...data, socketEvent: true },
      }),
      // Не инвалидируем кеш, т.к. WebSocket обновит данные
    }),
    // DEPRECATED: Используйте эквивалентные мутации из boardsApi
    deleteColumn: builder.mutation({
      query: (id) => ({
        url: `columns/${id}`,
        method: 'DELETE',
        body: { socketEvent: true },
      }),
      // Не инвалидируем кеш, т.к. WebSocket обновит данные
    }),
    // DEPRECATED: Используйте эквивалентные мутации из boardsApi
    reorderColumns: builder.mutation({
      query: (data) => ({
        url: 'columns/reorder',
        method: 'POST',
        body: { ...data, socketEvent: true },
      }),
      // Не инвалидируем кеш, т.к. WebSocket обновит данные
    }),
  }),
});

// Экспортируем только хуки для чтения, мутации теперь доступны из boardsApi
export const {
  useGetColumnsQuery,
  useGetColumnQuery,
} = columnsApi; 