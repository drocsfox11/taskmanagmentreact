import { baseApi } from './baseApi';

const apiPrefix = 'api/invitations';

export const invitationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    sendInvitation: builder.mutation({
      query: ({ recipientId, projectId }) => ({
        url: `${apiPrefix}/send`,
        method: 'POST',
        params: { recipientId, projectId },
      }),
      invalidatesTags: ['Invitations'],
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
    getMyInvitations: builder.query({
      query: () => ({url: `${apiPrefix}/my`}),
      providesTags: ['Invitations'],
    }),
    getMyPendingInvitations: builder.query({
      query: () => ({url:`${apiPrefix}/my/pending`}),
      providesTags: ['Invitations'],
    }),
  }),
});

export const {
  useSendInvitationMutation,
  useAcceptInvitationMutation,
  useRejectInvitationMutation,
  useGetMyInvitationsQuery,
  useGetMyPendingInvitationsQuery,
} = invitationsApi; 