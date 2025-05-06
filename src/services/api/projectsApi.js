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
      transformResponse: (response) => {
        return response;
      },
      keepUnusedDataFor: 2,
    }),
    createProject: builder.mutation({
      query: (project) => ({
        url: `${apiPrefix}`,
        method: 'POST',
        body: project,
      }),
      invalidatesTags: ['Projects'],
    }),
    updateProject: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `${apiPrefix}/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Projects', id }],
      async onQueryStarted({ id, ...updates }, { dispatch, queryFulfilled }) {
        // Оптимистично обновляем UI
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
      invalidatesTags: ['Projects'],
    }),
    grantProjectRight: builder.mutation({
      query: ({ projectId, username, rightName }) => ({
        url: `${apiPrefix}/${projectId}/rights/grant`,
        method: 'POST',
        body: { username, rightName },
      }),
      invalidatesTags: (result, error, { projectId }) => [{ type: 'Projects', id: projectId }],
    }),
    revokeProjectRight: builder.mutation({
      query: ({ projectId, username, rightName }) => ({
        url: `${apiPrefix}/${projectId}/rights/revoke`,
        method: 'POST',
        body: { username, rightName },
      }),
      invalidatesTags: (result, error, { projectId }) => [{ type: 'Projects', id: projectId }],
    }),
    getUserRights: builder.query({
      query: ({ projectId, username }) => ({
        url: `${apiPrefix}/${projectId}/rights/users/username/${username}`,
      }),
      providesTags: (result, error, { projectId }) => [{ type: 'Projects', id: projectId }],
    }),
    addUserToAllBoards: builder.mutation({
      query: ({ projectId, username }) => ({
        url: `${apiPrefix}/${projectId}/boards/add-user/username/${username}`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, { projectId }) => [{ type: 'Projects', id: projectId }],
    }),
    removeUserFromAllBoards: builder.mutation({
      query: ({ projectId, username }) => ({
        url: `${apiPrefix}/${projectId}/boards/remove-user/username/${username}`,
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
  useAddUserToAllBoardsMutation,
  useRemoveUserFromAllBoardsMutation,
} = projectsApi;

// Re-export project participants mutations
export const {
  useAddProjectParticipantMutation,
  useRemoveProjectParticipantMutation,
} = projectParticipantsApi; 