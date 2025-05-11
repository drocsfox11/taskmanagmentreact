import { baseApi } from './baseApi';

// Экспортируем API из всех модулей - избегаем конфликтов
export { 
  // Projects API
  useGetProjectsQuery,
  useGetProjectQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useGetAllUserRightsQuery
} from './projectsApi';

// Re-export TasksAPI hooks
// These will now use the updated implementation with fixed delete functionality
export {
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useMoveTaskMutation,
} from './tasksApi';

export {
  // Boards API
  useGetBoardsQuery,
  useGetBoardWithDataQuery,
  useCreateBoardMutation,
  useUpdateBoardMutation,
  useDeleteBoardMutation,
  // Columns mutations - теперь из boardsApi
  useCreateColumnMutation,
  useUpdateColumnMutation, 
  useDeleteColumnMutation,
  useReorderColumnsMutation,

  // Tags mutations - теперь из boardsApi
  useCreateTagMutation,
  useUpdateTagMutation,
  useDeleteTagMutation
} from './boardsApi';

// API приглашений
export {
  useSendInvitationMutation,
  useAcceptInvitationMutation,
  useRejectInvitationMutation,
  useGetMyInvitationsQuery,
  useGetMyPendingInvitationsQuery
} from './invitationsApi';

// API пользователей
export * from './usersApi';

// API авторизации
export * from './authApi';

// Export attachments API hooks
export {
  useUploadTaskAttachmentMutation,
  useUploadTaskAttachmentsMutation,
  useDeleteAttachmentMutation,
  useGetTaskAttachmentsQuery,
} from './attachmentsApi';

// Chats API
export {
  useCreateChatMutation,
  useDeleteChatMutation,
  useGetMyChatsQuery,
  useGetChatByIdQuery,
  useAddParticipantMutation,
  useRemoveParticipantMutation,
  useChangeParticipantRoleMutation,
  useGetPagedChatsQuery,
} from './ChatsApi';

// Messages API
export {
  useSendMessageMutation,
  useGetMessagesQuery,
  useEditMessageMutation,
  useDeleteMessageMutation,
  useUploadAttachmentMutation,
  useMarkAsReadMutation,
} from './MessagesApi';

export const apiReducer = { [baseApi.reducerPath]: baseApi.reducer };
export const apiMiddleware = baseApi.middleware;