import { baseApi } from './baseApi';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const apiPrefix = 'api/boards';
const WS_URL = process.env.REACT_APP_WS_URL || 'http://localhost:8080';

// Глобальная переменная для STOMP-соединений по boardId
const stompConnections = {};

// Функция для получения или создания STOMP-соединения
const getStompConnection = (boardId) => {
  if (!stompConnections[boardId]) {
    // Создаем SockJS соединение 
    // SockJS должен подключаться к основному эндпоинту сокета, обычно это /ws
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

    // Состояние подписок
    const subscriptions = {};
    
    // Обработчик при установке соединения
    client.onConnect = (frame) => {
      console.log(`STOMP connection established for board ${boardId}:`, frame);
      
      // Подписываемся на события доски
      // Правильный формат для подписки на события в Spring WebSocket
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
    
    // Обработчики ошибок
    client.onStompError = (frame) => {
      console.error(`STOMP error for board ${boardId}:`, frame.headers['message'], frame.body);
    };
    
    client.onWebSocketError = (event) => {
      console.error(`WebSocket error for board ${boardId}:`, event);
    };
    
    client.onDisconnect = () => {
      console.log(`STOMP disconnected for board ${boardId}`);
    };
    
    // Настраиваем логирование для лучшей отладки
    client.beforeConnect = () => {
      console.log(`Attempting to connect to STOMP server for board ${boardId}...`);
    };
    
    // Активируем соединение
    client.activate();
    
    // Метод для отправки действий
    const sendAction = (action, payload) => {
      if (client.connected) {
        // Стандартное соглашение для отправки сообщений в Spring WebSocket через STOMP
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
    
    // Создаем объект соединения с необходимыми методами
    stompConnections[boardId] = {
      client,
      subscriptions,
      sendAction,
      messageHandler: null,
      
      // Метод для установки обработчика сообщений
      setMessageHandler: (handler) => {
        stompConnections[boardId].messageHandler = handler;
      },
      
      // Метод для отключения (используется при удалении компонента)
      disconnect: () => {
        // Отписываемся от всех подписок
        Object.values(subscriptions).forEach(subscription => {
          if (subscription && subscription.unsubscribe) {
            subscription.unsubscribe();
          }
        });
        
        // Отключаем клиент
        if (client.connected) {
          client.deactivate();
        }
        
        // Удаляем соединение из кеша
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
      
      // STOMP-подписка для обновлений в режиме реального времени
      async onCacheEntryAdded(
        boardId,
        { updateCachedData, cacheDataLoaded, cacheEntryRemoved, dispatch, getState }
      ) {
        // Ждём, пока данные загрузятся в кеш
        await cacheDataLoaded;
        
        try {
          // Устанавливаем STOMP-соединение для конкретной доски
          const stompConn = getStompConnection(boardId);
          
          // Устанавливаем обработчик сообщений
          stompConn.setMessageHandler((data) => {
            // Получаем данные о текущем пользователе из store
            const state = getState();
            const currentUser = state.api.queries['getCurrentUser(undefined)']?.data;
            const currentUserId = currentUser?.id;
            const currentUsername = currentUser?.username || currentUser?.login;
            
            console.log("WS event received:", data.type, "payload:", data.payload);
            console.log("Current user:", currentUserId, currentUsername);
            
            // Проверяем, инициировано ли это событие текущим пользователем
            // Проверяем как initiatedById (числовой ID), так и initiatedBy (имя пользователя/логин)
            if (data.payload && (
                (data.payload.initiatedById && data.payload.initiatedById === currentUserId) || 
                (data.payload.initiatedBy && data.payload.initiatedBy === currentUsername)
            )) {
              console.log(`Игнорируем собственное действие: ${data.type}`);
              return; // Пропускаем обработку своих событий
            }
            
            // Обрабатываем события различных типов
            switch (data.type) {
              // События обновления доски
              case 'BOARD_UPDATED':
                updateCachedData((draft) => {
                  // Обновляем основные данные доски
                  draft.id = data.payload.id || draft.id;
                  draft.title = data.payload.title || draft.title;
                  draft.description = data.payload.description || draft.description;
                  draft.projectId = data.payload.projectId || draft.projectId;
                  
                  // Обновляем участников, если они предоставлены
                  if (data.payload.participants) {
                    draft.participants = data.payload.participants;
                  }
                  
                  // Обновляем теги, если они предоставлены
                  if (data.payload.tags) {
                    draft.tags = data.payload.tags;
                  }
                });
                break;
              
              // События тегов
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
              
              // События колонок
              case 'COLUMN_CREATED':
                console.log('Processing COLUMN_CREATED websocket event from another user');
                updateCachedData((draft) => {
                  // Check if column already exists to prevent duplicates
                  const existingColumnIndex = draft.columns.findIndex(col => 
                    col.id === data.payload.columnId || 
                    col.columnId === data.payload.columnId
                  );
                  
                  if (existingColumnIndex === -1) {
                    // Only add if column doesn't already exist
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
                  // Check both id and columnId properties but make sure they are an exact match
                  const index = draft.columns.findIndex(col => 
                    col.id === data.payload.id || 
                    (data.payload.columnId && col.id === data.payload.columnId)
                  );
                  
                  if (index !== -1) {
                    // Обновляем только поля колонки, сохраняя задачи
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
                    // If column doesn't exist, add it with empty tasks array
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
                  // Fix: Check both id and columnId properties since the payload might use either one
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
                  // Получаем текущие колонки и их задачи
                  const currentColumns = [...draft.columns];
                  
                  // Создаем новый порядок колонок
                  const newColumns = [];
                  
                  // Для каждого id в новом порядке находим соответствующую колонку
                  data.payload.columns.forEach(({ id, position }) => {
                    const column = currentColumns.find(col => col.id === id);
                    if (column) {
                      // Обновляем позицию и добавляем в новый массив
                      newColumns.push({
                        ...column,
                        position
                      });
                    }
                  });
                  
                  draft.columns = newColumns;
                });
                break;
              
              // События задач
              case 'TASK_CREATED':
                console.log('Processing TASK_CREATED websocket event:', data.payload);
                updateCachedData((draft) => {
                  // Normalize task ID
                  const taskData = {
                    ...data.payload,
                    id: data.payload.id || data.payload.taskId,
                  };
                  
                  // Находим колонку, к которой относится задача
                  const columnIndex = draft.columns.findIndex(col => col.id === taskData.columnId);
                  if (columnIndex !== -1) {
                    console.log(`Adding task ${taskData.id} to column ${taskData.columnId}`);
                    // Проверяем, не существует ли уже такая задача
                    const taskExists = draft.columns[columnIndex].tasks.some(task => task.id === taskData.id);
                    if (!taskExists) {
                      // Добавляем задачу в массив задач колонки
                      draft.columns[columnIndex].tasks.push(taskData);
                    } else {
                      console.log(`Task ${taskData.id} already exists in column ${taskData.columnId}, not adding duplicate`);
                    }
                  } else {
                    console.log(`Column ${taskData.columnId} not found for adding task ${taskData.id}`);
                  }
                });
                break;
                
              case 'TASK_UPDATED':
                console.log('Processing TASK_UPDATED websocket event:', data.payload);
                updateCachedData((draft) => {
                  // Normalize task ID
                  const taskData = {
                    ...data.payload,
                    id: data.payload.id || data.payload.taskId,
                  };
                  
                  // Находим колонку, содержащую задачу
                  const columnIndex = draft.columns.findIndex(col => col.id === taskData.columnId);
                  if (columnIndex !== -1) {
                    // Находим индекс задачи в колонке
                    const taskIndex = draft.columns[columnIndex].tasks.findIndex(task => task.id === taskData.id);
                    if (taskIndex !== -1) {
                      console.log(`Updating task ${taskData.id} in column ${taskData.columnId}`);
                      // Обновляем задачу
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
                break;
                
              case 'TASK_DELETED':
                console.log('Processing TASK_DELETED websocket event:', data.payload);
                updateCachedData((draft) => {
                  // Проходим по всем колонкам
                  draft.columns.forEach(column => {
                    // Находим индекс задачи, проверяем как id, так и taskId
                    const taskId = data.payload.id || data.payload.taskId;
                    const taskIndex = column.tasks.findIndex(task => task.id === taskId);
                    
                    if (taskIndex !== -1) {
                      console.log(`Found task to delete at index ${taskIndex} in column ${column.id}`);
                      // Удаляем задачу
                      column.tasks.splice(taskIndex, 1);
                      
                      // Update the position of remaining tasks
                      column.tasks.forEach((task, index) => {
                        task.position = index;
                      });
                      
                      console.log(`Task ${taskId} deleted from column ${column.id} via WebSocket`);
                    }
                  });
                });
                break;
                
              case 'TASK_MOVED':
                console.log('Processing TASK_MOVED websocket event:', data.payload);
                updateCachedData((draft) => {
                  // Normalize task ID
                  const taskId = data.payload.taskId || data.payload.id;
                  const { sourceColumnId, targetColumnId, newPosition } = data.payload;
                  
                  console.log(`Moving task ${taskId} from column ${sourceColumnId} to column ${targetColumnId} at position ${newPosition}`);
                  
                  // Находим исходную колонку
                  const sourceColIndex = draft.columns.findIndex(col => col.id === sourceColumnId);
                  if (sourceColIndex === -1) {
                    console.log(`Source column ${sourceColumnId} not found`);
                    return;
                  }
                  
                  // Находим задачу в исходной колонке
                  const taskIndex = draft.columns[sourceColIndex].tasks.findIndex(task => task.id === taskId);
                  if (taskIndex === -1) {
                    console.log(`Task ${taskId} not found in source column ${sourceColumnId}`);
                    return;
                  }
                  
                  // Копируем задачу перед удалением
                  const task = { ...draft.columns[sourceColIndex].tasks[taskIndex] };
                  
                  // Удаляем задачу из исходной колонки
                  draft.columns[sourceColIndex].tasks.splice(taskIndex, 1);
                  console.log(`Removed task from source column ${sourceColumnId}`);
                  
                  // Если перемещение в другую колонку
                  if (sourceColumnId !== targetColumnId) {
                    // Находим целевую колонку
                    const destColIndex = draft.columns.findIndex(col => col.id === targetColumnId);
                    if (destColIndex === -1) {
                      console.log(`Target column ${targetColumnId} not found`);
                      return;
                    }
                    
                    // Обновляем columnId задачи
                    task.columnId = targetColumnId;
                    
                    // Вставляем задачу в новую позицию в целевой колонке
                    draft.columns[destColIndex].tasks.splice(newPosition, 0, task);
                    console.log(`Added task to target column ${targetColumnId} at position ${newPosition}`);
                  } else {
                    // Вставляем задачу в новую позицию в той же колонке
                    draft.columns[sourceColIndex].tasks.splice(newPosition, 0, task);
                    console.log(`Moved task within same column ${sourceColumnId} to position ${newPosition}`);
                  }
                  
                  // Обновляем позиции всех задач в затронутых колонках
                  if (sourceColumnId !== targetColumnId) {
                    // Обновляем позиции в исходной колонке
                    draft.columns[sourceColIndex].tasks.forEach((task, index) => {
                      task.position = index;
                    });
                    
                    // Находим индекс целевой колонки
                    const destColIndex = draft.columns.findIndex(col => col.id === targetColumnId);
                    if (destColIndex !== -1) {
                      // Обновляем позиции в целевой колонке
                      draft.columns[destColIndex].tasks.forEach((task, index) => {
                        task.position = index;
                      });
                    }
                  } else {
                    // Обновляем позиции только в одной колонке
                    draft.columns[sourceColIndex].tasks.forEach((task, index) => {
                      task.position = index;
                    });
                  }
                  
                  console.log(`Task ${taskId} successfully moved via WebSocket`);
                });
                break;
                
              default:
                console.log('Неизвестный тип события STOMP:', data.type);
                break;
            }
          });
          
          // Закрываем соединение, когда компонент размонтирован
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
      // Добавляем инвалидацию нужных тегов
      invalidatesTags: (result, error, arg) => [
        { type: 'Board', id: arg.id },
        'Boards',
        'Tags'
      ],
      // Делаем оптимистичное обновление
      async onQueryStarted({ id, ...updates }, { dispatch, queryFulfilled }) {
        console.log('Starting board update with data:', updates);
        const patchResult = dispatch(
          baseApi.util.updateQueryData('getBoardWithData', id, (draft) => {
            // Обновляем основные поля доски
            Object.assign(draft, {
              ...draft,
              ...updates,
            });
            
            // Обрабатываем обновление тегов отдельно, если они есть
            if (updates.tags) {
              draft.tags = updates.tags;
            }
          })
        );
        
        try {
          const result = await queryFulfilled;
          console.log('Board update response:', result);
          
          if (result && result.data) {
            console.log('Updating cache with server data:', result.data);
            // Принудительно обновляем кэш с данными с сервера, полностью заменяя локальные данные
            dispatch(
              baseApi.util.updateQueryData('getBoardWithData', id, (draft) => {
                // Сохраняем колонки и задачи, так как они отдельно обрабатываются
                const columns = draft.columns ? [...draft.columns] : []; 
                
                // Полная замена данных доски с сервера
                Object.assign(draft, result.data);
                
                // Восстанавливаем колонки и задачи, так как их нет в ответе updateBoard
                draft.columns = columns;
              })
            );
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
      invalidatesTags: ['Boards'],
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
            // Check if a column with similar properties already exists to prevent duplicates
            const existingColumn = draft.columns.find(col => 
              (col.title === column.title && col.position === column.position) ||
              col.tempId === tempId
            );
            
            if (!existingColumn) {
              draft.columns.push({
                ...column,
                id: tempId,
                tempId: tempId, // Add a tempId to track this column
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
              // Find and remove any temporary columns with the same tempId
              const tempColumnIndex = draft.columns.findIndex(col => col.tempId === tempId);
              if (tempColumnIndex !== -1) {
                draft.columns.splice(tempColumnIndex, 1);
              }
              
              // Check if column with the same ID already exists
              const existingColumnIndex = draft.columns.findIndex(col => 
                col.id === createdColumn.id || col.columnId === createdColumn.id
              );
              
              if (existingColumnIndex === -1) {
                // Only add if it doesn't already exist
                draft.columns.push({
                  ...createdColumn,
                  tasks: []
                });
              } else {
                // Update existing column with server data
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
              // Create a new object instead of using Object.assign to prevent reference issues
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
            // Fix: Check both id and columnId properties
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
          // Don't undo the optimistic update if we got a 500 response with a JSON parsing error
          // This is likely because the server successfully deleted the column but returned an empty/non-JSON response
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
        // Получаем текущее состояние доски
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
      invalidatesTags: (result, error, { boardId }) => [{ type: 'Board', id: boardId }],
    }),
    revokeBoardRight: builder.mutation({
      query: ({ boardId, userId, rightName }) => ({
        url: `${apiPrefix}/${boardId}/rights/revoke`,
        method: 'POST',
        body: { userId, rightName },
      }),
      invalidatesTags: (result, error, { boardId }) => [{ type: 'Board', id: boardId }],
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