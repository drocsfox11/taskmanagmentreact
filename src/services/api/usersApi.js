import { baseApi } from './baseApi';

const apiPrefix = 'api/users';

export const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query({
      query: () => ({url:`${apiPrefix}`}),
      providesTags: ['Users'],
    }),
    getUser: builder.query({
      query: (username) => ({url:`${apiPrefix}/${username}`}),
      providesTags: (result, error, username) => [{ type: 'Users', id: username }],
    }),
    getCurrentUser: builder.query({
      query: () => ({url:`${apiPrefix}/me`}),
      providesTags: ['CurrentUser'],
    }),
    updateUser: builder.mutation({
      query: ({ username, ...data }) => ({
        url: `${apiPrefix}/${username}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { username }) => [
        { type: 'Users', id: username }
      ],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useGetUserQuery,
  useGetCurrentUserQuery,
  useUpdateUserMutation,
} = usersApi; 