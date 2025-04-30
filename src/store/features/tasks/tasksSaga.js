import { takeLatest, put, call, all, select, take } from 'redux-saga/effects';
import {
  fetchTasksByBoardRequest,
  fetchTasksByBoardSuccess,
  fetchTasksByBoardFailure,
  createTaskRequest,
  createTaskSuccess,
  createTaskFailure,
  updateTaskRequest,
  updateTaskSuccess,
  updateTaskFailure,
  deleteTaskRequest,
  deleteTaskSuccess,
  deleteTaskFailure,
  uploadAttachmentRequest,
} from './tasksActions';
import { setLoading } from '../ui/uiSlice';
import { api } from '../../../utils/api';
import { fetchColumnsByBoardRequest } from '../columns/columnsActions';
import { fetchColumnsByBoardSuccess } from '../columns/columnsActions';
import { selectColumnsForBoard } from '../columns/columnsSelectors';
import { reorderTasksOptimistic, resetTasksOrder, moveTaskOptimistic } from './tasksSlice';

function* fetchTasksByBoard(action) {
  try {
    yield put(setLoading({ feature: 'tasks', isLoading: true }));
    const boardId = Number(action.payload); // Преобразуем к числу
    console.log('Запрос задач для доски с ID:', boardId);
    
    // First, fetch columns for this board
    yield put(fetchColumnsByBoardRequest(boardId));
    
    // Wait for columns to be loaded
    yield take(fetchColumnsByBoardSuccess);
    
    // Get columns from the state
    const columns = yield select(state => selectColumnsForBoard(state, boardId));
    console.log('Найдены колонки для доски:', columns);
    
    // Fetch tasks for each column
    let allTasks = [];
    for (const column of columns) {
      // Убедимся, что у колонки есть ID
      if (!column || !column.id) {
        console.error('Ошибка: Колонка без ID', column);
        continue;
      }
      
      const columnId = column.id; // Сохраняем оригинальный тип
      console.log('Запрос задач для колонки с ID:', columnId);
      
      const columnTasks = yield call(api.get, `/api/tasks/column/${columnId}`);
      console.log('Получены задачи для колонки:', columnTasks);
      
      // Add board ID and ensure columnId is correct for each task
      columnTasks.forEach(task => {
        task.boardId = boardId; // Используем числовой boardId
        task.columnId = columnId; // Используем оригинальный columnId
      });
      
      allTasks = [...allTasks, ...columnTasks];
    }
    
    console.log('Все задачи для доски:', allTasks);
    yield put(fetchTasksByBoardSuccess(allTasks));
  } catch (error) {
    console.error('Ошибка при получении задач:', error);
    yield put(fetchTasksByBoardFailure(error.toString()));
  } finally {
    yield put(setLoading({ feature: 'tasks', isLoading: false }));
  }
}

function* createTask(action) {
  try {
    yield put(setLoading({ feature: 'tasks', isLoading: true }));
    
    console.log('Полученные данные задачи:', action.payload);
    
    // Получаем исходные значения ID 
    const columnId = action.payload.columnId;
    const boardId = action.payload.boardId;
    const projectId = action.payload.projectId;
    
    // Проверяем наличие обязательных полей
    if (!action.payload.checklist) {
      console.warn('Отсутствует checklist в данных задачи, создаем пустой массив');
    }
    
    if (!action.payload.participants) {
      console.warn('Отсутствуют participants в данных задачи, создаем пустой массив');
    }
    
    // Преобразуем числовые значения в строки для совместимости с бэкендом
    const task = {
      ...action.payload,
      columnId: String(columnId),
      boardId: String(boardId),
      projectId: String(projectId),
      position: String(action.payload.position || 0),
      // Явно указываем массивы для чеклиста и участников
      checklist: Array.isArray(action.payload.checklist) ? action.payload.checklist : [],
      participants: Array.isArray(action.payload.participants) ? action.payload.participants : []
    };
    
    // Преобразуем даты, если они есть
    if (action.payload.startDate) {
      task.startDate = action.payload.startDate;
      console.log('Обрабатываем startDate:', task.startDate);
    }
    
    if (action.payload.endDate) {
      task.endDate = action.payload.endDate;
      console.log('Обрабатываем endDate:', task.endDate);
    }
    
    console.log('Отправка данных задачи на сервер:', task);
    
    // Глубокая проверка данных перед отправкой
    if (!task.title) {
      console.error('Ошибка: отсутствует название задачи');
      throw new Error('Требуется название задачи');
    }
    
    const newTask = yield call(api.post, '/api/tasks', task);
    console.log('Ответ сервера:', newTask);
    
    // Восстанавливаем исходные значения ID для хранилища Redux
    newTask.columnId = columnId;
    newTask.boardId = boardId;
    newTask.projectId = projectId;
    
    // Убедимся, что в ответе есть все необходимые поля
    if (!newTask.checklist) newTask.checklist = [];
    if (!newTask.participants) newTask.participants = [];
    
    yield put(createTaskSuccess(newTask));

    // === ДОБАВЛЕНО: загрузка файлов и updateTask с attachments ===
    const files = action.payload.files || [];
    if (files.length > 0) {
      const username = yield select(state => state.currentUser.username);
      const uploadedIds = [];
      for (const file of files) {
        if (file instanceof File) {
          const response = yield call(uploadAttachmentAndGetId, newTask.id, file, username);
          if (response && response.id) uploadedIds.push(response.id);
        }
      }
      // После загрузки всех файлов — updateTask с attachments = [id новых файлов]
      if (uploadedIds.length > 0) {
        yield call(api.put, `/api/tasks/${newTask.id}`, { attachments: uploadedIds });
      }
    }
    // === КОНЕЦ ДОБАВЛЕНИЯ ===
    // После всех файловых операций — обновить задачи доски
    if (boardId) {
      yield put(fetchTasksByBoardRequest(boardId));
    }
  } catch (error) {
    console.error('Ошибка при создании задачи:', error);
    yield put(createTaskFailure(error.toString()));
  } finally {
    yield put(setLoading({ feature: 'tasks', isLoading: false }));
  }
}

