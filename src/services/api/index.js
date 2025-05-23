import { baseApi } from './baseApi';
import { 
  initializeWebSocketConnection, 
  disconnectWebSocket,
  subscribeToChatTopic,
  subscribeToBoardTopic,
  unsubscribeFromTopic,
  unsubscribeFromAllChatsExcept,
  unsubscribeFromAllBoardsExcept,
  sendBoardAction,
  ChatEventTypes,
  BoardEventTypes
} from './WebSocketService';

export {
  initializeWebSocketConnection, 
  disconnectWebSocket,
  subscribeToChatTopic,
  subscribeToBoardTopic,
  unsubscribeFromTopic,
  unsubscribeFromAllChatsExcept,
  unsubscribeFromAllBoardsExcept,
  sendBoardAction,
  ChatEventTypes,
  BoardEventTypes
};

export {
  useGetProjectsQuery,
  useGetProjectQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useGetCurrentUserRightsQuery
} from './projectsApi';


export {
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useMoveTaskMutation,
  useGetTasksByProjectQuery
} from './tasksApi';

export {
  useGetBoardsQuery,
  useGetBoardWithDataQuery,
  useCreateBoardMutation,
  useUpdateBoardMutation,
  useDeleteBoardMutation,
  useCreateColumnMutation,
  useUpdateColumnMutation, 
  useDeleteColumnMutation,
  useReorderColumnsMutation,

  useCreateTagMutation,
  useUpdateTagMutation,
  useDeleteTagMutation
} from './boardsApi';

export {
  useSendInvitationMutation,
  useAcceptInvitationMutation,
  useRejectInvitationMutation,
  useGetMyInvitationsQuery,
  useGetMyPendingInvitationsQuery
} from './invitationsApi';

export * from './usersApi';

export * from './authApi';

export {
  useUploadTaskAttachmentMutation,
  useUploadTaskAttachmentsMutation,
  useDeleteAttachmentMutation,
  useGetTaskAttachmentsQuery,
} from './attachmentsApi';

export {
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
} from './ChatsApi';

export {
  useSendMessageMutation,
  useSendMessageWithAttachmentsMutation,
  useGetMessagesQuery,
  useEditMessageMutation,
  useDeleteMessageMutation,
  useUploadAttachmentMutation,
  useMarkMultipleMessagesAsReadMutation
} from './MessagesApi';

export {
  useSearchTasksMutation
} from './searchApi';

export const apiReducer = { [baseApi.reducerPath]: baseApi.reducer };
export const apiMiddleware = baseApi.middleware;