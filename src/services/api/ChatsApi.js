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
    getMyChats: builder.query({
      query: () => 'api/chats',
    }),
    getChatById: builder.query({
      query: (chatId) => `api/chats/${chatId}`,
    }),
    addParticipant: builder.mutation({
      query: ({ chatId, userId }) => ({
        url: `api/chats/${chatId}/participants/${userId}`,
        method: 'POST',
      }),
    }),
    removeParticipant: builder.mutation({
      query: ({ chatId, userId }) => ({
        url: `api/chats/${chatId}/participants/${userId}`,
        method: 'DELETE',
      }),
    }),
    changeParticipantRole: builder.mutation({
      query: ({ chatId, userId, role }) => ({
        url: `api/chats/${chatId}/participants/${userId}/role`,
        method: 'POST',
        body: role,
      }),
    }),
    getPagedChats: builder.query({
      query: ({ page = 0, size = 20 }) => ({
        url: 'api/chats/paged',
        params: { page, size },
      }),
      transformResponse: (response) => {
        return {
          chats: response.chats || [],
          hasNext: response.hasNext
        };
      },
      serializeQueryArgs: ({ queryArgs }) => {
        // Для всех пользователей кэш общий, если нужен userId — добавить
        return {};
      },
      merge: (currentCache, newItems, { arg }) => {
        if (arg.page === 0) {
          return newItems;
        }
        return {
          chats: [...(currentCache?.chats || []), ...newItems.chats],
          hasNext: newItems.hasNext
        };
      },
      forceRefetch({ currentArg, previousArg }) {
        return currentArg?.page !== previousArg?.page;
      },
      keepUnusedDataFor: 2,
    }),
  }),
  overrideExisting: false,
});

export const {
  useCreateChatMutation,
  useDeleteChatMutation,
  useGetMyChatsQuery,
  useGetChatByIdQuery,
  useAddParticipantMutation,
  useRemoveParticipantMutation,
  useChangeParticipantRoleMutation,
  useGetPagedChatsQuery,
} = chatsApi; 