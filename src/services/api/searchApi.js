import { baseApi } from './baseApi';

export const searchApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    searchTasks: builder.mutation({
      query: (searchParams) => ({
        url: 'api/tasks/search',
        method: 'POST',
        body: searchParams,
        credentials: 'include'
      }),
      invalidatesTags: (result, error, arg) => {
        return [];
      }
    }),
  }),
});

export const { useSearchTasksMutation } = searchApi; 