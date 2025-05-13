import { baseApi } from './baseApi';

export {
  useGetProjectsQuery,
  useGetProjectQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useGetAllUserRightsQuery
} from './projectsApi';


export {
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useMoveTaskMutation,
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
  useCreateChatMutation,
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
  useMarkAsReadMutation,
} from './MessagesApi';

export const apiReducer = { [baseApi.reducerPath]: baseApi.reducer };
export const apiMiddleware = baseApi.middleware;