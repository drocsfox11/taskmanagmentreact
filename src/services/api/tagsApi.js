import { baseApi } from './baseApi';

export const tagsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTags: builder.query({
      query: () => 'tags',
      providesTags: ['Tags'],
    }),
    getTag: builder.query({
      query: (id) => `tags/${id}`,
      providesTags: (result, error, id) => [{ type: 'Tags', id }],
    }),
    createTag: builder.mutation({
      query: (tag) => ({
        url: 'tags',
        method: 'POST',
        body: tag,
      }),
      invalidatesTags: ['Tags'],
    }),
    updateTag: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `tags/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Tags', id }],
    }),
    deleteTag: builder.mutation({
      query: (id) => ({
        url: `tags/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Tags'],
    }),
  }),
});

export const {
  useGetTagsQuery,
  useGetTagQuery,
  useCreateTagMutation,
  useUpdateTagMutation,
  useDeleteTagMutation,
} = tagsApi; 