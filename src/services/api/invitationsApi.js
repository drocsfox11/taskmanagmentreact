import { baseApi } from './baseApi';

const apiPrefix = 'api/invitations';

export const invitationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    sendInvitation: builder.mutation({
      query: ({ user, projectId }) => ({
        url: `${apiPrefix}/send`,
        method: 'POST',
        params: { recipientId: user.id, projectId },
      }),
      async onQueryStarted({ projectId, user }, { dispatch, queryFulfilled }) {
        const tempId = 'temp-' + Date.now();
        
        const tempInvitation = {
          id: tempId,
          projectId,
          recipient: user,
          recipientId: user.id,
          status: 'PENDING',
          createdAt: new Date().toISOString()
        };
        
        const patchResult = dispatch(
          baseApi.util.updateQueryData('getProject', projectId, (draft) => {
            draft.invitations.push(tempInvitation);
          })
        );

        try {
          const { data } = await queryFulfilled;
          
          dispatch(
            baseApi.util.updateQueryData('getProject', projectId, (draft) => {
              const index = draft.invitations.findIndex(inv => inv.id === tempId);
              if (index !== -1) {
                const recipient = draft.invitations[index].recipient;
                draft.invitations[index] = {
                  ...data,
                  recipient: data.recipient || recipient,
                };
              }
            })
          );
        } catch (error) {
          patchResult.undo();
        }
      },
    }),
    acceptInvitation: builder.mutation({
      query: (invitationId) => ({
        url: `${apiPrefix}/${invitationId}/accept`,
        method: 'POST',
      }),
      invalidatesTags: ['Invitations', 'ProjectParticipants'],
    }),
    rejectInvitation: builder.mutation({
      query: (invitationId) => ({
        url: `${apiPrefix}/${invitationId}/reject`,
        method: 'POST',
      }),
      invalidatesTags: ['Invitations'],
    }),
    cancelInvitation: builder.mutation({
      query: ({invitationId, projectId}) => ({
        url: `${apiPrefix}/${invitationId}/cancel`,
        method: 'POST',
      }),
      async onQueryStarted({ invitationId, projectId }, { dispatch, queryFulfilled }) {

        const patchResult = dispatch(
          baseApi.util.updateQueryData('getProject', projectId, (draft) => {
            const index = draft.invitations.findIndex(invitation => invitation.id === invitationId);
            if (index !== -1) {
              draft.invitations.splice(index, 1);
            }
          })
        );

        try {
          await queryFulfilled;
        } catch (error) {
          patchResult.undo();
        }
      },
    }),
    getMyInvitations: builder.query({
      query: () => ({url: `${apiPrefix}/my`}),
      providesTags: ['Invitations'],
    }),
    getMyPendingInvitations: builder.query({
      query: () => ({url:`${apiPrefix}/my/pending`}),
      providesTags: ['Invitations'],
    }),
    getProjectInvitations: builder.query({
      query: (projectId) => ({url:`${apiPrefix}/project/${projectId}`}),
      providesTags: ['ProjectInvitations'],
      keepUnusedDataFor: 2,
    }),
  }),
});

export const {
  useSendInvitationMutation,
  useAcceptInvitationMutation,
  useRejectInvitationMutation,
  useCancelInvitationMutation,
  useGetMyInvitationsQuery,
  useGetMyPendingInvitationsQuery,
  useGetProjectInvitationsQuery,
} = invitationsApi;