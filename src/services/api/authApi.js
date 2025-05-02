import { baseApi } from './baseApi';

const prefix = 'auth';
export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (credentials) => ({
        url: `${prefix}/login`,
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['CurrentUser'],
    }),
    register: builder.mutation({
      query: (userData) => ({
        url: `${prefix}/register`,
        method: 'POST',
        body: userData,
      }),
    }),
    logout: builder.mutation({
      query: () => ({
        url: `${prefix}/logout`,
        method: 'POST',
      }),
      invalidatesTags: ['CurrentUser'],
    })
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
} = authApi; 