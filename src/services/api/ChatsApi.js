import { baseApi } from './baseApi';
import { subscribeToChatTopic, unsubscribeFromAllChatsExcept, ChatEventTypes } from './WebSocketService';

export const chatsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createChat: builder.mutation({
      query: ({chat, selectedUser}) => ({
        url: 'api/chats',
        method: 'POST',
        body: chat,
      }),
      async onQueryStarted({chat, selectedUser}, {dispatch, queryFulfilled}) {
        const tempId = Date.now().toString();
        console.log(chat, selectedUser);

        const patchResult = dispatch(
          chatsApi.util.updateQueryData('getPagedChats', {}, (draft) => {
            if (!draft.chats) draft.chats = [];
            draft.chats.unshift(chat.isGroupChat ? {
              id: tempId,
              name: chat.name,
              avatarURL: chat.avatarURL,
              isGroupChat: chat.isGroupChat,
              participantIds: chat.participantIds,
              lastMessage: null
            } : {
              id: tempId,
              name: selectedUser.name,
              avatarURL: selectedUser.avatarURL,
              isGroupChat: chat.isGroupChat,
              lastMessage: null
            });
          })
        );
        
        try {
          const { data } = await queryFulfilled;
          
          dispatch(
            chatsApi.util.updateQueryData('getPagedChats', {}, (draft) => {
              const chatIndex = draft.chats.findIndex(c => c.id === tempId);
              if (chatIndex !== -1) {
                draft.chats[chatIndex].id = data.id;
              }
            })
          );
        } catch (error) {
          console.error('Failed to create chat:', error);
          patchResult.undo();
        }
      }
    }),
    deleteChat: builder.mutation({
      query: (chatId) => ({
        url: `api/chats/${chatId}`,
        method: 'DELETE',
      }),

    }),
    getChatDetails: builder.query({
      query: (chatId) => ({url: `api/chats/${chatId}`}),
      keepUnusedDataFor: 0,
      transformResponse: (response) => {
        return {
          id: response.id,
          name: response.name,
          isGroupChat: response.groupChat,
          avatarURL: response.avatarURL,
          participants: response.participants || [],
        };
      },
      async onCacheEntryAdded(
        chatId,
        { updateCachedData, cacheDataLoaded, cacheEntryRemoved, dispatch, getState }
      ) {
        try {
          await cacheDataLoaded;
          
          const state = getState();
          const currentUser = state.api.queries['getCurrentUser(undefined)']?.data;
          
          if (!currentUser || !chatId) return;
          
          const userId = currentUser.id;
          
          unsubscribeFromAllChatsExcept(chatId);
          
          subscribeToChatTopic(chatId, (event) => {
            if (!event || !event.type) return;

            if (event.payload?.senderId === userId) {
              console.log(`Ignoring own event: ${event.type}`);
              return;
            }
            
            switch (event.type) {
              case ChatEventTypes.NEW_MESSAGE:
                if (event.payload.sender.id === userId) {
                  console.log(`Ignoring own event: ${event.type}`);
                  return;
                }
                
                dispatch(
                  baseApi.util.updateQueryData('getMessages', { chatId }, (draft) => {
                    if (!draft.messages) draft.messages = [];
                    
                    const exists = draft.messages.some(msg => msg.id === event.payload.id);
                    
                    if (!exists) {
                      draft.messages.unshift({
                        ...event.payload,
                        readByIds: [],
                        isLocal: false
                      });
                    }
                  })
                );
                
                dispatch(
                  chatsApi.util.updateQueryData('getPagedChats', {}, (draft) => {
                    const chatIndex = draft.chats.findIndex(c => c.id === Number(chatId));
                    if (chatIndex !== -1) {
                      draft.chats[chatIndex].lastMessage = {
                        ...event.payload,
                        readByIds: []

                      };
                    }
                  })
                );
                
                
                updateCachedData((draft) => {
                  draft.lastMessage = event.payload;
                });
                break;
              
              case ChatEventTypes.MESSAGE_EDITED:
                if (event.payload.senderId === userId) {
                  console.log(`Ignoring own event: ${event.type}`);
                  return;
                }
                dispatch(
                  baseApi.util.updateQueryData('getMessages', { chatId }, (draft) => {
                    const msgIndex = draft.messages.findIndex(msg => msg.id === event.payload.messageId);
                    if (msgIndex !== -1) {
                      draft.messages[msgIndex] = {
                        ...draft.messages[msgIndex],
                        content: event.payload.content,
                        isEdited: true
                      };
                    }
                  })
                );
                break;
              
              case ChatEventTypes.MESSAGE_DELETED:
                if (event.payload.senderId === userId) {
                  console.log(`Ignoring own event: ${event.type}`);
                  return;
                }
                dispatch(
                  baseApi.util.updateQueryData('getMessages', { chatId }, (draft) => {
                    draft.messages = draft.messages.filter(msg => msg.id !== event.payload.messageId);
                  })
                );
                break;
              
              case ChatEventTypes.USER_ADDED:
                updateCachedData((draft) => {
                  if (!draft.participants.some(p => p.id === event.payload.userId)) {
                    draft.participants.push({
                      id: event.payload.userId,
                      name: event.payload.userName || 'Пользователь',
                      avatarURL: event.payload.avatarURL || '',
                      role: 'MEMBER'
                    });
                  }
                });
                break;
              
              case ChatEventTypes.USER_REMOVED:
                updateCachedData((draft) => {
                  draft.participants = draft.participants.filter(p => p.id !== event.payload.userId);
                });
                break;
              
              case ChatEventTypes.USER_ROLE_CHANGED:
                updateCachedData((draft) => {
                  const participantIndex = draft.participants.findIndex(p => p.id === event.payload.userId);
                  if (participantIndex !== -1) {
                    draft.participants[participantIndex].role = event.payload.role;
                  }
                });
                break;
              
              case ChatEventTypes.MESSAGE_READED:
                if (event.payload.readerId === userId) {
                  console.log("игнорирую свой ивент")
                  return
                }
                dispatch(
                  baseApi.util.updateQueryData('getMessages', { chatId }, (draft) => {
                    if (!draft.messages) return;

                    const messageIdsToUpdate = event.payload.messagesIds;
                    const userId = event.payload.readerId;
                    console.log("message readed", messageIdsToUpdate, userId);
                    if (messageIdsToUpdate && userId) {
                      messageIdsToUpdate.forEach(messageId => {
                        const messageIndex = draft.messages.findIndex(msg => msg.id === messageId);
                        console.log("Индекс", messageIndex);
                        if (messageIndex !== -1) {
                          if (!draft.messages[messageIndex].readByIds.includes(userId)) {
                            console.log("Обновил драфт");
                            draft.messages[messageIndex].readByIds.push(userId);
                          }
                        }
                      });
                    }
                  })
                );

                break;
              
              case ChatEventTypes.CALL_NOTIFICATION:
              case ChatEventTypes.CALL_STARTED:
              case ChatEventTypes.CALL_ENDED:
              case ChatEventTypes.CALL_REJECTED:
                // Пропускаем эти события, они будут обработаны в CallManager
                console.log(`Call event received in ChatsApi: ${event.type}`);
                console.log('Call event full structure:', JSON.stringify(event, null, 2));
                console.log('Checking for SDP in call event:');
                
                // Ищем SDP в различных местах
                if (event.sdp) {
                  console.log('- SDP found in event.sdp');
                } else if (event.payload && event.payload.sdp) {
                  console.log('- SDP found in event.payload.sdp');
                } else if (event.payload && event.payload.offer) {
                  console.log('- SDP found in event.payload.offer');
                } else if (event.offer) {
                  console.log('- SDP found in event.offer'); 
                } else if (typeof event.payload === 'string' && event.payload.startsWith('v=')) {
                  console.log('- SDP is the payload string itself');
                } else {
                  console.log('- No SDP found, searching deeper:');
                  // Глубокий поиск SDP в объекте события
                  for (const key in event) {
                    if (typeof event[key] === 'string' && event[key].startsWith('v=')) {
                      console.log(`  - Found SDP in event.${key}`);
                    } else if (typeof event[key] === 'object' && event[key]) {
                      for (const subKey in event[key]) {
                        if (typeof event[key][subKey] === 'string' && event[key][subKey].startsWith('v=')) {
                          console.log(`  - Found SDP in event.${key}.${subKey}`);
                        }
                      }
                    }
                  }
                }
                
                // Явно публикуем эти события в шину событий, чтобы они были доступны другим компонентам
                // создаем событие, которое может поймать CallManager
                const callEvent = new CustomEvent('call-event', { 
                  detail: { ...event, source: 'chat-topic' } 
                });
                window.dispatchEvent(callEvent);
                break;
              
              default:
                console.log('Unknown chat event type:', event.type);
            }
          });
          
          await cacheEntryRemoved;
          
        } catch (error) {
          console.error('Chat socket connection error:', error);
        }
      }
    }),
    addParticipant: builder.mutation({
      query: ({ chatId, userId }) => ({
        url: `api/chats/${chatId}/participants/${userId}`,
        method: 'POST',
      }),
      async onQueryStarted({ chatId, userId }, { dispatch, queryFulfilled, getState }) {
        try {
          await queryFulfilled;
          
          dispatch(
            chatsApi.util.updateQueryData('getChatDetails', chatId, (draft) => {
              const state = getState();
              const usersData = state.api?.queries || {};
              const userDataKey = Object.keys(usersData).find(key => 
                key.includes('getUser') && key.includes(userId)
              );
              
              const userData = userDataKey ? usersData[userDataKey]?.data : null;
              
              if (!draft.participants.some(p => p.id === userId)) {
                draft.participants.push({
                  id: userId,
                  name: userData?.name || 'Пользователь',
                  avatarURL: userData?.avatarURL || '',
                  role: 'MEMBER'
                });
              }
            })
          );
        } catch (error) {
        }
      },
    }),
    removeParticipant: builder.mutation({
      query: ({ chatId, userId }) => ({
        url: `api/chats/${chatId}/participants/${userId}`,
        method: 'DELETE',
      }),

      async onQueryStarted({ chatId, userId }, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          
          dispatch(
            chatsApi.util.updateQueryData('getChatDetails', chatId, (draft) => {
              draft.participants = draft.participants.filter(p => p.id !== userId);
            })
          );
        } catch (error) {
        }
      },
    }),
    changeParticipantRole: builder.mutation({
      query: ({ chatId, userId, role }) => ({
        url: `api/chats/${chatId}/participants/${userId}/role`,
        method: 'POST',
        body: role,
      }),

      async onQueryStarted({ chatId, userId, role }, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          
          dispatch(
            chatsApi.util.updateQueryData('getChatDetails', chatId, (draft) => {
              const participantIndex = draft.participants.findIndex(p => p.id === userId);
              if (participantIndex !== -1) {
                draft.participants[participantIndex].role = role;
              }
            })
          );
        } catch (error) {
        }
      },
    }),
    getPagedChats: builder.query({
      query: ({ offset = 0, size = 20 }) => ({
        url: 'api/chats/paged',
        params: { offset, size },
      }),
      keepUnusedDataFor: 0,
      transformResponse: (response) => {
        return {
          chats: response.chats?.map(chat => ({
            ...chat,
            isGroupChat: chat.groupChat, // Преобразуем groupChat в isGroupChat
            lastMessage: chat.lastMessage || null,
            participants: chat.participants || []
          })) || [],
          hasNext: response.hasNext
        };
      },
      providesTags: (result) =>
        result?.chats
          ? [
              ...result.chats.map(({ id }) => ({ type: 'Chats', id })),
              'Chats'
            ]
          : ['Chats'],
      serializeQueryArgs: ({ queryArgs }) => {
        return {};
      },
      merge: (currentCache, newItems, { arg }) => {
        if (arg.offset === 0) {
          return newItems;
        }
        
        const existingIds = new Set(currentCache.chats.map(chat => chat.id));
        const uniqueNewChats = newItems.chats.filter(chat => !existingIds.has(chat.id));
        
        return {
          chats: [...currentCache.chats, ...uniqueNewChats],
          hasNext: newItems.hasNext
        };
      },
      forceRefetch({ currentArg, previousArg }) {
        return currentArg?.offset !== previousArg?.offset;
      },
    }),
    updateChatAvatar: builder.mutation({
      query: ({ chatId, file }) => {
        const formData = new FormData();
        formData.append('file', file);
        return {
          url: `api/chats/${chatId}/avatar`,
          method: 'POST',
          body: formData,
          formData: true,
        };
      }
    }),
    updateChatName: builder.mutation({
      query: ({ chatId, name }) => ({
        url: `api/chats/${chatId}/name`,
        method: 'PUT',
        body: { name },
      })
    })
  }),
  overrideExisting: false,
});

export const {
  useCreateChatMutation,
  useDeleteChatMutation,
  useGetChatDetailsQuery,
  useAddParticipantMutation,
  useRemoveParticipantMutation,
  useChangeParticipantRoleMutation,
  useGetPagedChatsQuery,
  useUpdateChatAvatarMutation,
  useUpdateChatNameMutation,
} = chatsApi; 