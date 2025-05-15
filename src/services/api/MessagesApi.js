import { baseApi } from './baseApi';

export const messagesApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    sendMessage: builder.mutation({
      query: ({ chatId, content }) => ({
        url: `api/chats/${chatId}/messages`,
        method: 'POST',
        body: { content },
      }),

      async onQueryStarted({ chatId, content, tempId}, { dispatch, queryFulfilled, getState }) {
        const patchResult = dispatch(
          messagesApi.util.updateQueryData('getMessages', { chatId }, (draft) => {
            if (!draft.messages) draft.messages = [];
            const state = getState();
            const currentUser = state.api.queries['getCurrentUser(undefined)']?.data;

            
            draft.messages.unshift({
              id: tempId,
              chatId,
              content,
              createdAt: new Date().toISOString(),
              senderId: currentUser.id,
              sender: {
                id: currentUser.id,
                name: currentUser.name,
                avatarURL: currentUser.avatarURL
              },
              edited: false,
              readByIds: [],
              attachments: [],
              isLocal: true,
            });
          })
        );

        try {
          const { data } = await queryFulfilled;
          dispatch(
            messagesApi.util.updateQueryData('getMessages', { chatId }, (draft) => {
              const localMsgIndex = draft.messages.findIndex(msg => msg.isLocal && msg.id === tempId);
              if (localMsgIndex !== -1) {
                draft.messages[localMsgIndex] = {
                  ...data,
                  senderId: data.sender.id,
                  isLocal: false,
                };
              }
            })
          );
          dispatch(
              messagesApi.util.updateQueryData('getPagedChats', {}, (draft) => {
                const chatIndex = draft.chats.findIndex(c => c.id === Number(chatId));
                if (chatIndex !== -1) {
                  draft.chats[chatIndex].lastMessage = data;
                }
              })
          );
        } catch (error) {
          patchResult.undo();
        }
      },
    }),
    sendMessageWithAttachments: builder.mutation({
      query: ({ chatId, content, files }) => {
        const formData = new FormData();
        formData.append('content', content);
        
        if (files && files.length > 0) {
          files.forEach(file => {
            formData.append('files', file);
          });
        }
        
        return {
          url: `api/chats/${chatId}/messages/with-attachments`,
          method: 'POST',
          body: formData,
          formData: true
        };
      },
      
      async onQueryStarted({ chatId, content, tempId, files = [] }, { dispatch, queryFulfilled, getState }) {
        const state = getState();
        const currentUser = state.api.queries['getCurrentUser(undefined)']?.data;
        
        const tempAttachments = files.map((file, index) => ({
          id: `temp-${index}`,
          originalFileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          isLocal: true
        }));
        
        const patchResult = dispatch(
          messagesApi.util.updateQueryData('getMessages', { chatId }, (draft) => {
            if (!draft.messages) draft.messages = [];
            
            draft.messages.unshift({
              id: tempId,
              chatId,
              content,
              createdAt: new Date().toISOString(),
              senderId: currentUser.id,
              sender: {
                id: currentUser.id,
                name: currentUser.name,
                avatarURL: currentUser.avatarURL
              },
              isEdited: false,
              readByIds: [],
              attachments: tempAttachments,
              isLocal: true
            });
          })
        );
        
        try {
          const { data } = await queryFulfilled;
          
          dispatch(
            messagesApi.util.updateQueryData('getMessages', { chatId }, (draft) => {
              const localMsgIndex = draft.messages.findIndex(msg => msg.isLocal && msg.id === tempId);
              if (localMsgIndex !== -1) {
                draft.messages[localMsgIndex] = {
                  ...data,
                  isLocal: false
                };
              }
            })
          );
          dispatch(
              messagesApi.util.updateQueryData('getPagedChats', {}, (draft) => {
                const chatIndex = draft.chats.findIndex(c => c.id === Number(chatId));
                if (chatIndex !== -1) {
                  draft.chats[chatIndex].lastMessage = data;
                }
              })
          );
        } catch (error) {
          patchResult.undo();
        }
      }
    }),
    getMessages: builder.query({
      query: ({ chatId, offset = 0, size = 20, excludeLocalMessages = false }) => ({
        url: `api/chats/${chatId}/messages`,
        params: { offset, size },
      }),
      transformResponse: (response, meta, { chatId }) => {

        const transformMessage = (msg) => {
          return {
            ...msg,
            isEdited: msg.edited,
            isLocal: false,
          };
        };
        
        if (response && response.messages) {
          return {
            messages: response.messages.map(transformMessage),
            hasNext: response.hasNext
          };
        }
        
        if (Array.isArray(response)) {
          return {
            messages: response.map(transformMessage),
            hasNext: response.length >= 20
          };
        }
        
        return {
          messages: [],
          hasNext: false
        };
      },
      providesTags: (result, error, { chatId }) => 
        result?.messages
          ? [
              ...result.messages.map(({ id }) => ({ type: 'Messages', id: `${chatId}-${id}` })),
              { type: 'Messages', id: chatId }
            ]
          : [{ type: 'Messages', id: chatId }],
      serializeQueryArgs: ({ queryArgs }) => {
        return { chatId: queryArgs.chatId };
      },
      merge: (currentCache, newItems, { arg }) => {
        if (arg.offset === 0) {
          return newItems;
        }
        
        const existingIds = new Set(currentCache.messages.map(msg => msg.id));
        const uniqueNewMessages = newItems.messages.filter(msg => !existingIds.has(msg.id));
        
        return {
          messages: [...currentCache.messages, ...uniqueNewMessages],
          hasNext: newItems.hasNext
        };
      },
      forceRefetch({ currentArg, previousArg }) {
        return currentArg?.chatId !== previousArg?.chatId || 
               currentArg?.offset !== previousArg?.offset;
      },
      keepUnusedDataFor: 5 * 60,
    }),
    editMessage: builder.mutation({
      query: ({ chatId, messageId, content }) => ({
        url: `api/chats/${chatId}/messages/${messageId}`,
        method: 'PUT',
        body: { content },
      }),

      async onQueryStarted({ chatId, messageId, content }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          messagesApi.util.updateQueryData('getMessages', { chatId }, (draft) => {
            const messageIndex = draft.messages.findIndex(msg => msg.id === messageId);
            if (messageIndex !== -1) {
              console.log("Меняю сообщение", messageId, content);
              draft.messages[messageIndex].content = content;
              draft.messages[messageIndex].isEdited = true;
            }
          })
        );

        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),
    deleteMessage: builder.mutation({
      query: ({ chatId, messageId }) => ({
        url: `api/chats/${chatId}/messages/${messageId}`,
        method: 'DELETE',
      }),

      async onQueryStarted({ chatId, messageId }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          messagesApi.util.updateQueryData('getMessages', { chatId }, (draft) => {
            draft.messages = draft.messages.filter(msg => msg.id !== messageId);
          })
        );

        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),
    uploadAttachment: builder.mutation({
      query: ({ chatId, messageId, file }) => {
        const formData = new FormData();
        formData.append('file', file);
        return {
          url: `api/chats/${chatId}/messages/${messageId}/uploadattachments/`,
          method: 'POST',
          body: formData,
          formData: true,
        };
      },
    }),
    markMultipleMessagesAsRead: builder.mutation({
      query: ({ chatId, messageIds }) => ({
        url: `api/chats/${chatId}/read`,
        method: 'POST',
        body: messageIds,
      }),

      async onQueryStarted({ chatId, messageIds }, { dispatch, queryFulfilled, getState }) {
        const state = getState();
        const currentUser = state.api.queries['getCurrentUser(undefined)']?.data;


        const patchResult = dispatch(
          messagesApi.util.updateQueryData('getMessages', { chatId }, (draft) => {
            messageIds.forEach(messageId => {
              const messageIndex = draft.messages.findIndex(msg => msg.id === messageId);
              if (messageIndex !== -1) {
                if (!draft.messages[messageIndex].readByIds) {
                  draft.messages[messageIndex].readByIds = [];
                }
                if (!draft.messages[messageIndex].readByIds.includes(currentUser.id)) {
                  draft.messages[messageIndex].readByIds.push(currentUser.id);
                }
              }
            });
          })
        );

        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),
  }),
  overrideExisting: false,
});

export const {
  useSendMessageMutation,
  useSendMessageWithAttachmentsMutation,
  useGetMessagesQuery,
  useEditMessageMutation,
  useDeleteMessageMutation,
  useUploadAttachmentMutation,
  useMarkMultipleMessagesAsReadMutation,
} = messagesApi; 