function* updateTask(action) {
  try {
    yield put(setLoading({ feature: 'tasks', isLoading: true }));
    
    console.log('Данные задачи перед обновлением:', action.payload);
    
    // Сохраняем оригинальные ID
    const originalId = action.payload.id;
    const columnId = action.payload.columnId;
    const boardId = action.payload.boardId;
    const projectId = action.payload.projectId;
    
    // Проверяем наличие обязательных полей
    if (!action.payload.checklist) {
      console.warn('Отсутствует checklist в данных задачи, создаем пустой массив');
    }
    
    if (!action.payload.participants) {
      console.warn('Отсутствуют participants в данных задачи, создаем пустой массив');
    }
    
    // Преобразуем числовые значения в строки для совместимости с бэкендом
    const task = {
      ...action.payload,
      id: String(originalId),
      columnId: columnId ? String(columnId) : undefined,
      boardId: boardId ? String(boardId) : undefined,
      projectId: projectId ? String(projectId) : undefined,
      position: action.payload.position ? String(action.payload.position) : undefined,
      // Явно указываем массивы для чеклиста и участников
      checklist: Array.isArray(action.payload.checklist) ? action.payload.checklist : [],
      participants: Array.isArray(action.payload.participants) ? action.payload.participants : []
    };
    
    console.log('Отправка обновленных данных задачи на сервер:', task);
    
    // Глубокая проверка данных перед отправкой
    if (!task.title) {
      console.error('Ошибка: отсутствует название задачи');
      throw new Error('Требуется название задачи');
    }
    
    const updatedTask = yield call(api.put, `/api/tasks/${originalId}`, task);
    console.log('Ответ сервера:', updatedTask);
    
    // Восстанавливаем исходные значения ID для хранилища Redux
    updatedTask.id = originalId;
    updatedTask.columnId = columnId;
    updatedTask.boardId = boardId;
    updatedTask.projectId = projectId;
    
    // Убедимся, что в ответе есть все необходимые поля
    if (!updatedTask.checklist) updatedTask.checklist = [];
    if (!updatedTask.participants) updatedTask.participants = [];
    
    yield put(updateTaskSuccess(updatedTask));

    // === ДОБАВЛЕНО: загрузка файлов и повторный updateTask ===
    const files = action.payload.files || [];
    const oldAttachments = action.payload.attachments || [];
    if (files.length > 0) {
      const username = yield select(state => state.currentUser.username);
      // Загружаем все файлы параллельно и собираем их id
      const uploadedIds = [];
      for (const file of files) {
        if (file instanceof File) {
          // uploadAttachmentSaga должен возвращать id
          const response = yield call(uploadAttachmentAndGetId, updatedTask.id, file, username);
          if (response && response.id) uploadedIds.push(response.id);
        }
      }
      // После загрузки всех файлов — второй updateTask с attachments = [...старые id, ...новые id]
      const allAttachments = [...oldAttachments, ...uploadedIds];
      yield call(api.put, `/api/tasks/${originalId}`, { ...task, attachments: allAttachments });
    }
    // === КОНЕЦ ДОБАВЛЕНИЯ ===
    // После всех файловых операций — обновить задачи доски
    if (boardId) {
      yield put(fetchTasksByBoardRequest(boardId));
    }
  } catch (error) {
    console.error('Ошибка при обновлении задачи:', error);
    yield put(updateTaskFailure(error.toString()));
  } finally {
    yield put(setLoading({ feature: 'tasks', isLoading: false }));
  }
}

