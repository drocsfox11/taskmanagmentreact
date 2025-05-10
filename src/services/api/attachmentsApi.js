import { baseApi } from './baseApi';

// API for handling file attachments
export const attachmentsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Upload attachment to a task
    uploadTaskAttachment: builder.mutation({
      // This needs to handle multipart/form-data for file uploads
      query: ({ taskId, file }) => {
        // Create a FormData object for the file upload
        const formData = new FormData();
        // Don't append taskId to FormData, it should be in the URL
        formData.append('file', file);
        
        return {
          url: `api/attachments/upload?taskId=${taskId}`,
          method: 'POST',
          // Don't set Content-Type here, it will be set automatically with boundary
          body: formData,
          // This is important to not process the FormData
          formData: true,
        };
      },
      invalidatesTags: (result, error, { taskId }) => [
        { type: 'Tasks', id: taskId },
        { type: 'Board', id: null }
      ],
    }),
    
    // Upload multiple attachments in one call
    uploadTaskAttachments: builder.mutation({
      // Handle multiple files upload
      query: ({ taskId, files }) => {
        const formData = new FormData();
        
        // Don't append taskId to FormData, it should be a request parameter
        // The server expects taskId as a request parameter, not in the form data
        
        // Append each file to the FormData with the correct parameter name 'file' 
        if (Array.isArray(files)) {
          files.forEach(file => {
            // The server expects each file with the parameter name 'file'
            formData.append('file', file);
          });
        }
        
        return {
          // Include taskId as a URL parameter
          url: `api/attachments/upload?taskId=${taskId}`,
          method: 'POST',
          body: formData,
          formData: true,
        };
      },
      invalidatesTags: (result, error, { taskId }) => [
        { type: 'Tasks', id: taskId },
        { type: 'Board', id: null } // Invalidate board cache to reflect attachment changes
      ],
    }),
    
    // Delete an attachment
    deleteAttachment: builder.mutation({
      query: (attachmentId) => ({
        url: `api/attachments/${attachmentId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Tasks'],
    }),
    
    // Delete all attachments for a task
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
    
    // Get attachments for a task
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