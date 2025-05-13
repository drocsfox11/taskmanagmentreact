import { baseApi } from './baseApi';
import { initializeWebSocketConnection, disconnectWebSocket } from './WebSocketService';

const apiPrefix = 'api/users';

export const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query({
      query: () => ({url:`${apiPrefix}`}),
      providesTags: ['Users'],
    }),
    getUser: builder.query({
      query: (id) => ({url:`${apiPrefix}/${id}`}),
      providesTags: (result, error, id) => [{ type: 'Users', id }],
    }),
    getCurrentUser: builder.query({
      query: () => ({url:`${apiPrefix}/me`}),
      providesTags: ['CurrentUser'],
      async onCacheEntryAdded(
        arg,
        { cacheDataLoaded, cacheEntryRemoved }
      ) {
        try {
          console.log("Кеш пользователя полетел!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
          // Wait for the user data to be loaded
          const { data: userData } = await cacheDataLoaded;
          
          if (userData && userData.id) {
            // Initialize global WebSocket connection
            initializeWebSocketConnection(userData.id);
            console.log('WebSocket connection initialized for user:', userData.id);
          }
          
          // When the cache entry is removed (user logs out or session expires)
          await cacheEntryRemoved;
          
          // Disconnect WebSocket when user data is removed from cache
          disconnectWebSocket();
          console.log('WebSocket connection closed on cache removal');
        } catch (error) {
          console.error('Error in WebSocket initialization:', error);
        }
      }
    }),
    updateUser: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `${apiPrefix}/${id}`,
        method: 'PUT',
        body: data,
      })
    }),
    searchUsers: builder.query({
      query: ({ name, page = 0, size = 10 }) => ({
        url: `${apiPrefix}/search?name=${encodeURIComponent(name)}&page=${page}&size=${size}`,
      }),
      transformResponse: (response) => {
        return {
          users: response.users || [],
          hasNext: response.hasNext
        };
      },
      serializeQueryArgs: ({ queryArgs }) => {
        return { name: queryArgs.name };
      },
      merge: (currentCache, newItems, { arg }) => {
        if (arg.page === 0) {
          return newItems;
        }
        return {
          users: [...currentCache.users, ...newItems.users],
          hasNext: newItems.hasNext
        };
      },
      forceRefetch({ currentArg, previousArg }) {
        return currentArg?.name !== previousArg?.name || 
               currentArg?.page !== previousArg?.page;
      },
      keepUnusedDataFor: 2,

    }),
  }),
});

export const {
  useGetUsersQuery,
  useGetUserQuery,
  useGetCurrentUserQuery,
  useUpdateUserMutation,
  useSearchUsersQuery,
} = usersApi; 