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
        { type: 'Board', id },
        'Columns',
        'Tasks',
        'Tags'
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
            const currentUsername = state.api.queries['getCurrentUser(undefined)'].data?.username;
            console.log("из стейста достал",currentUsername);
            // Проверяем, инициировано ли это событие текущим пользователем
            if (data.payload && data.payload.initiatedBy === currentUsername && data.payload.socketEvent === true) {
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
                updateCachedData((draft) => {
                  // Добавляем новую колонку с пустым массивом задач
                  draft.columns.push({
                    ...data.payload,
                    tasks: []
                  });
                });
                break;
                
              case 'COLUMN_UPDATED':
                updateCachedData((draft) => {
                  const index = draft.columns.findIndex(col => col.id === data.payload.id);
                  if (index !== -1) {
                    // Обновляем только поля колонки, сохраняя задачи
                    draft.columns[index] = { 
                      ...draft.columns[index],
                      id: data.payload.id || draft.columns[index].id,
                      name: data.payload.name || draft.columns[index].name,
                      boardId: data.payload.boardId || draft.columns[index].boardId,
                      position: data.payload.position || draft.columns[index].position
                    };
                  }
                });
                break;
                
              case 'COLUMN_DELETED':
                updateCachedData((draft) => {
                  const index = draft.columns.findIndex(col => col.id === data.payload.id);
                  if (index !== -1) {
                    draft.columns.splice(index, 1);
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
                  data.payload.columnIds.forEach(columnId => {
                    const column = currentColumns.find(col => col.id === columnId);
                    if (column) {
                      // Обновляем позицию и добавляем в новый массив
                      newColumns.push({
                        ...column,
                        position: newColumns.length
                      });
                    }
                  });
                  
                  draft.columns = newColumns;
                });
                break;
              
              // События задач
              case 'TASK_CREATED':
                updateCachedData((draft) => {
                  // Находим колонку, к которой относится задача
                  const columnIndex = draft.columns.findIndex(col => col.id === data.payload.columnId);
                  if (columnIndex !== -1) {
                    // Добавляем задачу в массив задач колонки
                    draft.columns[columnIndex].tasks.push(data.payload);
                  }
                });
                break;
                
              case 'TASK_UPDATED':
                updateCachedData((draft) => {
                  // Находим колонку, содержащую задачу
                  const columnIndex = draft.columns.findIndex(col => col.id === data.payload.columnId);
                  if (columnIndex !== -1) {
                    // Находим индекс задачи в колонке
                    const taskIndex = draft.columns[columnIndex].tasks.findIndex(task => task.id === data.payload.id);
                    if (taskIndex !== -1) {
                      // Обновляем задачу
                      draft.columns[columnIndex].tasks[taskIndex] = { 
                        ...draft.columns[columnIndex].tasks[taskIndex],
                        ...data.payload 
                      };
                    }
                  }
                });
                break;
                
              case 'TASK_DELETED':
                updateCachedData((draft) => {
                  // Проходим по всем колонкам
                  draft.columns.forEach(column => {
                    // Находим индекс задачи
                    const taskIndex = column.tasks.findIndex(task => task.id === data.payload.id);
                    if (taskIndex !== -1) {
                      // Удаляем задачу
                      column.tasks.splice(taskIndex, 1);
                    }
                  });
                });
                break;
                
              case 'TASK_MOVED':
                updateCachedData((draft) => {
                  const { taskId, sourceColumnId, targetColumnId, newPosition } = data.payload;
                  
                  // Находим исходную колонку
                  const sourceColIndex = draft.columns.findIndex(col => col.id === sourceColumnId);
                  if (sourceColIndex === -1) return;
                  
                  // Находим задачу в исходной колонке
                  const taskIndex = draft.columns[sourceColIndex].tasks.findIndex(task => task.id === taskId);
                  if (taskIndex === -1) return;
                  
                  // Копируем задачу перед удалением
                  const task = { ...draft.columns[sourceColIndex].tasks[taskIndex] };
                  
                  // Удаляем задачу из исходной колонки
                  draft.columns[sourceColIndex].tasks.splice(taskIndex, 1);
                  
                  // Если перемещение в другую колонку
                  if (sourceColumnId !== targetColumnId) {
                    // Находим целевую колонку
                    const destColIndex = draft.columns.findIndex(col => col.id === targetColumnId);
                    if (destColIndex === -1) return;
                    
                    // Обновляем columnId задачи
                    task.columnId = targetColumnId;
                    
                    // Вставляем задачу в новую позицию в целевой колонке
                    draft.columns[destColIndex].tasks.splice(newPosition, 0, task);
                  } else {
                    // Вставляем задачу в новую позицию в той же колонке
                    draft.columns[sourceColIndex].tasks.splice(newPosition, 0, task);
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
                });
                break;
                
              case 'TASKS_REORDERED':
                updateCachedData((draft) => {
                  // Находим колонку, для которой изменился порядок задач
                  const columnIndex = draft.columns.findIndex(col => col.id === data.payload.columnId);
                  if (columnIndex === -1) return;
                  
                  // Получаем колонку
                  const column = draft.columns[columnIndex];
                  
                  // Создаем карту текущих задач для сохранения всех данных
                  const taskMap = {};
                  column.tasks.forEach(task => {
                    taskMap[task.id] = task;
                  });
                  
                  // Создаем новый массив задач в соответствии с полученным порядком
                  const newTasks = [];
                  data.payload.tasks.forEach((taskData, index) => {
                    if (taskMap[taskData.id]) {
                      // Добавляем задачу с обновленной позицией
                      newTasks.push({
                        ...taskMap[taskData.id],
                        position: index
                      });
                    }
                  });
                  
                  // Обновляем задачи в колонке
                  column.tasks = newTasks;
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
      // Используем пользовательский queryFn для STOMP-операций
      queryFn: async (column, { dispatch }) => {
        const { boardId } = column;
        const tempId = `temp-${Date.now()}`;
        
        // Оптимистично обновляем UI
        const patchResult = dispatch(
          baseApi.util.updateQueryData('getBoardWithData', boardId, (draft) => {
            draft.columns.push({
              ...column,
              id: tempId,
              tasks: []
            });
          })
        );
        
        try {
          // Отправляем событие через STOMP
          const stompConn = getStompConnection(boardId);
          const success = stompConn.sendAction('CREATE_COLUMN', column);
          
          if (!success) {
            throw new Error('Failed to send STOMP message');
          }
          
          // Возвращаем успешный результат с временными данными
          // Фактическое обновление произойдет через STOMP-событие
          return { data: { ...column, id: tempId } };
        } catch (error) {
          // Откатываем оптимистичное обновление при ошибке
          patchResult.undo();
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      }
    }),
    updateColumn: builder.mutation({
      // Используем пользовательский queryFn для STOMP-операций
      queryFn: async ({ id, boardId, ...updates }, { dispatch }) => {
        // Оптимистично обновляем UI
        const patchResult = dispatch(
          baseApi.util.updateQueryData('getBoardWithData', boardId, (draft) => {
            const columnIndex = draft.columns.findIndex(col => col.id === id);
            if (columnIndex !== -1) {
              Object.assign(draft.columns[columnIndex], updates);
            }
          })
        );
        
        try {
          // Отправляем событие через STOMP
          const stompConn = getStompConnection(boardId);
          const success = stompConn.sendAction('UPDATE_COLUMN', { 
            columnId: id,  // Changed from id to columnId to match backend expectation
            ...updates 
          });
          
          if (!success) {
            throw new Error('Failed to send STOMP message');
          }
          
          // Возвращаем успешный результат
          return { data: { id, ...updates } };
        } catch (error) {
          // Откатываем оптимистичное обновление при ошибке
          patchResult.undo();
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      }
    }),
    deleteColumn: builder.mutation({
      // Используем пользовательский queryFn для STOMP-операций
      queryFn: async ({ id, boardId }, { dispatch }) => {
        // Оптимистично обновляем UI
        const patchResult = dispatch(
          baseApi.util.updateQueryData('getBoardWithData', boardId, (draft) => {
            const columnIndex = draft.columns.findIndex(col => col.id === id);
            if (columnIndex !== -1) {
              draft.columns.splice(columnIndex, 1);
            }
          })
        );
        
        try {
          // Отправляем событие через STOMP
          const stompConn = getStompConnection(boardId);
          const success = stompConn.sendAction('DELETE_COLUMN', { 
            columnId: id  // Changed from id to columnId to match backend expectation
          });
          
          if (!success) {
            throw new Error('Failed to send STOMP message');
          }
          
          // Возвращаем успешный результат
          return { data: { id } };
        } catch (error) {
          // Откатываем оптимистичное обновление при ошибке
          patchResult.undo();
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      }
    }),
    reorderColumns: builder.mutation({
      // Используем пользовательский queryFn для STOMP-операций
      queryFn: async ({ boardId, columnIds }, { dispatch }) => {
        // Оптимистично обновляем UI
        const patchResult = dispatch(
          baseApi.util.updateQueryData('getBoardWithData', boardId, (draft) => {
            // Создаем новый порядок колонок
            const currentColumns = [...draft.columns];
            const newColumns = [];
            
            // Для каждого id в новом порядке находим соответствующую колонку
            columnIds.forEach((columnId, index) => {
              const column = currentColumns.find(col => col.id === columnId);
              if (column) {
                newColumns.push({
                  ...column,
                  position: index
                });
              }
            });
            
            draft.columns = newColumns;
          })
        );
        
        try {
          // Отправляем событие через STOMP
          const stompConn = getStompConnection(boardId);
          
          // Отправляем данные в корректном формате для сервера
          const columns = columnIds.map((id, index) => ({ id, position: index }));
          
          const success = stompConn.sendAction('REORDER_COLUMNS', { 
            boardId, 
            columns: columns  // Отправляем массив объектов с id и position для соответствия ожиданиям сервера
          });
          
          if (!success) {
            throw new Error('Failed to send STOMP message');
          }
          
          // Возвращаем успешный результат
          return { data: { boardId, columnIds } };
        } catch (error) {
          // Откатываем оптимистичное обновление при ошибке
          patchResult.undo();
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      }
    }),
    createTask: builder.mutation({
      // Используем пользовательский queryFn для STOMP-операций
      queryFn: async (task, { dispatch, getState }) => {
        const { boardId } = task;
        const tempId = `temp-${Date.now()}`;
        
        // Получаем текущего пользователя
        const state = getState();
        const username = state.api.queries['getCurrentUser(undefined)']?.data?.username;
        
        // Оптимистично обновляем UI
        const patchResult = dispatch(
          baseApi.util.updateQueryData('getBoardWithData', boardId, (draft) => {
            const column = draft.columns.find(col => col.id === task.columnId);
            if (column) {
              column.tasks.push({
                ...task,
                id: tempId,
                position: column.tasks.length,
                initiatedBy: username
              });
            }
          })
        );
        
        try {
          // Отправляем событие через STOMP согласно спецификации
          const stompConn = getStompConnection(boardId);
          
          // Формируем правильную структуру данных для отправки
          const payload = {
            columnId: task.columnId,
            title: task.title,
            description: task.description || '',
            tagIds: task.tagIds || [],
            position: task.position || 0,
            checklist: task.checklist || [],
            participants: task.participants || [],
            startDate: task.startDate,
            dueDate: task.dueDate,
            priority: task.priority || 'NORMAL',
            socketEvent: true
          };
          
          const success = stompConn.sendAction('CREATE_TASK', payload);
          
          if (!success) {
            throw new Error('Failed to send STOMP message');
          }
          
          // Возвращаем успешный результат с временными данными
          return { data: { ...task, id: tempId } };
        } catch (error) {
          // Откатываем оптимистичное обновление при ошибке
          patchResult.undo();
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      }
    }),
    updateTask: builder.mutation({
      // Используем пользовательский queryFn для STOMP-операций
      queryFn: async ({ id, boardId, columnId, ...updates }, { dispatch, getState }) => {
        // Получаем текущего пользователя
        const state = getState();
        const username = state.api.queries['getCurrentUser(undefined)']?.data?.username;
        
        // Оптимистично обновляем UI
        const patchResult = dispatch(
          baseApi.util.updateQueryData('getBoardWithData', boardId, (draft) => {
            const column = draft.columns.find(col => col.id === columnId);
            if (column) {
              const taskIndex = column.tasks.findIndex(t => t.id === id);
              if (taskIndex !== -1) {
                Object.assign(column.tasks[taskIndex], {
                  ...updates,
                  initiatedBy: username
                });
              }
            }
          })
        );
        
        try {
          // Отправляем событие через STOMP согласно спецификации
          const stompConn = getStompConnection(boardId);
          
          // Формируем правильную структуру данных для отправки
          const payload = {
            taskId: id, // Используем taskId вместо id
            title: updates.title,
            description: updates.description || '',
            tagIds: updates.tagIds || [],
            position: updates.position,
            checklist: updates.checklist || [],
            participants: updates.participants || [],
            startDate: updates.startDate,
            dueDate: updates.dueDate,
            priority: updates.priority || 'NORMAL',
            attachments: updates.attachments || [],
            socketEvent: true
          };
          
          const success = stompConn.sendAction('UPDATE_TASK', payload);
          
          if (!success) {
            throw new Error('Failed to send STOMP message');
          }
          
          // Возвращаем успешный результат
          return { data: { id, columnId, ...updates } };
        } catch (error) {
          // Откатываем оптимистичное обновление при ошибке
          patchResult.undo();
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      }
    }),
    deleteTask: builder.mutation({
      // Используем пользовательский queryFn для STOMP-операций
      queryFn: async ({ id, boardId }, { dispatch, getState }) => {
        // Получаем текущего пользователя
        const state = getState();
        const username = state.api.queries['getCurrentUser(undefined)']?.data?.username;
        
        // Оптимистично обновляем UI
        const patchResult = dispatch(
          baseApi.util.updateQueryData('getBoardWithData', boardId, (draft) => {
            draft.columns.forEach(column => {
              const taskIndex = column.tasks.findIndex(t => t.id === id);
              if (taskIndex !== -1) {
                column.tasks.splice(taskIndex, 1);
                column.tasks.forEach((task, index) => {
                  task.position = index;
                });
              }
            });
          })
        );
        
        try {
          // Отправляем событие через STOMP согласно спецификации
          const stompConn = getStompConnection(boardId);
          
          // Формируем правильную структуру данных для отправки
          const payload = {
            taskId: id, // Используем taskId вместо id
            socketEvent: true
          };
          
          const success = stompConn.sendAction('DELETE_TASK', payload);
          
          if (!success) {
            throw new Error('Failed to send STOMP message');
          }
          
          // Возвращаем успешный результат
          return { data: { id } };
        } catch (error) {
          // Откатываем оптимистичное обновление при ошибке
          patchResult.undo();
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      }
    }),
    moveTask: builder.mutation({
      // Используем пользовательский queryFn для STOMP-операций
      queryFn: async ({ taskId, sourceColumnId, destColumnId, newPosition, boardId }, { dispatch, getState }) => {
        // Получаем текущего пользователя
        const state = getState();
        const username = state.api.queries['getCurrentUser(undefined)']?.data?.username;
        
        // Оптимистично обновляем UI
        const patchResult = dispatch(
          baseApi.util.updateQueryData('getBoardWithData', boardId, (draft) => {
            // Найти исходную колонку
            const sourceColumn = draft.columns.find(col => col.id === sourceColumnId);
            if (!sourceColumn) return;
            
            // Найти задачу в исходной колонке
            const taskIndex = sourceColumn.tasks.findIndex(t => t.id === taskId);
            if (taskIndex === -1) return;
            
            // Копируем задачу перед удалением
            const task = { ...sourceColumn.tasks[taskIndex] };
            
            // Удаляем задачу из исходной колонки
            sourceColumn.tasks.splice(taskIndex, 1);
            
            // Если перемещение в другую колонку
            if (sourceColumnId !== destColumnId) {
              // Найти целевую колонку
              const destColumn = draft.columns.find(col => col.id === destColumnId);
              if (destColumn) {
                // Обновляем columnId задачи
                task.columnId = destColumnId;
                
                // Вставляем задачу в новую позицию
                destColumn.tasks.splice(newPosition, 0, task);
                
                // Обновляем позиции всех задач в обеих колонках
                sourceColumn.tasks.forEach((t, i) => { t.position = i; });
                destColumn.tasks.forEach((t, i) => { t.position = i; });
              }
            } else {
              // Вставляем задачу в новую позицию в той же колонке
              sourceColumn.tasks.splice(newPosition, 0, task);
              
              // Обновляем позиции задач
              sourceColumn.tasks.forEach((t, i) => { t.position = i; });
            }
          })
        );
        
        try {
          // Отправляем событие через STOMP согласно спецификации
          const stompConn = getStompConnection(boardId);
          
          // Формируем правильную структуру данных для отправки
          const payload = {
            taskId,
            sourceColumnId,
            targetColumnId: destColumnId, // targetColumnId вместо destColumnId согласно спецификации
            newPosition,
            boardId,
            socketEvent: true
          };
          
          const success = stompConn.sendAction('MOVE_TASK', payload);
          
          if (!success) {
            throw new Error('Failed to send STOMP message');
          }
          
          // Возвращаем успешный результат
          return { data: { taskId, sourceColumnId, destColumnId, newPosition } };
        } catch (error) {
          // Откатываем оптимистичное обновление при ошибке
          patchResult.undo();
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      }
    }),
    reorderTasks: builder.mutation({
      // Используем пользовательский queryFn для STOMP-операций
      queryFn: async ({ columnId, tasks, boardId }, { dispatch }) => {
        // Оптимистично обновляем UI
        const patchResult = dispatch(
          baseApi.util.updateQueryData('getBoardWithData', boardId, (draft) => {
            // Находим колонку, в которой нужно обновить порядок задач
            const column = draft.columns.find(col => col.id === columnId);
            if (!column) return;
            
            // Создаем новый порядок задач, сохраняя полные объекты задач
            const taskMap = {};
            column.tasks.forEach(task => {
              taskMap[task.id] = task;
            });
            
            // Формируем новый массив задач в правильном порядке
            const newTasks = [];
            tasks.forEach((taskObj, index) => {
              const taskId = taskObj.id;
              if (taskMap[taskId]) {
                // Сохраняем полный объект задачи, обновляя только позицию
                newTasks.push({
                  ...taskMap[taskId],
                  position: index
                });
              }
            });
            
            // Обновляем задачи в колонке
            column.tasks = newTasks;
          })
        );
        
        try {
          // Отправляем событие через STOMP
          const stompConn = getStompConnection(boardId);
          const success = stompConn.sendAction('REORDER_TASKS', { 
            columnId, 
            tasks 
          });
          
          if (!success) {
            throw new Error('Failed to send STOMP message');
          }
          
          // Возвращаем успешный результат
          return { data: { columnId, tasks } };
        } catch (error) {
          // Откатываем оптимистичное обновление при ошибке
          patchResult.undo();
          return { error: { status: 'CUSTOM_ERROR', error: error.message } };
        }
      }
    }),
    createTag: builder.mutation({
      query: (tag) => ({
        url: `${apiPrefix}/tags`,
        method: 'POST',
        body: { ...tag, socketEvent: true },
      }),
      // Не инвалидируем кеш, вместо этого делаем оптимистичное обновление
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
              const tempIndex = draft.tags.findIndex(t => t.id === tempId);
              if (tempIndex !== -1) {
                draft.tags[tempIndex] = createdTag;
              }
            })
          );
        } catch {
          patchResult.undo();
        }
      }
    }),
    updateTag: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `${apiPrefix}/tags/${id}`,
        method: 'PUT',
        body: { ...data, socketEvent: true },
      }),
      // Не инвалидируем кеш, вместо этого делаем оптимистичное обновление
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
      }
    }),
    deleteTag: builder.mutation({
      query: (id) => ({
        url: `${apiPrefix}/tags/${id}`,
        method: 'DELETE',
        body: { socketEvent: true },
      }),
      // Не инвалидируем кеш, вместо этого делаем оптимистичное обновление
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
      }
    }),
    getBoardUserRights: builder.query({
      query: ({ boardId, userId }) => ({
        url: `${apiPrefix}/${boardId}/rights/users/${userId}`,
      }),
      providesTags: (result, error, { boardId }) => [{ type: 'Board', id: boardId }],
    }),
    getBoardUserRightsByUsername: builder.query({
      query: ({ boardId, username }) => ({
        url: `${apiPrefix}/${boardId}/rights/users/username/${username}`,
      }),
      providesTags: (result, error, { boardId }) => [{ type: 'Board', id: boardId }],
    }),
    addUserToBoard: builder.mutation({
      query: ({ boardId, userId }) => ({
        url: `${apiPrefix}/${boardId}/rights/users`,
        method: 'POST',
        body: { userId },
      }),
      invalidatesTags: (result, error, { boardId }) => [{ type: 'Board', id: boardId }],
    }),
    addUserToBoardByUsername: builder.mutation({
      query: ({ boardId, username }) => ({
        url: `${apiPrefix}/${boardId}/rights/users/username`,
        method: 'POST',
        body: { username },
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
    grantBoardRightByUsername: builder.mutation({
      query: ({ boardId, username, rightName }) => ({
        url: `${apiPrefix}/${boardId}/rights/grant`,
        method: 'POST',
        body: { username, rightName },
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
    revokeBoardRightByUsername: builder.mutation({
      query: ({ boardId, username, rightName }) => ({
        url: `${apiPrefix}/${boardId}/rights/revoke`,
        method: 'POST',
        body: { username, rightName },
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
    removeUserFromBoardByUsername: builder.mutation({
      query: ({ boardId, username }) => ({
        url: `${apiPrefix}/${boardId}/rights/users/username/${username}`,
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
  useCreateTaskMutation,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useMoveTaskMutation,
  useReorderTasksMutation,
  useCreateTagMutation,
  useUpdateTagMutation,
  useDeleteTagMutation,
  useGetBoardUserRightsQuery,
  useGetBoardUserRightsByUsernameQuery,
  useAddUserToBoardMutation,
  useAddUserToBoardByUsernameMutation,
  useGrantBoardRightMutation,
  useGrantBoardRightByUsernameMutation,
  useRevokeBoardRightMutation,
  useRevokeBoardRightByUsernameMutation,
  useRemoveUserFromBoardMutation,
  useRemoveUserFromBoardByUsernameMutation,
  useGetVisibleBoardsQuery,
} = boardsApi; 