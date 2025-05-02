import { baseApi } from './baseApi';

const apiPrefix = 'api/boards';

export const boardsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getBoards: builder.query({
      query: (projectId) => ({url:`${apiPrefix}/project/${projectId}`}),
      providesTags: ['Boards'],
    }),
    getBoard: builder.query({
      query: (boardId) => ({url:`${apiPrefix}/${boardId}`}),
      providesTags: (result, error, id) => [{ type: 'Boards', id }],
    }),
    createBoard: builder.mutation({
      query: (board) => ({
        url: `${apiPrefix}`,
        method: 'POST',
        body: board,
      }),
      invalidatesTags: ['Boards'],
    }),
    updateBoard: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `${apiPrefix}/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Boards', id }],
    }),
    deleteBoard: builder.mutation({
      query: (id) => ({
        url: `${apiPrefix}/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Boards'],
    }),
  }),
});

export const {
  useGetBoardsQuery,
  useGetBoardQuery,
  useCreateBoardMutation,
  useUpdateBoardMutation,
  useDeleteBoardMutation,
} = boardsApi; 