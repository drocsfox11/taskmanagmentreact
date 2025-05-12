import { baseApi } from './baseApi';
import { projectParticipantsApi } from './projectParticipantsApi';

const apiPrefix = 'api/projects';

export const projectsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProjects: builder.query({
      query: () => ({url:`${apiPrefix}/my`}),
      providesTags: ['Projects'],
      transformResponse: (response) => {
        return response;
      },
      keepUnusedDataFor: 2,
    }),
    getProject: builder.query({
      query: (id) => ({url:`${apiPrefix}/${id}`}),
      providesTags: (result, error, id) => [{ type: 'Projects', id }],
      keepUnusedDataFor: 2,
    }),
    createProject: builder.mutation({
      query: (project) => ({
        url: `${apiPrefix}`,
        method: 'POST',
        body: project,
      }),
      invalidatesTags: ['ProjectRights'],
      async onQueryStarted(projectData, { dispatch, queryFulfilled }) {
        // Создаем временный ID для оптимистичного обновления
        const tempId = `temp-${Date.now()}`;
        
        // Оптимистично добавляем проект в кэш
        const patchResult = dispatch(
          baseApi.util.updateQueryData('getProjects', undefined, (draft) => {
            // Создаем объект проекта с временным ID и данными формы
            const optimisticProject = {
              id: tempId,
              ...projectData,
              // Добавляем пустой массив участников и владельца (текущего пользователя)
              participants: [],
              owner: {
                username: 'me' // Будет заменено реальными данными после ответа сервера
              },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            
            // Добавляем в начало списка проектов
            draft.unshift(optimisticProject);
          })
        );
        
        try {
          // Ждем ответа от сервера
          const { data: createdProject } = await queryFulfilled;
          
          // Обновляем кэш с реальными данными проекта
          dispatch(
            baseApi.util.updateQueryData('getProjects', undefined, (draft) => {
              // Находим и удаляем временный проект
              const tempIndex = draft.findIndex(p => p.id === tempId);
              if (tempIndex !== -1) {
                draft.splice(tempIndex, 1);
              }
              
              // Добавляем реальный проект в начало списка
              draft.unshift(createdProject);
            })
          );
        } catch (error) {
          // Если произошла ошибка, отменяем оптимистичное обновление
          patchResult.undo();
          console.error('Failed to create project:', error);
        }
      }
    }),
    updateProject: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `${apiPrefix}/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Projects', id }],
      async onQueryStarted({ id, ...updates }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          baseApi.util.updateQueryData('getProjects', undefined, (draft) => {
            const project = draft.find(p => p.id === id);
            if (project) {
              Object.assign(project, updates);
            }
          })
        );
        
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      }
    }),
    deleteProject: builder.mutation({
      query: (id) => ({
        url: `${apiPrefix}/${id}`,
        method: 'DELETE',
      }),
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        // Оптимистично удаляем проект из кэша
        const patchResult = dispatch(
          baseApi.util.updateQueryData('getProjects', undefined, (draft) => {
            // Находим индекс проекта по id
            const projectIndex = draft.findIndex(project => project.id === id);
            
            // Если проект найден, удаляем его из массива
            if (projectIndex !== -1) {
              // Сохраняем копию проекта для возможного восстановления
              const deletedProject = draft[projectIndex];
              console.log(`Оптимистично удаляем проект с ID ${id}:`, deletedProject);
              
              // Удаляем проект из массива
              draft.splice(projectIndex, 1);
            }
          })
        );
        
        try {
          // Ждем ответа от сервера
          await queryFulfilled;
          console.log(`Проект с ID ${id} успешно удален на сервере`);
          
          // Также инвалидируем кэш прав, так как удаление проекта влияет на права пользователя
          dispatch(baseApi.util.invalidateTags(['ProjectRights']));
        } catch (error) {
          // Если произошла ошибка, отменяем оптимистичное обновление
          patchResult.undo();
          console.error(`Ошибка при удалении проекта с ID ${id}:`, error);
        }
      },
    }),
    grantProjectRight: builder.mutation({
      query: ({ projectId, userId, rightName }) => ({
        url: `${apiPrefix}/${projectId}/rights/grant`,
        method: 'POST',
        body: { userId, rightName },
      }),
      async onQueryStarted({ projectId, userId, rightName }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          baseApi.util.updateQueryData('getAllUserRights', userId, (draft) => {
            if (!draft[projectId]) {
              draft[projectId] = [];
            }
            
            if (!draft[projectId].includes(rightName)) {
              draft[projectId].push(rightName);
            }
          })
        );
        
        try {
          await queryFulfilled;
        } catch (error) {
          patchResult.undo();
          console.error('Failed to grant project right:', error);
        }
      },
    }),
    revokeProjectRight: builder.mutation({
      query: ({ projectId, userId, rightName }) => ({
        url: `${apiPrefix}/${projectId}/rights/revoke`,
        method: 'POST',
        body: { userId, rightName },
      }),
      async onQueryStarted({ projectId, userId, rightName }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          baseApi.util.updateQueryData('getAllUserRights', userId, (draft) => {
            if (draft[projectId]) {
              draft[projectId] = draft[projectId].filter(right => right !== rightName);
            }
          })
        );
        
        try {
          await queryFulfilled;
        } catch (error) {
          patchResult.undo();
          console.error('Failed to revoke project right:', error);
        }
      },
    }),
    getUserRights: builder.query({
      query: ({ projectId, userId }) => ({
        url: `${apiPrefix}/${projectId}/rights/users/${userId}`,
      }),
      providesTags: (result, error, { projectId }) => [{ type: 'Projects', id: projectId }],
    }),
    getAllUserRights: builder.query({
      query: (userId) => ({
        url: `api/user-project-rights/${userId}`,
      }),
      providesTags: ['ProjectRights'],
      transformResponse: (response) => {
        return response.projectRights || {};
      },
    }),
    addUserToAllBoards: builder.mutation({
      query: ({ projectId, userId }) => ({
        url: `${apiPrefix}/${projectId}/boards/add-user/${userId}`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, { projectId }) => [{ type: 'Projects', id: projectId }],
    }),
    removeUserFromAllBoards: builder.mutation({
      query: ({ projectId, userId }) => ({
        url: `${apiPrefix}/${projectId}/boards/remove-user/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { projectId }) => [{ type: 'Projects', id: projectId }],
    }),
  }),
});

export const {
  useGetProjectsQuery,
  useGetProjectQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useGrantProjectRightMutation,
  useRevokeProjectRightMutation,
  useGetUserRightsQuery,
  useGetAllUserRightsQuery,
  useAddUserToAllBoardsMutation,
  useRemoveUserFromAllBoardsMutation,
} = projectsApi;

// Re-export project participants mutations
export const {
  useAddProjectParticipantMutation,
  useRemoveProjectParticipantMutation,
} = projectParticipantsApi; 