// Вспомогательная сага для загрузки файла и получения id
function* uploadAttachmentAndGetId(taskId, file, uploadedBy) {
  try {
    const formData = new FormData();
    formData.append('taskId', taskId);
    formData.append('file', file);
    formData.append('uploadedBy', uploadedBy);
    const response = yield call(fetch, `${process.env.REACT_APP_API_BASE_URL}/api/attachments/upload`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    if (!response.ok) throw new Error('Ошибка загрузки файла');
    const data = yield call([response, 'json']);
    return data; // должен содержать id
  } catch (error) {
    console.error('Ошибка при загрузке файла:', error);
    return null;
  }
}

function* deleteTask(action) {
  try {
    yield put(setLoading({ feature: 'tasks', isLoading: true }));
    const taskId = action.payload;
    yield call(api.delete, `/api/tasks/${taskId}`);
    yield put(deleteTaskSuccess(taskId));
  } catch (error) {
    yield put(deleteTaskFailure(error.toString()));
  } finally {
    yield put(setLoading({ feature: 'tasks', isLoading: false }));
  }
}

function* uploadAttachmentSaga(action) {
  try {
    const { taskId, file, uploadedBy } = action.payload;
    const formData = new FormData();
    formData.append('taskId', taskId);
    formData.append('file', file);
    formData.append('uploadedBy', uploadedBy);
    // Не указываем Content-Type, браузер сам выставит boundary
    yield call(fetch, `${process.env.REACT_APP_API_BASE_URL}/api/attachments/upload`, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });
    // Можно добавить put для обновления задачи, если нужно
  } catch (error) {
    // Можно добавить обработку ошибок
    console.error('Ошибка при загрузке файла:', error);
  }
}

function* reorderTasks(action) {
  const { columnId, newOrder, prevOrder } = action.payload;
  try {
    yield put(setLoading({ feature: 'tasks', isLoading: true }));
    yield call(api.put, `/api/tasks/column/${columnId}/reorder`, newOrder);
    // Можно обновить задачи в колонке, если нужно
  } catch (error) {
    console.error('Ошибка при reorder задач:', error);
    if (columnId && prevOrder) {
      yield put(resetTasksOrder({ columnId, prevOrder }));
    }
  } finally {
    yield put(setLoading({ feature: 'tasks', isLoading: false }));
  }
}

function* moveTask(action) {
  const { taskId, sourceColumnId, destColumnId, destIndex, prevSourceOrder, prevDestOrder } = action.payload;
  try {
    yield put(setLoading({ feature: 'tasks', isLoading: true }));
    console.log('Moving task in saga:', { 
      taskId, 
      sourceColumnId, 
      destColumnId, 
      destIndex, 
      prevSourceOrder, 
      prevDestOrder 
    });
    
    // Make the API call
    const response = yield call(api.put, `/api/tasks/${taskId}/move`, { columnId: Number(destColumnId), position: Number(destIndex) });
    console.log('Move task API response:', response);
    
    // Fetch updated tasks to ensure UI is consistent with backend
    const task = yield select(state => state.tasks.byId[taskId]);
    if (task && task.boardId) {
      console.log('Refreshing tasks for board:', task.boardId);
      yield put(fetchTasksByBoardRequest(task.boardId));
    }
  } catch (error) {
    console.error('Ошибка при перемещении задачи:', error);
    // Откатить обе колонки
    if (sourceColumnId && prevSourceOrder) {
      yield put(resetTasksOrder({ columnId: sourceColumnId, prevOrder: prevSourceOrder }));
    }
    if (destColumnId && prevDestOrder) {
      yield put(resetTasksOrder({ columnId: destColumnId, prevOrder: prevDestOrder }));
    }
  } finally {
    yield put(setLoading({ feature: 'tasks', isLoading: false }));
  }
}

export default function* tasksSaga() {
  yield all([
    takeLatest(fetchTasksByBoardRequest.type, fetchTasksByBoard),
    takeLatest(createTaskRequest.type, createTask),
    takeLatest(updateTaskRequest.type, updateTask),
    takeLatest(deleteTaskRequest.type, deleteTask),
    takeLatest(uploadAttachmentRequest.type, uploadAttachmentSaga),
    takeLatest('tasks/reorderTasksRequest', reorderTasks),
    takeLatest('tasks/moveTaskRequest', moveTask),
  ]);
} 