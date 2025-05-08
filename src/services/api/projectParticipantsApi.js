import { baseApi } from './baseApi';

const apiPrefix = 'api/projects';

export const projectParticipantsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    addProjectParticipant: builder.mutation({
      query: ({ projectId, user }) => ({
        url: `${apiPrefix}/${projectId}/participants/${user.id}`,
        method: 'POST',
      }),
      async onQueryStarted({ projectId, user }, { dispatch, queryFulfilled, getState }) {

        const patchResult = dispatch(
          baseApi.util.updateQueryData('getProjects', undefined,(draft) => {
            console.log('Inside update draft before:', draft);
            const project = draft.find(p => p.id === projectId);
            if (project && !project.participants.some(p => p.id === user.id)) {
              project.participants.push(user);
            }
            console.log('Inside update draft after:', draft);
          })
        );

        try {
          await queryFulfilled;
        } catch (error) {
          patchResult.undo();
        }
      },
    }),
    removeProjectParticipant: builder.mutation({
      query: ({ projectId, userId }) => ({
        url: `${apiPrefix}/${projectId}/participants/${userId}`,
        method: 'DELETE',
      }),
      async onQueryStarted({ projectId, userId }, { dispatch, queryFulfilled, getState }) {

        const patchResult = dispatch(
          baseApi.util.updateQueryData('getProjects', undefined, (draft) => {
            const project = draft.find(p => p.id === projectId);
            if (project && project.participants) {
              project.participants = project.participants.filter(p => p.id !== userId);
            }
          })
        );

        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
      invalidatesTags: (result, error, { projectId }) => [
        { type: 'Projects', id: projectId }
      ],
    }),
  }),
});

export const {
  useAddProjectParticipantMutation,
  useRemoveProjectParticipantMutation,
} = projectParticipantsApi;