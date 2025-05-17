import { baseApi } from './baseApi';
import { subscribeToChatTopic, unsubscribeFromAllChatsExcept, ChatEventTypes } from './WebSocketService';

export const chatsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createPersonalChat: builder.mutation({
      query: ({participantId, selectedUser}) => ({
        url: 'api/chats/personal',
        method: 'POST',
        body: participantId,
      }),
      async onQueryStarted({chat, selectedUser}, {dispatch, queryFulfilled}) {
        const tempId = Date.now().toString();
        console.log(chat, selectedUser);

        const patchResult = dispatch(
          chatsApi.util.updateQueryData('getPagedChats', {}, (draft) => {
            if (!draft.chats) draft.chats = [];
            draft.chats.unshift({
              id: tempId,
              name: selectedUser.name,
              avatarURL: selectedUser.avatarURL,
              isGroupChat: false,
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
          console.error('Failed to create personal chat:', error);
          patchResult.undo();
        }
      }
    }),
    createGroupChat: builder.mutation({
      query: ({chat}) => ({
        url: 'api/chats/group',
        method: 'POST',
        body: chat,
      }),
      async onQueryStarted({chat}, {dispatch, queryFulfilled}) {
        const tempId = Date.now().toString();

        const patchResult = dispatch(
          chatsApi.util.updateQueryData('getPagedChats', {}, (draft) => {
            if (!draft.chats) draft.chats = [];
            draft.chats.unshift({
              id: tempId,
              name: chat.name,
              avatarURL: '',
              isGroupChat: true,
              participantIds: chat.participantIds,
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
                if (data.avatarURL) {
                  draft.chats[chatIndex].avatarURL = data.avatarURL;
                }
              }
            })
          );
        } catch (error) {
          console.error('Failed to create group chat:', error);
          patchResult.undo();
        }
      }
    }),
    
    deleteChat: builder.mutation({
      query: (chatId) => ({
        url: `api/chats/${chatId}`,
        method: 'DELETE',
      }),
      async onQueryStarted(chatId, {dispatch, queryFulfilled}) {

        const result = dispatch(
            chatsApi.util.updateQueryData('getPagedChats', {}, (draft) => {
              draft.chats = draft.chats.filter(chat => chat.id != chatId);
            })
        );
        try {
          await queryFulfilled;

        } catch (error) {
          console.error('Failed to create group chat:', error);
          result.undo();
        }
      }

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
                if (event.initiatorId === currentUser.id) {
                  return;
                }
                updateCachedData((draft) => {
                  if (!draft.participants.some(p => p.id === event.payload.id)) {
                    draft.participants.push({
                      id: event.payload.id,
                      name: event.payload.name,
                      avatarURL: event.payload.avatarURL,
                      role: 'MEMBER'
                    });
                  }
                });
                break;
              
              case ChatEventTypes.USER_REMOVED:
                if (event.initiatorId === currentUser.id) {
                  return;
                }
                updateCachedData((draft) => {
                  draft.participants = draft.participants.filter(p => p.id !== event.payload);
                });
                dispatch(
                    baseApi.util.updateQueryData('getMessages', { chatId }, (draft) => {
                      if (!draft.messages) return;
                      draft.messages = draft.messages.filter(msg => msg.senderId !== event.payload);
                      }
                    )
                );

                break;
              
              case ChatEventTypes.USER_ROLE_CHANGED:
                if (event.initiatorId === currentUser.id) {
                  return;
                }
                updateCachedData((draft) => {
                  const participantIndex = draft.participants.findIndex(p => p.id === event.payload.userId);
                  if (participantIndex !== -1) {
                    draft.participants[participantIndex].role = event.payload.newRole;
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
                console.log('Received CALL_NOTIFICATION event:', event);
                
                // Use the global call notification handler
                if (typeof window.handleCallNotification === 'function') {
                  console.log('Using global call notification handler with payload:', event);
                  
                  // Pass the entire event, not just payload which might be missing
                  window.handleCallNotification(event);
                } else {
                  console.error('Global call notification handler not available');
                  
                  // Fallback: Try to forward to CallManager if available
                  if (window.callManagerRef && typeof window.callManagerRef._handleCallMessage === 'function') {
                    console.log('Forwarding to CallManager via ref');
                    window.callManagerRef._handleCallMessage(event);
                  }
                }
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
      query: ({ chatId, user }) => ({
        url: `api/chats/${chatId}/participants/${user.id}`,
        method: 'POST',
      }),
      async onQueryStarted({ chatId, user }, { dispatch, queryFulfilled }) {
        const result = dispatch(
            chatsApi.util.updateQueryData('getChatDetails', chatId, (draft) => {


              if (!draft.participants.some(p => p.id === user.id)) {
                draft.participants.push({
                  ...user,
                  role: 'MEMBER'
                });
              }
            })
        );
        try {
          await queryFulfilled;
        } catch (error) {
          console.error('Ошибка добавления пользователя: ', error);
          result.undo()
        }
      },
    }),
    removeParticipant: builder.mutation({
      query: ({ chatId, userId }) => ({
        url: `api/chats/${chatId}/participants/${userId}`,
        method: 'DELETE',
      }),

      async onQueryStarted({ chatId, userId }, { dispatch, queryFulfilled }) {
        const result1 = dispatch(
            chatsApi.util.updateQueryData('getChatDetails', chatId, (draft) => {
              draft.participants = draft.participants.filter(p => p.id !== userId);
            })
        );

        const result2 = dispatch(
            baseApi.util.updateQueryData('getMessages', { chatId }, (draft) => {
              draft.messages = draft.messages.filter(msg => msg.senderId !== userId);
            })
        );
        try {
          await queryFulfilled;

        } catch (error) {
          console.error("ошибка при удалении пользователя из чата", error);
          result1.undo();
          result2.undo();
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
        const result = dispatch(
            chatsApi.util.updateQueryData('getChatDetails', chatId, (draft) => {
              const participantIndex = draft.participants.findIndex(p => p.id === userId);
              if (participantIndex !== -1) {
                draft.participants[participantIndex] = {
                  ...draft.participants[participantIndex],
                  role
                };
              }
            })
        );
        try {
          await queryFulfilled;

        } catch (error) {
          console.error("ошибка какая то при смене прав", error)
          result.undo()
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
  useCreatePersonalChatMutation,
  useCreateGroupChatMutation,
  useDeleteChatMutation,
  useGetChatDetailsQuery,
  useAddParticipantMutation,
  useRemoveParticipantMutation,
  useChangeParticipantRoleMutation,
  useGetPagedChatsQuery,
  useUpdateChatAvatarMutation,
  useUpdateChatNameMutation,
} = chatsApi; 