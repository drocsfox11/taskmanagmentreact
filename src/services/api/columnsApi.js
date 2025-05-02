import { baseApi } from './baseApi';

export const columnsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getColumns: builder.query({
      query: (boardId) => `boards/${boardId}/columns`,
      providesTags: ['Columns'],
    }),
    getColumn: builder.query({
      query: (columnId) => `columns/${columnId}`,
      providesTags: (result, error, id) => [{ type: 'Columns', id }],
    }),
    createColumn: builder.mutation({
      query: (column) => ({
        url: 'columns',
        method: 'POST',
        body: column,
      }),
      invalidatesTags: ['Columns'],
    }),
    updateColumn: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `columns/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Columns', id }],
    }),
    deleteColumn: builder.mutation({
      query: (id) => ({
        url: `columns/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Columns'],
    }),
    reorderColumns: builder.mutation({
      query: (data) => ({
        url: 'columns/reorder',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Columns'],
    }),
  }),
});

export const {
  useGetColumnsQuery,
  useGetColumnQuery,
  useCreateColumnMutation,
  useUpdateColumnMutation,
  useDeleteColumnMutation,
  useReorderColumnsMutation,
} = columnsApi; 