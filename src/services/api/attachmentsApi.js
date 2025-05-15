import { baseApi } from './baseApi';

export const attachmentsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    uploadTaskAttachment: builder.mutation({
      query: ({ taskId, file }) => {
        const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 МБ в байтах
        if (file.size > MAX_FILE_SIZE) {
          throw new Error(`Файл ${file.name} превышает максимальный размер в 50 МБ`);
        }
        
        const formData = new FormData();
        formData.append('file', file);
        
        return {
          url: `api/attachments/upload?taskId=${taskId}`,
          method: 'POST',
          body: formData,
          formData: true,
        };
      },

    }),
    
    uploadTaskAttachments: builder.mutation({
      query: ({ taskId, files }) => {
        const formData = new FormData();
        
        console.log(`uploadTaskAttachments called with taskId=${taskId} and ${files?.length || 0} files`);
        
        const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 МБ в байтах
        const MAX_TOTAL_SIZE = 100 * 1024 * 1024; // 100 МБ в байтах
        
        if (Array.isArray(files)) {
          const oversizedFiles = files.filter(file => file.size > MAX_FILE_SIZE);
          if (oversizedFiles.length > 0) {
            throw new Error(`Следующие файлы превышают лимит в 50 МБ: ${oversizedFiles.map(f => f.name).join(', ')}`);
          }
          
          const totalSize = files.reduce((total, file) => total + file.size, 0);
          if (totalSize > MAX_TOTAL_SIZE) {
            throw new Error(`Общий размер файлов (${(totalSize / (1024 * 1024)).toFixed(2)} МБ) превышает лимит в 100 МБ`);
          }
          
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

    }),
    
    deleteAttachment: builder.mutation({
      query: (attachmentId) => ({
        url: `api/attachments/${attachmentId}`,
        method: 'DELETE',
      })
    }),
    
    deleteAllTaskAttachments: builder.mutation({
      query: (taskId) => ({
        url: `api/attachments/task/${taskId}`,
        method: 'DELETE',
      })
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