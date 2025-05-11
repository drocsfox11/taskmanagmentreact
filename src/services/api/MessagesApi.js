import { baseApi } from './baseApi';

export const messagesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    sendMessage: builder.mutation({
      query: ({ chatId, content, attachmentIds }) => ({
        url: `api/chats/${chatId}/messages`,
        method: 'POST',
        body: { content },
      }),
    }),
    getMessages: builder.query({
      query: ({ chatId, page = 0, size = 20 }) => ({
        url: `api/chats/${chatId}/messages`,
        params: { page, size },
      }),
      transformResponse: (response) => {
        if (Array.isArray(response)) {
          return { messages: response, hasNext: response.length > 0 };
        }
        return {
          messages: response.messages || [],
          hasNext: response.hasNext
        };
      },
      serializeQueryArgs: ({ queryArgs }) => {
        return { chatId: queryArgs.chatId };
      },
      merge: (currentCache, newItems, { arg }) => {
        if (arg.page === 0) {
          return newItems;
        }
        return {
          messages: [...(currentCache?.messages || []), ...newItems.messages],
          hasNext: newItems.hasNext
        };
      },
      forceRefetch({ currentArg, previousArg }) {
        return currentArg?.chatId !== previousArg?.chatId || 
               currentArg?.page !== previousArg?.page;
      },
      keepUnusedDataFor: 2,
    }),
    editMessage: builder.mutation({
      query: ({ chatId, messageId, content }) => ({
        url: `api/chats/${chatId}/messages/${messageId}`,
        method: 'PUT',
        body: { content },
      }),
    }),
    deleteMessage: builder.mutation({
      query: ({ chatId, messageId }) => ({
        url: `api/chats/${chatId}/messages/${messageId}`,
        method: 'DELETE',
      }),
    }),
    uploadAttachment: builder.mutation({
      query: ({ chatId, messageId, file }) => {
        const formData = new FormData();
        formData.append('file', file);
        return {
          url: `api/chats/${chatId}/messages/${messageId}/attachments`,
          method: 'POST',
          body: formData,
          formData: true,
        };
      },
    }),
    markAsRead: builder.mutation({
      query: ({ chatId, messageId }) => ({
        url: `api/chats/${chatId}/messages/${messageId}/read`,
        method: 'POST',
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useSendMessageMutation,
  useGetMessagesQuery,
  useEditMessageMutation,
  useDeleteMessageMutation,
  useUploadAttachmentMutation,
  useMarkAsReadMutation,
} = messagesApi; 