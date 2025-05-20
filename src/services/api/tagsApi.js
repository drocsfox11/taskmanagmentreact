import { baseApi } from './baseApi';


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
    createTag: builder.mutation({
      query: (tag) => ({
        url: 'api/tags',
        method: 'POST',
        body: { ...tag, socketEvent: true },
      }),
    }),
    updateTag: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `api/tags/${id}`,
        method: 'PUT',
        body: { ...data, socketEvent: true },
      }),
    }),
    deleteTag: builder.mutation({
      query: (id) => ({
        url: `api/tags/${id}`,
        method: 'DELETE',
        body: { socketEvent: true },
      }),
    }),
  }),
});

export const {
  useGetTagsQuery,
  useGetTagQuery,
} = tagsApi; 