import { baseApi } from './baseApi';
import { disconnectWebSocket } from './WebSocketService';

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
      async onQueryStarted(arg, { queryFulfilled }) {
        try {
          await queryFulfilled;
          disconnectWebSocket();
          console.log('WebSocket disconnected on logout');
        } catch (error) {
          console.error('Error during logout:', error);
        }
      }
    })
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
} = authApi; 