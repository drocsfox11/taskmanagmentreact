import { baseApi } from './baseApi';

export const eventsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getEvents: builder.query({
      query: (boardId) => ({
        url: `api/events/board/${boardId}`,
      }),
      providesTags: (result, error, boardId) => [{ type: 'Events', id: boardId }],
    }),
  }),
});

export const { useGetEventsQuery } = eventsApi; 