import {baseApi} from './baseApi';
import {
    initializeWebSocketConnection,
    disconnectWebSocket,
    subscribeToUserPrivateQueue,
    onConnect,
    ChatEventTypes
} from './WebSocketService';
import {showNewChatNotification, showNewMessageNotification} from '../NotificationService';
import CallService, { CALL_MESSAGE_TYPE } from '../../services/CallService';
import * as currentUser from "date-fns/locale";

const apiPrefix = 'api/users';

export const getCurrentUserFromCache = () => {
  if (window.store && window.store.getState) {
    const state = window.store.getState();
    if (state.api && state.api.queries) {
      const currentUserQuery = Object.entries(state.api.queries)
        .find(([key, value]) => 
          key.includes('getCurrentUser') && value?.data && value.status === 'fulfilled'
        );
      
      if (currentUserQuery && currentUserQuery[1]?.data) {
        return currentUserQuery[1].data;
      }
    }
  }
  return null;
};

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
            

            
            onConnect(() => {
              console.log('Connection ready, subscribing to private queue');
              subscribeToUserPrivateQueue((event) => {
                if (!event || !event.type) return;

                console.log('Received private user event:', event);

                if (Object.values(CALL_MESSAGE_TYPE).includes(event.type)) {
                  const currentUserId = userData.id.toString();
                  
                  const isOwnEvent = event.senderId &&
                    (event.senderId.toString() === currentUserId || 
                     event.senderId === parseInt(currentUserId));
                  
                  if (event.type === CALL_MESSAGE_TYPE.CALL_NOTIFICATION && isOwnEvent) {
                    console.log('Ignoring own CALL_NOTIFICATION event');
                    return;
                  }
                  
                  switch (event.type) {
                    case CALL_MESSAGE_TYPE.CALL_NOTIFICATION:
                      console.log('Received CALL_NOTIFICATION in usersApi:', event);
                      if (window.callManagerRef && typeof window.callManagerRef._handleCallMessage === 'function') {
                        window.callManagerRef._handleCallMessage(event);
                      } else if (typeof window.handleCallNotification === 'function') {
                        window.handleCallNotification(event);
                      }
                      break;
                      
                    case CALL_MESSAGE_TYPE.ANSWER:
                      console.log('Received ANSWER in usersApi:', event);
                      if (window.callManagerRef && typeof window.callManagerRef._handleCallMessage === 'function') {
                        const answerData = event.payload || event;
                        const answerObj = {
                          sdp: answerData.sdp || (answerData.payload && answerData.payload.sdp)
                        };
                        
                        if (!answerObj.sdp) {
                          console.error('No SDP found in ANSWER message:', event);
                          break;
                        }
                        
                        const modifiedEvent = {
                          ...event,
                          formattedAnswer: answerObj
                        };
                        
                        window.callManagerRef._handleCallMessage(modifiedEvent);
                      }
                      break;
                      
                    case CALL_MESSAGE_TYPE.ICE_CANDIDATE:
                    case CALL_MESSAGE_TYPE.CALL_ENDED:
                    case CALL_MESSAGE_TYPE.MEDIA_STATUS:
                    case CALL_MESSAGE_TYPE.OFFER:
                      console.log(`Received ${event.type} in usersApi:`, event);
                      if (window.callManagerRef && typeof window.callManagerRef._handleCallMessage === 'function') {
                        window.callManagerRef._handleCallMessage(event);
                      }
                      break;
                      
                    default:
                      console.log('Unknown call event type:', event.type);
                  }
                  
                  return;
                }

                                switch (event.type) {
                                    case 'NEW_MESSAGE':
                                        if (event.payload.sender.id === userData.id) {
                                            console.log(`Ignoring own event: ${event.type}`);
                                            return;
                                        }
                                        if (!window.location.pathname.includes('messenger')) {
                                            showNewMessageNotification(event.payload)
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
                                        break
                                    case "MESSAGE_READED":
                                        if (!window.location.pathname.includes('messenger')) {
                                            return;
                                        }

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

                                    case "CHAT_CREATED":
                                        if (event.initiatorId === currentUser.id) {
                                            return;
                                        }
                                        if (!window.location.pathname.includes('messenger')) {
                                            showNewChatNotification(event.payload)
                                            return;
                                        }
                                        console.log("Новый чат!!");
                                        dispatch(
                                            usersApi.util.updateQueryData('getPagedChats', {}, (draft) => {
                                                    draft.chats = [...draft.chats, event.payload];
                                                }
                                            )
                                        );
                                        break;
                                        
                                    case "CHAT_DELETED":
                                        if (!window.location.pathname.includes('messenger')) {
                                            return;
                                        }

                                        if (window.location.pathname.includes(`/messenger/${event.chatId}`)) {
                                            window.location.href = '/system/messenger';
                                        }
                                        dispatch(
                                            usersApi.util.updateQueryData('getPagedChats', {}, (draft) => {
                                                draft.chats = draft.chats.filter(chat => chat.id !== event.chatId);
                                            })
                                        );
                                        break;
                                    
                                    case "USER_ADDED":
                                        if (!window.location.pathname.includes('messenger')) {
                                            return;
                                        }
                                        console.log("Новый чат!!");
                                        dispatch(
                                            usersApi.util.updateQueryData('getPagedChats', {}, (draft) => {
                                                    draft.chats = [...draft.chats, event.payload];
                                                }
                                            )
                                        );
                                        break;
                                        
                                    case "USER_REMOVED":
                                        console.log("Удален из чата1:", event.payload);

                                        if (!window.location.pathname.includes('messenger')) {
                                            return;
                                        }
                                        console.log("Удален из чата2:", event.payload);
                                        dispatch(
                                            usersApi.util.updateQueryData('getPagedChats', {}, (draft) => {
                                                draft.chats = draft.chats.filter(chat => chat.id !== event.chatId);
                                            })
                                        );

                                        if (window.location.pathname.includes(`/messenger/${event.chatId}`)) {
                                            window.location.href = '/system/messenger';
                                        }
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
            query: ({id, ...data}) => ({
                url: `${apiPrefix}/${id}`,
                method: 'PUT',
                body: data,
            })
        }),
        searchUsers: builder.query({
            query: ({name, page = 0, size = 10}) => ({
                url: `${apiPrefix}/search?name=${encodeURIComponent(name)}&page=${page}&size=${size}`,
            }),
            transformResponse: (response) => {
                return {
                    users: response.users || [],
                    hasNext: response.hasNext
                };
            },
            serializeQueryArgs: ({queryArgs}) => {
                return {name: queryArgs.name};
            },
            merge: (currentCache, newItems, {arg}) => {
                if (arg.page === 0) {
                    return newItems;
                }
                return {
                    users: [...currentCache.users, ...newItems.users],
                    hasNext: newItems.hasNext
                };
            },
            forceRefetch({currentArg, previousArg}) {
                return currentArg?.name !== previousArg?.name ||
                    currentArg?.page !== previousArg?.page;
            },
            keepUnusedDataFor: 2,

        }),
        updateUserName: builder.mutation({
            query: ({name}) => ({
                url: `${apiPrefix}/me`,
                method: 'PUT',
                body: {name: name},
            }),
            async onQueryStarted({ name }, { dispatch, getState, queryFulfilled }) {
              const result = dispatch(
                  usersApi.util.updateQueryData('getCurrentUser', undefined, (draft) => {
                      draft.name = name;
                  })
              );
              try {
                  await queryFulfilled;
              } catch (error) {
                  result.undo();
                  console.error("ошибка обновления имени пользователя", error);
              }
          }
        }),
  }),
});

export const {
    useGetUsersQuery,
    useGetUserQuery,
    useUpdateUserNameMutation,
    useGetCurrentUserQuery,
    useUpdateUserMutation,
    useSearchUsersQuery,
} = usersApi; 