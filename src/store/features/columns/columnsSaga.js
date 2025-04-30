import { takeLatest, put, call, all } from 'redux-saga/effects';
import {
  fetchColumnsByBoardRequest,
  fetchColumnsByBoardSuccess,
  fetchColumnsByBoardFailure,
  createColumnRequest,
  createColumnSuccess,
  createColumnFailure,
  updateColumnRequest,
  updateColumnSuccess,
  updateColumnFailure,
  deleteColumnRequest,
  deleteColumnSuccess,
  deleteColumnFailure,
  reorderColumnsRequest,
} from './columnsActions';
import { setLoading } from '../ui/uiSlice';
import { api } from '../../../utils/api';
import { reorderColumnsOptimistic, resetColumnsOrder } from './columnsSlice';

function* fetchColumnsByBoard(action) {
  try {
    yield put(setLoading({ feature: 'columns', isLoading: true }));
    const boardId = Number(action.payload);
    console.log('Запрос колонок для доски с ID:', boardId);
    
    const columns = yield call(api.get, `/api/columns/board/${boardId}`);
    console.log('Полученные колонки от API:', columns);
    
    // Добавляем поле title для совместимости с фронтендом
    // и явно устанавливаем boardId, даже если он уже есть
    const columnsWithTitleAndBoardId = columns.map(column => ({
      ...column,
      title: column.name, // Добавляем title на основе name для совместимости с фронтендом
      boardId: boardId // Явно устанавливаем boardId из параметра запроса как число
    }));
    
    console.log('Колонки для Redux с явным boardId:', columnsWithTitleAndBoardId);
    yield put(fetchColumnsByBoardSuccess(columnsWithTitleAndBoardId));
  } catch (error) {
    console.error('Ошибка при получении колонок:', error);
    yield put(fetchColumnsByBoardFailure(error.toString()));
  } finally {
    yield put(setLoading({ feature: 'columns', isLoading: false }));
  }
}

function* createColumn(action) {
  try {
    yield put(setLoading({ feature: 'columns', isLoading: true }));
    
    // Преобразуем все числовые значения в строки для совместимости с бэкендом
    // Изменяем title на name, т.к. в бэкенде поле называется name
    const column = {
      ...action.payload,
      name: action.payload.title, // Переименовываем поле title в name для API
      boardId: String(action.payload.boardId),
      position: String(action.payload.position || 0)
    };
    
    // Удаляем title, чтобы избежать дублирования
    delete column.title;
    
    console.log('Отправка данных для создания колонки:', column);
    const newColumn = yield call(api.post, '/api/columns', column);
    console.log('Ответ API при создании колонки:', newColumn);
    
    // Добавляем title для совместимости с фронтендом
    if(newColumn && newColumn.name) {
      newColumn.title = newColumn.name;
    }
    
    yield put(createColumnSuccess(newColumn));
  } catch (error) {
    console.error('Ошибка при создании колонки:', error);
    yield put(createColumnFailure(error.toString()));
  } finally {
    yield put(setLoading({ feature: 'columns', isLoading: false }));
  }
}

function* updateColumn(action) {
  try {
    yield put(setLoading({ feature: 'columns', isLoading: true }));
    
    // Преобразуем числовые значения в строки для совместимости с бэкендом
    // И меняем title на name для API
    const column = {
      ...action.payload,
      id: String(action.payload.id),
      boardId: action.payload.boardId ? String(action.payload.boardId) : undefined,
      position: action.payload.position ? String(action.payload.position) : undefined
    };
    
    // Если передан title, преобразуем его в name
    if (column.title) {
      column.name = column.title;
      delete column.title;
    }
    
    console.log('Отправка данных для обновления колонки:', column);
    const updatedColumn = yield call(api.put, `/api/columns/${action.payload.id}`, column);
    console.log('Ответ API при обновлении колонки:', updatedColumn);
    
    // Добавляем title для совместимости с фронтендом
    if(updatedColumn && updatedColumn.name) {
      updatedColumn.title = updatedColumn.name;
    }
    
    yield put(updateColumnSuccess(updatedColumn));
  } catch (error) {
    console.error('Ошибка при обновлении колонки:', error);
    yield put(updateColumnFailure(error.toString()));
  } finally {
    yield put(setLoading({ feature: 'columns', isLoading: false }));
  }
}

function* deleteColumn(action) {
  try {
    yield put(setLoading({ feature: 'columns', isLoading: true }));
    const columnId = action.payload;
    yield call(api.delete, `/api/columns/${columnId}`);
    yield put(deleteColumnSuccess(columnId));
  } catch (error) {
    yield put(deleteColumnFailure(error.toString()));
  } finally {
    yield put(setLoading({ feature: 'columns', isLoading: false }));
  }
}

function* reorderColumns(action) {
  const { boardId, columnIds, prevOrder } = action.payload;
  try {
    yield put(setLoading({ feature: 'columns', isLoading: true }));
    console.log('Отправка запроса на reorder колонок:', columnIds);
    
    // Проверим формат данных - нужен просто массив ID колонок
    const columnIdsArray = Array.isArray(columnIds) ? columnIds : [];
    console.log('Данные для отправки в API:', columnIdsArray);
    
    // Отправляем просто массив id на сервер без оборачивания в объект
    yield call(api.put, '/api/columns/reorder', columnIdsArray);
    
    console.log('Успешное изменение порядка колонок');
    
    // После успешного reorder — обновляем колонки для доски
    if (boardId) {
      yield put(fetchColumnsByBoardRequest(boardId));
    }
  } catch (error) {
    console.error('Ошибка при изменении порядка колонок:', error);
    // Откатить порядок
    if (boardId && prevOrder) {
      yield put(resetColumnsOrder({ boardId, prevOrder }));
    }
  } finally {
    yield put(setLoading({ feature: 'columns', isLoading: false }));
  }
}

export default function* columnsSaga() {
  yield all([
    takeLatest(fetchColumnsByBoardRequest.type, fetchColumnsByBoard),
    takeLatest(createColumnRequest.type, createColumn),
    takeLatest(updateColumnRequest.type, updateColumn),
    takeLatest(deleteColumnRequest.type, deleteColumn),
    takeLatest(reorderColumnsRequest.type, reorderColumns),
  ]);
} 