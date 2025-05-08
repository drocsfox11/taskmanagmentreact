import { baseApi } from './baseApi';

/**
 * @deprecated Используйте вместо этого соответствующие хуки из boardsApi.js
 * ВАЖНО: Эти хуки теперь экспортируются из boardsApi.js и не должны использоваться напрямую отсюда
 * Для получения тегов используйте результат из запроса board/full
 */
export const tagsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTags: builder.query({
      query: (boardId) => ({url: `api/tags/board/${boardId}`}),
      providesTags: ['Tags'],
    }),
    getTag: builder.query({
      query: (tagId) => ({url: `api/tags/${tagId}`}),
      providesTags: (result, error, id) => [{ type: 'Tags', id }],
    }),
    // DEPRECATED: Используйте эквивалентные мутации из boardsApi
    createTag: builder.mutation({
      query: (tag) => ({
        url: 'api/tags',
        method: 'POST',
        body: { ...tag, socketEvent: true },
      }),
      // Не инвалидируем кеш, т.к. WebSocket обновит данные
    }),
    // DEPRECATED: Используйте эквивалентные мутации из boardsApi
    updateTag: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `api/tags/${id}`,
        method: 'PUT',
        body: { ...data, socketEvent: true },
      }),
      // Не инвалидируем кеш, т.к. WebSocket обновит данные
    }),
    // DEPRECATED: Используйте эквивалентные мутации из boardsApi
    deleteTag: builder.mutation({
      query: (id) => ({
        url: `api/tags/${id}`,
        method: 'DELETE',
        body: { socketEvent: true },
      }),
      // Не инвалидируем кеш, т.к. WebSocket обновит данные
    }),
  }),
});

// Экспортируем только хуки для чтения, мутации теперь доступны из boardsApi
export const {
  useGetTagsQuery,
  useGetTagQuery,
} = tagsApi; 