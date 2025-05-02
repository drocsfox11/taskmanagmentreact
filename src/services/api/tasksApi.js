import { baseApi } from './baseApi';

export const tasksApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTasks: builder.query({
      query: (boardId) => `boards/${boardId}/tasks`,
      providesTags: ['Tasks'],
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
    createTask: builder.mutation({
      query: (task) => ({
        url: 'tasks',
        method: 'POST',
        body: task,
      }),
      invalidatesTags: ['Tasks'],
    }),
    updateTask: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `tasks/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Tasks', id }],
    }),
    deleteTask: builder.mutation({
      query: (id) => ({
        url: `tasks/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Tasks'],
    }),
    moveTask: builder.mutation({
      query: (data) => ({
        url: 'tasks/move',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Tasks'],
    }),
  }),
});

export const {
  useGetTasksQuery,
  useGetTaskQuery,
  useGetTasksByColumnQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useMoveTaskMutation,
} = tasksApi; 