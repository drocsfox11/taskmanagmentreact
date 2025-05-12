import { baseApi } from './baseApi';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const apiPrefix = 'api/boards';
const WS_URL = process.env.REACT_APP_WS_URL || 'http://localhost:8080';

const stompConnections = {};

const getStompConnection = (boardId) => {
  if (!stompConnections[boardId]) {
    const socket = new SockJS(`${WS_URL}/ws`, {
      method: 'GET',
      credentials: 'include',
    });
    
    const client = new Client({
      webSocketFactory: () => socket,
      debug: function (str) {
        console.log(`STOMP: ${str}`);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    const subscriptions = {};
    
    client.onConnect = (frame) => {
      console.log(`STOMP connection established for board ${boardId}:`, frame);
      

      subscriptions.boardEvents = client.subscribe(
        `/topic/boards/${boardId}`, 
        (message) => {
          try {
            if (stompConnections[boardId] && stompConnections[boardId].messageHandler) {
              const data = JSON.parse(message.body);
              console.log(`Received message for board ${boardId}:`, data);
              stompConnections[boardId].messageHandler(data);
            }
          } catch (error) {
            console.error('STOMP message error:', error);
          }
        }
      );
    };
    
    client.onStompError = (frame) => {
      console.error(`STOMP error for board ${boardId}:`, frame.headers['message'], frame.body);
    };
    
    client.onWebSocketError = (event) => {
      console.error(`WebSocket error for board ${boardId}:`, event);
    };
    
    client.onDisconnect = () => {
      console.log(`STOMP disconnected for board ${boardId}`);
    };
    
    client.beforeConnect = () => {
      console.log(`Attempting to connect to STOMP server for board ${boardId}...`);
    };
    
    client.activate();
    
    const sendAction = (action, payload) => {
      if (client.connected) {
        client.publish({
          destination: `/app/boards/${boardId}`,
          body: JSON.stringify({
            type: action,
            payload: { ...payload, socketEvent: true }
          })
        });
        console.log(`Sent ${action} to board ${boardId}:`, payload);
        return true;
      } else {
        console.error(`STOMP not connected for board ${boardId}`);
        return false;
      }
    };
    
    stompConnections[boardId] = {
      client,
      subscriptions,
      sendAction,
      messageHandler: null,
      
      setMessageHandler: (handler) => {
        stompConnections[boardId].messageHandler = handler;
      },
      
      disconnect: () => {
        Object.values(subscriptions).forEach(subscription => {
          if (subscription && subscription.unsubscribe) {
            subscription.unsubscribe();
          }
        });
        
        if (client.connected) {
          client.deactivate();
        }
        
        delete stompConnections[boardId];
      }
    };
  }
  
  return stompConnections[boardId];
};

export const boardsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getBoards: builder.query({
      query: (projectId) => ({url:`${apiPrefix}/project/${projectId}`}),
      providesTags: ['Boards'],
    }),
    getBoardWithData: builder.query({
      query: (boardId) => ({url:`${apiPrefix}/${boardId}`}),
      providesTags: (result, error, id) => [
        { type: 'Board', id }
      ],
      
      async onCacheEntryAdded(
        boardId,
        { updateCachedData, cacheDataLoaded, cacheEntryRemoved, dispatch, getState }
      ) {
        await cacheDataLoaded;
        
        try {
          const stompConn = getStompConnection(boardId);
          
          stompConn.setMessageHandler((data) => {
            const state = getState();
            const currentUser = state.api.queries['getCurrentUser(undefined)']?.data;
            const currentUserId = currentUser?.id;
            const currentUsername = currentUser?.username || currentUser?.login;
            
            console.log("WS event received:", data.type, "payload:", data.payload);
            console.log("Current user:", currentUserId, currentUsername);
            
            if (data.payload && (
                (data.payload.initiatedById && data.payload.initiatedById === currentUserId) || 
                (data.payload.initiatedBy && data.payload.initiatedBy === currentUsername)
            )) {
              console.log(`Игнорируем собственное действие: ${data.type}`);
              return;
            }
            
            switch (data.type) {
              case 'BOARD_UPDATED':
                updateCachedData((draft) => {
                  draft.id = data.payload.id || draft.id;
                  draft.title = data.payload.title || draft.title;
                  draft.description = data.payload.description || draft.description;
                  draft.projectId = data.payload.projectId || draft.projectId;
                  draft.emoji = data.payload.emoji || draft.emoji;
                  
                  if (data.payload.participants) {
                    draft.participants = data.payload.participants;
                  }
                  
                  if (data.payload.tags) {
                    draft.tags = data.payload.tags;
                  }
                });
                break;
              
              case 'TAG_CREATED':
                updateCachedData((draft) => {
                  draft.tags.push(data.payload);
                });
                break;
                
              case 'TAG_UPDATED':
                updateCachedData((draft) => {
                  const index = draft.tags.findIndex(tag => tag.id === data.payload.id);
                  if (index !== -1) {
                    draft.tags[index] = { ...draft.tags[index], ...data.payload };
                  }
                });
                break;
                
              case 'TAG_DELETED':
                updateCachedData((draft) => {
                  const index = draft.tags.findIndex(tag => tag.id === data.payload.id);
                  if (index !== -1) {
                    draft.tags.splice(index, 1);
                  }
                });
                break;
              
              case 'COLUMN_CREATED':
                console.log('Processing COLUMN_CREATED websocket event from another user');
                updateCachedData((draft) => {
                  const existingColumnIndex = draft.columns.findIndex(col =>
                    col.id === data.payload.columnId || 
                    col.columnId === data.payload.columnId
                  );
                  
                  if (existingColumnIndex === -1) {
                    const newColumn = {
                      id: data.payload.columnId,
                      columnId: data.payload.columnId,
                      title: data.payload.title,
                      name: data.payload.title,
                      boardId: boardId,
                      position: data.payload.position,
                      tasks: []
                    };
                    
                    console.log('Adding new column to board:', newColumn);
                    draft.columns.push(newColumn);
                  } else {
                    console.log('Column already exists, not adding duplicate:', data.payload.columnId);
                  }
                });
                break;
                
              case 'COLUMN_UPDATED':
                updateCachedData((draft) => {
                  const index = draft.columns.findIndex(col =>
                    col.id === data.payload.id || 
                    (data.payload.columnId && col.id === data.payload.columnId)
                  );
                  
                  if (index !== -1) {
                    const tasks = draft.columns[index].tasks || [];
                    draft.columns[index] = { 
                      ...draft.columns[index],
                      id: data.payload.id || draft.columns[index].id,
                      name: data.payload.name || draft.columns[index].name,
                      title: data.payload.title || data.payload.name || draft.columns[index].title || draft.columns[index].name,
                      boardId: data.payload.boardId || draft.columns[index].boardId,
                      position: data.payload.position !== undefined ? data.payload.position : draft.columns[index].position,
                      tasks: tasks
                    };
                  } else {
                    console.log('Column not found for update, adding new one:', data.payload);
                    draft.columns.push({
                      ...data.payload,
                      tasks: []
                    });
                  }
                });
                break;
                
              case 'COLUMN_DELETED':
                console.log('WebSocket COLUMN_DELETED event received:', data.payload);
                updateCachedData((draft) => {
                  const index = draft.columns.findIndex(col =>
                    col.id === data.payload.columnId || col.id === data.payload.id
                  );
                  
                  if (index !== -1) {
                    console.log('Removing column from draft at index:', index);
                    draft.columns.splice(index, 1);
                  } else {
                    console.log('Column not found in draft, id:', data.payload.columnId || data.payload.id);
                  }
                });
                break;
                
              case 'COLUMNS_REORDERED':
                updateCachedData((draft) => {
                  const currentColumns = [...draft.columns];
                  
                  const newColumns = [];
                  
                  data.payload.columns.forEach(({ id, position }) => {
                    const column = currentColumns.find(col => col.id === id);
                    if (column) {
                      newColumns.push({
                        ...column,
                        position
                      });
                    }
                  });
                  
                  draft.columns = newColumns;
                });
                break;
              
              case 'TASK_CREATED':
                console.log('Processing TASK_CREATED websocket event:', data.payload);
                updateCachedData((draft) => {
                  const taskData = {
                    ...data.payload,
                    id: data.payload.id || data.payload.taskId,
                  };
                  
                  const columnIndex = draft.columns.findIndex(col => col.id === taskData.columnId);
                  if (columnIndex !== -1) {
                    console.log(`Adding task ${taskData.id} to column ${taskData.columnId}`);
                    const taskExists = draft.columns[columnIndex].tasks.some(task => task.id === taskData.id);
                    if (!taskExists) {
                      draft.columns[columnIndex].tasks.push(taskData);
                    } else {
                      console.log(`Task ${taskData.id} already exists in column ${taskData.columnId}, not adding duplicate`);
                    }
                  } else {
                    console.log(`Column ${taskData.columnId} not found for adding task ${taskData.id}`);
                  }
                });
                
                dispatch(baseApi.util.invalidateTags([
                  { type: 'Tasks', id: `board-history-${boardId}` }
                ]));
                break;
                
              case 'TASK_UPDATED':
                console.log('Processing TASK_UPDATED websocket event:', data.payload);
                updateCachedData((draft) => {
                  const taskData = {
                    ...data.payload,
                    id: data.payload.id || data.payload.taskId,
                  };
                  
                  const columnIndex = draft.columns.findIndex(col => col.id === taskData.columnId);
                  if (columnIndex !== -1) {
                    const taskIndex = draft.columns[columnIndex].tasks.findIndex(task => task.id === taskData.id);
                    if (taskIndex !== -1) {
                      console.log(`Updating task ${taskData.id} in column ${taskData.columnId}`);
                      draft.columns[columnIndex].tasks[taskIndex] = {
                        ...draft.columns[columnIndex].tasks[taskIndex],
                        ...taskData 
                      };
                    } else {
                      console.log(`Task ${taskData.id} not found in column ${taskData.columnId} for update`);
                    }
                  } else {
                    console.log(`Column ${taskData.columnId} not found for task ${taskData.id} update`);
                  }
                });
                
                dispatch(baseApi.util.invalidateTags([
                  { type: 'Tasks', id: `board-history-${boardId}` }
                ]));
                break;
                
              case 'TASK_DELETED':
                console.log('Processing TASK_DELETED websocket event:', data.payload);
                updateCachedData((draft) => {
                  draft.columns.forEach(column => {
                    const taskId = data.payload.id || data.payload.taskId;
                    const taskIndex = column.tasks.findIndex(task => task.id === taskId);
                    
                    if (taskIndex !== -1) {
                      console.log(`Found task to delete at index ${taskIndex} in column ${column.id}`);
                      column.tasks.splice(taskIndex, 1);
                      
                      column.tasks.forEach((task, index) => {
                        task.position = index;
                      });
                      
                      console.log(`Task ${taskId} deleted from column ${column.id} via WebSocket`);
                    }
                  });
                });
                
                dispatch(baseApi.util.invalidateTags([
                  { type: 'Tasks', id: `board-history-${boardId}` }
                ]));
                break;
                
              case 'TASK_MOVED':
                console.log('Processing TASK_MOVED websocket event:', data.payload);
                updateCachedData((draft) => {
                  const taskId = data.payload.taskId || data.payload.id;
                  const { sourceColumnId, targetColumnId, newPosition } = data.payload;
                  
                  console.log(`Moving task ${taskId} from column ${sourceColumnId} to column ${targetColumnId} at position ${newPosition}`);
                  
                  const sourceColIndex = draft.columns.findIndex(col => col.id === sourceColumnId);
                  if (sourceColIndex === -1) {
                    console.log(`Source column ${sourceColumnId} not found`);
                    return;
                  }
                  
                  const taskIndex = draft.columns[sourceColIndex].tasks.findIndex(task => task.id === taskId);
                  if (taskIndex === -1) {
                    console.log(`Task ${taskId} not found in source column ${sourceColumnId}`);
                    return;
                  }
                  
                  const task = { ...draft.columns[sourceColIndex].tasks[taskIndex] };
                  
                  draft.columns[sourceColIndex].tasks.splice(taskIndex, 1);
                  console.log(`Removed task from source column ${sourceColumnId}`);
                  
                  if (sourceColumnId !== targetColumnId) {
                    const destColIndex = draft.columns.findIndex(col => col.id === targetColumnId);
                    if (destColIndex === -1) {
                      console.log(`Target column ${targetColumnId} not found`);
                      return;
                    }
                    
                    task.columnId = targetColumnId;
                    
                    draft.columns[destColIndex].tasks.splice(newPosition, 0, task);
                    console.log(`Added task to target column ${targetColumnId} at position ${newPosition}`);
                  } else {
                    draft.columns[sourceColIndex].tasks.splice(newPosition, 0, task);
                    console.log(`Moved task within same column ${sourceColumnId} to position ${newPosition}`);
                  }
                  
                  if (sourceColumnId !== targetColumnId) {
                    draft.columns[sourceColIndex].tasks.forEach((task, index) => {
                      task.position = index;
                    });
                    
                    const destColIndex = draft.columns.findIndex(col => col.id === targetColumnId);
                    if (destColIndex !== -1) {
                      draft.columns[destColIndex].tasks.forEach((task, index) => {
                        task.position = index;
                      });
                    }
                  } else {
                    draft.columns[sourceColIndex].tasks.forEach((task, index) => {
                      task.position = index;
                    });
                  }
                  
                  console.log(`Task ${taskId} successfully moved via WebSocket`);
                });
                
                dispatch(baseApi.util.invalidateTags([
                  { type: 'Tasks', id: `board-history-${boardId}` }
                ]));
                break;
                
              default:
                console.log('Неизвестный тип события STOMP:', data.type);
                break;
            }
          });
          
          await cacheEntryRemoved;
          
          if (stompConnections[boardId]) {
            stompConnections[boardId].disconnect();
          }
        } catch (err) {
          console.error('STOMP connection error:', err);
        }
      },
    }),
    createBoard: builder.mutation({
      query: (board) => ({
        url: `${apiPrefix}`,
        method: 'POST',
        body: board,
      }),
      invalidatesTags: ['Boards'],
    }),
    updateBoard: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `${apiPrefix}/${id}`,
        method: 'PUT',
        body: { ...data, socketEvent: true },
      }),
      async onQueryStarted({ id, ...updates }, { dispatch, queryFulfilled }) {
        console.log('Starting board update with data:', updates);
        
        const patchResult = dispatch(
          baseApi.util.updateQueryData('getBoardWithData', id, (draft) => {
            Object.assign(draft, {
              ...draft,
              ...updates,
            });
            
            if (updates.tags) {
              draft.tags = updates.tags;
            }
          })
        );
        
        if (updates.projectId) {
          try {
            dispatch(
              baseApi.util.updateQueryData('getBoards', updates.projectId, (draft) => {
                if (Array.isArray(draft)) {
                  const boardIndex = draft.findIndex(board => board.id === id);
                  if (boardIndex !== -1) {
                    draft[boardIndex] = {
                      ...draft[boardIndex],
                      ...updates
                    };
                  }
                }
              })
            );
          } catch (error) {
            console.error('Error updating board in project boards list:', error);
          }
        }
        
        try {
          const result = await queryFulfilled;
          console.log('Board update response:', result);
          
          if (result && result.data) {
            dispatch(
              baseApi.util.updateQueryData('getBoardWithData', id, (draft) => {
                const columns = draft.columns ? [...draft.columns] : [];
                
                Object.assign(draft, result.data);
                
                draft.columns = columns;
              })
            );
            
            if (result.data.projectId) {
              dispatch(
                baseApi.util.updateQueryData('getBoards', result.data.projectId, (draft) => {
                  if (Array.isArray(draft)) {
                    const boardIndex = draft.findIndex(board => board.id === id);
                    if (boardIndex !== -1) {
                      draft[boardIndex] = {
                        ...draft[boardIndex],
                        ...result.data
                      };
                    } else if (result.data) {
                      draft.push(result.data);
                    }
                  }
                })
              );
            }
          }
        } catch (error) {
          console.error('Error updating board:', error);
          patchResult.undo();
        }
      }
    }),
    deleteBoard: builder.mutation({
      query: (id) => ({
        url: `${apiPrefix}/${id}`,
        method: 'DELETE',
        body: { socketEvent: true },
      }),
      async onQueryStarted(id, { dispatch, queryFulfilled, getState }) {
        try {
          const state = getState();
          const boardData = state.api.queries[`getBoardWithData(${id})`]?.data;
          const projectId = boardData?.projectId;
          
          console.log(`Optimistically deleting board ${id} from project ${projectId}`);
          
          if (projectId) {
            const boardsInProjectPatchResult = dispatch(
              baseApi.util.updateQueryData('getBoards', projectId, (draft) => {
                if (Array.isArray(draft)) {
                  const boardIndex = draft.findIndex(board => board.id === id);
                  if (boardIndex !== -1) {
                    draft.splice(boardIndex, 1);
                    console.log(`Removed board ${id} from project ${projectId} boards list`);
                  }
                }
              })
            );
            
            try {
              await queryFulfilled;
              console.log(`Delete board ${id} request successful`);
            } catch (error) {
              boardsInProjectPatchResult.undo();
              console.error(`Error deleting board ${id}:`, error);
            }
          } else {
            await queryFulfilled;
            console.log(`Delete board ${id} request successful without projectId`);
          }
        } catch (error) {
          console.error(`Error during board deletion optimistic update:`, error);
        }
      }
    }),
    createColumn: builder.mutation({
      query: ({ boardId, ...column }) => ({
        url: `${apiPrefix}/${boardId}/columns`,
        method: 'POST',
        body: column,
      }),
      async onQueryStarted({ boardId, ...column }, { dispatch, queryFulfilled }) {
        const tempId = `temp-${Date.now()}`;
        
        const patchResult = dispatch(
          baseApi.util.updateQueryData('getBoardWithData', boardId, (draft) => {
            const existingColumn = draft.columns.find(col =>
              (col.title === column.title && col.position === column.position) ||
              col.tempId === tempId
            );
            
            if (!existingColumn) {
              draft.columns.push({
                ...column,
                id: tempId,
                tempId: tempId,
                tasks: []
              });
            } else {
              console.log('Similar column already exists, not adding duplicate:', column);
            }
          })
        );

        try {
          const { data: createdColumn } = await queryFulfilled;
          
          dispatch(
            baseApi.util.updateQueryData('getBoardWithData', boardId, (draft) => {
              const tempColumnIndex = draft.columns.findIndex(col => col.tempId === tempId);
              if (tempColumnIndex !== -1) {
                draft.columns.splice(tempColumnIndex, 1);
              }
              
              const existingColumnIndex = draft.columns.findIndex(col =>
                col.id === createdColumn.id || col.columnId === createdColumn.id
              );
              
              if (existingColumnIndex === -1) {
                draft.columns.push({
                  ...createdColumn,
                  tasks: []
                });
              } else {
                draft.columns[existingColumnIndex] = {
                  ...draft.columns[existingColumnIndex],
                  ...createdColumn,
                  tasks: draft.columns[existingColumnIndex].tasks || []
                };
              }
            })
          );
        } catch (error) {
          console.error('Error creating column:', error);
          patchResult.undo();
        }
      },
      invalidatesTags: ['Columns']
    }),
    updateColumn: builder.mutation({
      query: ({ boardId, columnId, ...updates }) => ({
        url: `${apiPrefix}/${boardId}/columns/${columnId}`,
        method: 'PUT',
        body: updates,
      }),
      async onQueryStarted({ boardId, columnId, ...updates }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          baseApi.util.updateQueryData('getBoardWithData', boardId, (draft) => {
            const columnIndex = draft.columns.findIndex(col => col.id === columnId);
            if (columnIndex !== -1) {
              draft.columns[columnIndex] = {
                ...draft.columns[columnIndex],
                ...updates
              };
            }
          })
        );

        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
      invalidatesTags: ['Columns']
    }),
    deleteColumn: builder.mutation({
      query: ({ boardId, columnId }) => {
        console.log('Sending DELETE request for column:', { boardId, columnId });
        return {
          url: `${apiPrefix}/${boardId}/columns/${columnId}?socketEvent=true`,
          method: 'DELETE',
        };
      },
      async onQueryStarted({ boardId, columnId }, { dispatch, queryFulfilled }) {
        console.log('Starting optimistic update for column deletion:', { boardId, columnId });
        const patchResult = dispatch(
          baseApi.util.updateQueryData('getBoardWithData', boardId, (draft) => {
            const columnIndex = draft.columns.findIndex(col => col.id === columnId || col.columnId === columnId);
            if (columnIndex !== -1) {
              console.log('Optimistically removing column at index:', columnIndex);
              draft.columns.splice(columnIndex, 1);
            } else {
              console.log('Column not found for optimistic update, id:', columnId);
            }
          })
        );

        try {
          const result = await queryFulfilled;
          console.log('Delete column request successful:', result);
        } catch (error) {
          console.error('Delete column request failed. Raw error object: ', error);
          console.error('Delete column request failed. Stringified error object: ', JSON.stringify(error));
          if (!(error.error && error.error.status === 500 &&
                typeof error.error.data === 'string' &&
                error.error.data.startsWith("Failed to execute 'json' on 'Response': Unexpected end of JSON input"))) {
            patchResult.undo();
            console.log('Request truly failed or unknown error (status: ' + (error.error ? error.error.status : 'unknown') + '), undoing optimistic update.');
          } else {
            console.log('Server likely returned success but with an empty/invalid JSON response, keeping optimistic update.');
          }
        }
      },
      invalidatesTags: ['Columns']
    }),
    reorderColumns: builder.mutation({
      query: ({ boardId, columns }) => ({
        url: `${apiPrefix}/${boardId}/columns/reorder`,
        method: 'PUT',
        body: { columns },
      }),
      async onQueryStarted({ boardId, columns }, { dispatch, queryFulfilled, getState }) {
        const state = getState();
        const boardData = state.api.queries[`getBoardWithData(${boardId})`]?.data;
        
        if (!boardData) return;

        const newColumns = [...boardData.columns];
        
        const updatedColumns = newColumns.map(col => {
          const update = columns.find(c => c.id === col.id);
          if (update) {
            return { ...col, position: update.position };
          }
          return col;
        });


        const patchResult = dispatch(
          baseApi.util.updateQueryData('getBoardWithData', boardId, (draft) => {
            draft.columns = updatedColumns;
          })
        );

        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      }
    }),

    createTag: builder.mutation({
      query: (tag) => ({
        url: `${apiPrefix}/tags`,
        method: 'POST',
        body: tag,
      }),
      async onQueryStarted(tag, { dispatch, queryFulfilled }) {
        const tempId = `temp-${Date.now()}`;
        
        const patchResult = dispatch(
          baseApi.util.updateQueryData('getBoardWithData', tag.boardId, (draft) => {
            draft.tags.push({
              ...tag,
              id: tempId
            });
          })
        );

        try {
          const { data: createdTag } = await queryFulfilled;
          
          dispatch(
            baseApi.util.updateQueryData('getBoardWithData', tag.boardId, (draft) => {
              const tagIndex = draft.tags.findIndex(t => t.id === tempId);
              if (tagIndex !== -1) {
                draft.tags[tagIndex] = createdTag;
              }
            })
          );
        } catch {
          patchResult.undo();
        }
      },
      invalidatesTags: ['Tags']
    }),
    updateTag: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `${apiPrefix}/tags/${id}`,
        method: 'PUT',
        body: data,
      }),
      async onQueryStarted({ id, boardId, ...updates }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          baseApi.util.updateQueryData('getBoardWithData', boardId, (draft) => {
            const tagIndex = draft.tags.findIndex(t => t.id === id);
            if (tagIndex !== -1) {
              Object.assign(draft.tags[tagIndex], updates);
            }
          })
        );

        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
      invalidatesTags: ['Tags']
    }),
    deleteTag: builder.mutation({
      query: (id) => ({
        url: `${apiPrefix}/tags/${id}`,
        method: 'DELETE',
      }),
      async onQueryStarted({ id, boardId }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          baseApi.util.updateQueryData('getBoardWithData', boardId, (draft) => {
            const tagIndex = draft.tags.findIndex(t => t.id === id);
            if (tagIndex !== -1) {
              draft.tags.splice(tagIndex, 1);
            }
          })
        );

        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
      invalidatesTags: ['Tags']
    }),
    getBoardUserRights: builder.query({
      query: ({ boardId, userId }) => ({
        url: `${apiPrefix}/${boardId}/rights/users/${userId}`,
      }),
      providesTags: (result, error, { boardId }) => [{ type: 'Board', id: boardId }],
    }),
    addUserToBoard: builder.mutation({
      query: ({ boardId, userId }) => ({
        url: `${apiPrefix}/${boardId}/participants/${userId}`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, { boardId }) => [{ type: 'Board', id: boardId }],
    }),
    grantBoardRight: builder.mutation({
      query: ({ boardId, userId, rightName }) => ({
        url: `${apiPrefix}/${boardId}/rights/grant`,
        method: 'POST',
        body: { userId, rightName },
      }),
      async onQueryStarted({ boardId, userId, rightName }, { dispatch, queryFulfilled }) {
        const queryKey = { boardId, userId };
        
        const patchResult = dispatch(
          baseApi.util.updateQueryData('getBoardUserRights', queryKey, (draft) => {
            if (Array.isArray(draft) && !draft.includes(rightName)) {
              draft.push(rightName);
            }
          })
        );
        
        try {
          await queryFulfilled;
        } catch (error) {
          patchResult.undo();
          console.error('Failed to grant board right:', error);
        }
      },
    }),
    revokeBoardRight: builder.mutation({
      query: ({ boardId, userId, rightName }) => ({
        url: `${apiPrefix}/${boardId}/rights/revoke`,
        method: 'POST',
        body: { userId, rightName },
      }),
      async onQueryStarted({ boardId, userId, rightName }, { dispatch, queryFulfilled }) {
        const queryKey = { boardId, userId };
        
        const patchResult = dispatch(
          baseApi.util.updateQueryData('getBoardUserRights', queryKey, (draft) => {
            if (Array.isArray(draft)) {
              const index = draft.indexOf(rightName);
              if (index !== -1) {
                draft.splice(index, 1);
              }
            }
          })
        );
        
        try {
          await queryFulfilled;
        } catch (error) {
          patchResult.undo();
          console.error('Failed to revoke board right:', error);
        }
      },
    }),
    removeUserFromBoard: builder.mutation({
      query: ({ boardId, userId }) => ({
        url: `${apiPrefix}/${boardId}/rights/users/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { boardId }) => [{ type: 'Board', id: boardId }],
    }),
    getVisibleBoards: builder.query({
      query: (projectId) => ({
        url: `${apiPrefix}/visible?projectId=${projectId}`,
      }),
      providesTags: ['Boards'],
    }),
  }),
});

export const {
  useGetBoardsQuery,
  useGetBoardWithDataQuery,
  useCreateBoardMutation,
  useUpdateBoardMutation,
  useDeleteBoardMutation,
  useCreateColumnMutation,
  useUpdateColumnMutation,
  useDeleteColumnMutation,
  useReorderColumnsMutation,
  useCreateTagMutation,
  useUpdateTagMutation,
  useDeleteTagMutation,
  useGetBoardUserRightsQuery,
  useAddUserToBoardMutation,
  useGrantBoardRightMutation,
  useRevokeBoardRightMutation,
  useRemoveUserFromBoardMutation,
  useGetVisibleBoardsQuery,
} = boardsApi; 