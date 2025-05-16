import { baseApi } from './baseApi';
import { 
  initializeWebSocketConnection, 
  disconnectWebSocket, 
  subscribeToUserPrivateQueue,
  onConnect,
  ChatEventTypes 
} from './WebSocketService';
import { showNewMessageNotification } from '../NotificationService';

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
        { cacheDataLoaded, cacheEntryRemoved, dispatch }
      ) {
        try {
          console.log("Кеш пользователя полетел!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
          const { data: userData } = await cacheDataLoaded;
          
          if (userData && userData.id) {
            initializeWebSocketConnection(userData.id);
            console.log('WebSocket connection initialized for user:', userData.id);
            
            // Флаг для определения, что сообщение о звонке уже обработано
            let callEventsHandled = false;
            
            onConnect(() => {
              console.log('Connection ready, subscribing to private queue');
              subscribeToUserPrivateQueue((event) => {
                if (!event || !event.type) return;

                // Обработка событий звонков 
                if (event.type === 'CALL_NOTIFICATION' || 
                    event.type === ChatEventTypes.CALL_NOTIFICATION ||
                    event.type === 'OFFER' ||
                    event.type === 'ICE_CANDIDATE' ||
                    event.type === 'CALL_STARTED' ||
                    event.type === ChatEventTypes.CALL_STARTED ||
                    event.type === 'CALL_ENDED' ||
                    event.type === ChatEventTypes.CALL_ENDED ||
                    event.type === 'CALL_REJECTED' ||
                    event.type === ChatEventTypes.CALL_REJECTED ||
                    event.type === 'CALL_INVITE') {
                  
                  console.log('Call event received in usersApi, passing through');
                  // Не блокируем событие, чтобы оно доходило до CallManager
                  return;
                }

                switch (event.type) {
                  case 'NEW_MESSAGE':
                    if (event.payload.sender.id === userData.id) {
                      console.log(`Ignoring own event: ${event.type}`);
                      return;
                    }
                    
                    dispatch(
                      usersApi.util.updateQueryData('getPagedChats', undefined, (draft) => {
                        const chatIndex = draft.chats.findIndex(c => c.id === event.payload.chatId);
                        if (chatIndex !== -1) {
                          draft.chats[chatIndex].lastMessage = {
                            ...event.payload,
                            readByIds: []
                          };
                        }
                      })
                    );
                    if (!window.location.pathname.includes('messenger')) showNewMessageNotification(event.payload);
                    break
                  case "MESSAGE_READED":

                    dispatch(
                        usersApi.util.updateQueryData('getPagedChats', {}, (draft) => {
                          const chatIndex = draft.chats.findIndex(c => c.id === Number(event.payload.chatId));
                          if (chatIndex !== -1) {
                            const lastMessage = draft.chats[chatIndex].lastMessage;
                            if (lastMessage?.id === event.payload.messageId) {
                              console.log("Обновил чаты слева")
                              lastMessage.readByIds = [event.payload.readerId];
                            }
                          }
                        })
                    );
                    break;
                }
              });
            });
          }
          
          await cacheEntryRemoved;
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