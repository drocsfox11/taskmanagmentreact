import { baseApi } from './baseApi';

// Экспортируем API из всех модулей - избегаем конфликтов
export { 
  // Projects API
  useGetProjectsQuery,
  useGetProjectQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation
} from './projectsApi';
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

// Эти хуки все еще могут быть полезны отдельно, но мы их не экспортируем напрямую в *.js файлах
// вместо этого используем именованный импорт из соответствующих файлов при необходимости
// например: import { useGetColumnsQuery } from '../services/api/columnsApi';

// API пользователей
export * from './usersApi';

// API авторизации
export * from './authApi';

// Экспортируем reducerPath и middleware для конфигурации Redux store
export const apiReducer = { [baseApi.reducerPath]: baseApi.reducer };
export const apiMiddleware = baseApi.middleware; 