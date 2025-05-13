import { baseApi } from './baseApi';



/**
 * @deprecated Используйте вместо этого соответствующие хуки из boardsApi.js
 * ВАЖНО: Эти хуки теперь экспортируются из boardsApi.js и не должны использоваться напрямую отсюда
 * Для получения задач используйте результат из запроса board/full
 */
export const tasksApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTasks: builder.query({
      query: (boardId) => `boards/${boardId}/tasks`,
      providesTags: ['Tasks'],
    }),
    getTask: builder.query({
      query: (taskId) => ({url: `tasks/${taskId}`}),
      providesTags: (result, error, id) => [{ type: 'Tasks', id }],
    }),
    getTasksByColumn: builder.query({
      query: (columnId) => `columns/${columnId}/tasks`,
      providesTags: (result, error, id) => [
        { type: 'Tasks', id: `column-${id}` },
      ],
    }),
    getTasksByProject: builder.query({
      query: (projectId) => ({
        url: `api/tasks/project/${projectId}`,
        method: 'GET'
      }),
      providesTags: (result, error, projectId) => [
        { type: 'Tasks', id: `project-${projectId}` }
      ]
    }),
    getTasksHistoryByBoard: builder.query({
      query: (boardId) => ({
        url: `api/task-history/board/${boardId}`,
        method: 'GET'
      }),
      providesTags: (result, error, boardId) => [
        { type: 'Tasks', id: `board-history-${boardId}` }
      ]
    }),
    createTask: builder.mutation({
      query: (task) => ({
        url: 'api/tasks',
        method: 'POST',
        body: task,
      }),
      async onQueryStarted(task, { dispatch, queryFulfilled }) {
        const tempId = `temp-${Date.now()}`;

        try {
          const { data: createdTask } = await queryFulfilled;

          dispatch(
            baseApi.util.updateQueryData('getBoardWithData', task.boardId, (draft) => {
              const column = draft.columns.find(col => col.id === task.columnId);
              if (column) {
                const existingTaskIndex = column.tasks.findIndex(t => t.id === createdTask.id);
                if (existingTaskIndex === -1) {
                  column.tasks.push(createdTask);
                  column.tasks.forEach((t, index) => {
                    t.position = index;
                  });
                }
              }
            })
          );
        } catch (error) {
          console.error('Failed to create task:', error);
        }
      }
    }),
    updateTask: builder.mutation({
      query: ({ id, ...updates }) => ({
        url: `api/tasks/${id}`,
        method: 'PUT',
        body: updates,
      }),
      async onQueryStarted({ id, boardId, columnId, ...updates }, { dispatch, queryFulfilled }) {
        console.log(`Optimistically updating task ${id} in column ${columnId}, board ${boardId}`);
        
        console.log('Task updates:', updates);
        
        const patchResult = dispatch(
            baseApi.util.updateQueryData('getBoardWithData', boardId, (draft) => {
              let foundTask = false;
              draft.columns.forEach(column => {
                const taskIndex = column.tasks.findIndex(t => t.id === id);
                if (taskIndex !== -1) {
                  foundTask = true;
                  console.log(`Found task ${id} in column ${column.id}`);
                  
                  const taskId = column.tasks[taskIndex].id;
                  const taskPosition = column.tasks[taskIndex].position;
                  
                  const updatedTask = {
                    ...column.tasks[taskIndex], 
                    ...updates,
                    id: taskId,
                    position: taskPosition
                  };
                  
                  column.tasks[taskIndex] = updatedTask;
                }
              });
              
              if (!foundTask) {
                console.warn(`Task ${id} not found in any column of board ${boardId}`);
              }
            })
        );

        try {
          const result = await queryFulfilled;
          console.log(`Server response for task ${id} update:`, result);
        } catch (error) {
          console.error(`Error updating task ${id}:`, error);
          patchResult.undo();
        }
      }
      
    }),
    deleteTask: builder.mutation({
      query: (params) => {
        const taskId = typeof params === 'object' ? params.id : params;
        return {
          url: `api/tasks/${taskId}`,
          method: 'DELETE',
          params: { socketEvent: true },
        };
      },
      async onQueryStarted(params, { dispatch, queryFulfilled }) {
        const id = typeof params === 'object' ? params.id : params;
        const boardId = typeof params === 'object' ? params.boardId : undefined;
        
        if (!boardId) return;
        
        console.log(`Starting optimistic update for task deletion: Task ${id} from board ${boardId}`);
        
        const patchResult = dispatch(
            baseApi.util.updateQueryData('getBoardWithData', boardId, (draft) => {
              draft.columns.forEach(column => {
                const taskIndex = column.tasks.findIndex(t => t.id === id);
                if (taskIndex !== -1) {
                  column.tasks.splice(taskIndex, 1);
                  column.tasks.forEach((task, index) => {
                    task.position = index;
                  });
                  console.log(`Optimistically removed task ${id} from column ${column.id}`);
                }
              });
            })
        );

        try {
          await queryFulfilled;
          console.log(`Task ${id} deleted successfully`);
          
        } catch (error) {
          console.error(`Error deleting task ${id}:`, error);
          patchResult.undo();
        }
      }
    }),
    moveTask: builder.mutation({
      query: ({ taskId, sourceColumnId, targetColumnId, newPosition }) => ({
        url: `api/tasks/${taskId}/move`,
        method: 'PUT',
        body: {
          sourceColumnId,
          targetColumnId,
          newPosition
        },
      }),
      async onQueryStarted({ taskId, sourceColumnId, targetColumnId, newPosition, boardId }, { dispatch, queryFulfilled }) {
        console.log('Moving task with data:', { taskId, sourceColumnId, targetColumnId, newPosition, boardId });
        
        const patchResult = dispatch(
            baseApi.util.updateQueryData('getBoardWithData', boardId, (draft) => {
              const sourceColumn = draft.columns.find(col => col.id === sourceColumnId);
              if (!sourceColumn) {
                console.error(`Source column ${sourceColumnId} not found`);
                return;
              }

              const taskIndex = sourceColumn.tasks.findIndex(t => t.id === taskId);
              if (taskIndex === -1) {
                console.error(`Task ${taskId} not found in source column ${sourceColumnId}`);
                return;
              }

              const task = { ...sourceColumn.tasks[taskIndex] };

              sourceColumn.tasks.splice(taskIndex, 1);

              if (sourceColumnId !== targetColumnId) {
                const targetColumn = draft.columns.find(col => col.id === targetColumnId);
                if (targetColumn) {
                  task.columnId = targetColumnId;

                  targetColumn.tasks.splice(newPosition, 0, task);

                  sourceColumn.tasks.forEach((t, i) => {
                    t.position = i;
                    console.log(`Updating task ${t.id} position to ${i} in source column`);
                  });
                  targetColumn.tasks.forEach((t, i) => { 
                    t.position = i;
                    console.log(`Updating task ${t.id} position to ${i} in target column`);
                  });
                } else {
                  console.error(`Target column ${targetColumnId} not found`);
                  sourceColumn.tasks.splice(taskIndex, 0, task);
                }
              } else {
                sourceColumn.tasks.splice(newPosition, 0, task);

                sourceColumn.tasks.forEach((t, i) => {
                  t.position = i;
                  console.log(`Updating task ${t.id} position to ${i} in column`);
                });
              }
            })
        );

        try {
          const result = await queryFulfilled;
          console.log('Task moved successfully on server:', result);
        } catch (error) {
          console.error('Failed to move task:', error);
          patchResult.undo();
        }
      }
    }),
  }),
});

export const {
  useGetTaskQuery,
  useGetTasksByColumnQuery,
  useGetTasksByProjectQuery,
  useGetTasksHistoryByBoardQuery,
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useMoveTaskMutation,
} = tasksApi;