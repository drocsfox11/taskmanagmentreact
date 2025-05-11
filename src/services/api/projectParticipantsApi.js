import { baseApi } from './baseApi';

const apiPrefix = 'api/projects';

export const projectParticipantsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    addProjectParticipant: builder.mutation({
      query: ({ projectId, user }) => ({
        url: `${apiPrefix}/${projectId}/participants/${user.id}`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, { projectId }) => [
        { type: 'Projects', id: projectId },
        'ProjectRights'
      ],
      async onQueryStarted({ projectId, user }, { dispatch, queryFulfilled, getState }) {

        const patchResult = dispatch(
          baseApi.util.updateQueryData('getProject', projectId,(draft) => {
            console.log('Inside update draft before:', draft);
              draft.participants.push(user);
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
      invalidatesTags: (result, error, { projectId }) => [
        { type: 'Projects', id: projectId },
        'ProjectRights'
      ],
      async onQueryStarted({ projectId, userId }, { dispatch, queryFulfilled, getState }) {

        const patchResult = dispatch(
          baseApi.util.updateQueryData('getProject', projectId, (draft) => {
              draft.participants = draft.participants.filter(p => p.id !== userId);
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