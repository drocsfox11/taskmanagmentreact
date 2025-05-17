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
      keepUnusedDataFor: 0,
    }),
    getProject: builder.query({
      query: (id) => ({url:`${apiPrefix}/${id}`}),
      providesTags: (result, error, id) => [{ type: 'Projects', id }],
      keepUnusedDataFor: 0,
    }),
    createProject: builder.mutation({
      query: (project) => ({
        url: `${apiPrefix}`,
        method: 'POST',
        body: project,
      }),
      async onQueryStarted(projectData, { dispatch, queryFulfilled }) {
        const tempId = `temp-${Date.now()}`;
        
        const patchResult = dispatch(
          baseApi.util.updateQueryData('getProjects', undefined, (draft) => {
            const optimisticProject = {
              id: tempId,
              ...projectData,
              participants: [],
              owner: {
                username: 'me'
              },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            
            draft.unshift(optimisticProject);
          })
        );
        
        try {
          const { data: createdProject } = await queryFulfilled;
          
          dispatch(
            baseApi.util.updateQueryData('getProjects', undefined, (draft) => {
              const tempIndex = draft.findIndex(p => p.id === tempId);
              if (tempIndex !== -1) {
                draft.splice(tempIndex, 1);
              }
              
              draft.unshift(createdProject);
            })
          );
        } catch (error) {
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
        const patchResult = dispatch(
          baseApi.util.updateQueryData('getProjects', undefined, (draft) => {
            const projectIndex = draft.findIndex(project => project.id === id);
            
            if (projectIndex !== -1) {
              const deletedProject = draft[projectIndex];
              console.log(`Оптимистично удаляем проект с ID ${id}:`, deletedProject);
              
              draft.splice(projectIndex, 1);
            }
          })
        );
        
        try {
          await queryFulfilled;
          console.log(`Проект с ID ${id} успешно удален на сервере`);
          
        } catch (error) {
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
    getCurrentUserRights: builder.query({
      query: () => ({
        url: `api/user-project-rights/`,
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
    }),
    removeUserFromAllBoards: builder.mutation({
      query: ({ projectId, userId }) => ({
        url: `${apiPrefix}/${projectId}/boards/remove-user/${userId}`,
        method: 'DELETE',
      }),
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
  useGetCurrentUserRightsQuery,
  useAddUserToAllBoardsMutation,
  useRemoveUserFromAllBoardsMutation,
} = projectsApi;

export const {
  useAddProjectParticipantMutation,
  useRemoveProjectParticipantMutation,
} = projectParticipantsApi; 