import { baseApi } from './baseApi';

const apiPrefix = 'api/projects';

export const projectParticipantsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    addProjectParticipant: builder.mutation({
      query: ({ projectId, userId }) => ({
        url: `${apiPrefix}/${projectId}/participants/${userId}`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, { projectId }) => [{ type: 'Projects', id: projectId }],
      async onQueryStarted({ projectId, userId, optimisticUpdate }, { dispatch, queryFulfilled }) {
        // Оптимистично обновляем UI
        const patchResult = dispatch(
          baseApi.util.updateQueryData('getProjects', undefined, (draft) => {
            const project = draft.find(p => p.id === projectId);
            if (project) {
              project.participants = optimisticUpdate.participants;
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
    removeProjectParticipant: builder.mutation({
      query: ({ projectId, userId }) => ({
        url: `${apiPrefix}/${projectId}/participants/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { projectId }) => [{ type: 'Projects', id: projectId }],
      async onQueryStarted({ projectId, userId, optimisticUpdate }, { dispatch, queryFulfilled }) {
        // Оптимистично обновляем UI
        const patchResult = dispatch(
          baseApi.util.updateQueryData('getProjects', undefined, (draft) => {
            const project = draft.find(p => p.id === projectId);
            if (project) {
              project.participants = optimisticUpdate.participants;
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
  }),
});

export const {
  useAddProjectParticipantMutation,
  useRemoveProjectParticipantMutation,
} = projectParticipantsApi; 