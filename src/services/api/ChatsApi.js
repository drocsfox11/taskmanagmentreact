import { baseApi } from './baseApi';

export const chatsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    createChat: builder.mutation({
      query: (chat) => ({
        url: 'api/chats',
        method: 'POST',
        body: chat,
      }),
    }),
    deleteChat: builder.mutation({
      query: (chatId) => ({
        url: `api/chats/${chatId}`,
        method: 'DELETE',
      }),

    }),
    getChatDetails: builder.query({
      query: (chatId) => ({url: `api/chats/${chatId}`}),
      transformResponse: (response) => {
        return {
          id: response.id,
          name: response.name,
          isGroupChat: response.groupChat,
          avatarURL: response.avatarURL,
          participants: response.participants || [],
          lastActivity: response.lastActivity || new Date().toISOString(),
          unreadCount: response.unreadCount || 0,
          lastMessage: response.lastMessage || null
        };
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
      transformResponse: (response) => {
        return {
          chats: response.chats?.map(chat => ({
            ...chat,
            isGroupChat: chat.groupChat, // Преобразуем groupChat в isGroupChat
            lastMessage: chat.lastMessage || null,
            unreadCount: chat.unreadCount || 0,
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
      keepUnusedDataFor: 5 * 60,
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