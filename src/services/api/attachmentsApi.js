import { baseApi } from './baseApi';

export const attachmentsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    uploadTaskAttachment: builder.mutation({
      query: ({ taskId, file }) => {
        const formData = new FormData();
        formData.append('file', file);
        
        return {
          url: `api/attachments/upload?taskId=${taskId}`,
          method: 'POST',
          body: formData,
          formData: true,
        };
      },
      invalidatesTags: (result, error, { taskId }) => [
        { type: 'Tasks', id: taskId },
        { type: 'Board', id: null }
      ],
    }),
    
    uploadTaskAttachments: builder.mutation({
      query: ({ taskId, files }) => {
        const formData = new FormData();
        
        console.log(`uploadTaskAttachments called with taskId=${taskId} and ${files?.length || 0} files`);
        

        if (Array.isArray(files)) {
          console.log('Files to upload:', files.map(f => ({ name: f.name, size: f.size, type: f.type })));
          files.forEach((file, index) => {
            console.log(`Appending file ${index+1}/${files.length}: ${file.name}`);
            formData.append('file', file);
          });
        }
        
        return {
          url: `api/attachments/upload?taskId=${taskId}`,
          method: 'POST',
          body: formData,
          formData: true,
        };
      },
      invalidatesTags: (result, error, { taskId }) => [
        { type: 'Tasks', id: taskId },
        { type: 'Board', id: null }
      ],
    }),
    
    deleteAttachment: builder.mutation({
      query: (attachmentId) => ({
        url: `api/attachments/${attachmentId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Tasks'],
    }),
    
    deleteAllTaskAttachments: builder.mutation({
      query: (taskId) => ({
        url: `api/attachments/task/${taskId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, taskId) => [
        { type: 'Tasks', id: taskId },
        { type: 'Board', id: null }
      ],
    }),
    
    getTaskAttachments: builder.query({
      query: (taskId) => `api/attachments/task/${taskId}`,
      providesTags: (result, error, taskId) => [
        { type: 'Tasks', id: taskId },
      ],
    }),
  }),
});

export const {
  useUploadTaskAttachmentMutation,
  useUploadTaskAttachmentsMutation,
  useDeleteAttachmentMutation,
  useDeleteAllTaskAttachmentsMutation,
  useGetTaskAttachmentsQuery,
} = attachmentsApi; 