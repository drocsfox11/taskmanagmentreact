import { configureStore } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import rootReducer from './rootReducer';
import rootSaga from './rootSaga';
import { markPageLoad, wasPageJustLoaded, clearPageLoadFlag, incrementRefreshAttempts, getRefreshAttempts } from '../utils/refreshManager';
import { apiReducer, apiMiddleware } from '../services/api';

// Функции для сохранения и восстановления состояния из localStorage
export const saveState = (state) => {
  try {
    // Сохраняем только необходимые части состояния, но без данных требующих обновления
    const serializedState = JSON.stringify({
      currentUser: state.currentUser,
      // Не сохраняем данные, которые должны обновляться при перезагрузке
      // projects: state.projects,
      // boards: state.boards,
      // columns: state.columns,
      // tasks: state.tasks,
    });
    localStorage.setItem('reduxState', serializedState);
  } catch (err) {
    console.error('Не удалось сохранить состояние', err);
  }
};

export const loadState = () => {
  try {
    const serializedState = localStorage.getItem('reduxState');
    if (serializedState === null) {
      return undefined; // если нет сохраненного состояния, вернем undefined для использования initialState из reducers
    }
    return JSON.parse(serializedState);
  } catch (err) {
    console.error('Не удалось загрузить состояние', err);
    return undefined;
  }
};

const sagaMiddleware = createSagaMiddleware();

// Загружаем сохраненное состояние
const persistedState = loadState();

// Navigation middleware
const navigationMiddleware = () => (next) => (action) => {
    if (action.type === 'currentUser/navigateTo') {
        window.location.href = action.payload;
        return;
    }
    return next(action);
};

// Middleware для сохранения состояния в localStorage
const persistStateMiddleware = (store) => (next) => (action) => {
  const result = next(action);
  
  // Сохраняем состояние после каждого действия
  // Можно оптимизировать, сохраняя только при определенных действиях или с debounce
  saveState(store.getState());
  
  return result;
};

// Middleware для обновления данных при перезагрузке страницы
const refreshMiddleware = (() => {
  // Используем замыкание для хранения состояния между вызовами
  let refreshed = false;
  
  return store => next => action => {
    const result = next(action);
    
    // Если обновление уже было выполнено или это не Redux init, пропускаем
    if (refreshed || !wasPageJustLoaded()) {
      return result;
    }
    
    // Отмечаем, что обновление уже произошло
    refreshed = true;
    
    // Текущий URL для определения необходимых данных
    const currentPath = window.location.pathname;
    
    // Получаем необходимые параметры из URL
    let requestsSent = 0;
    
    console.log('Определяем необходимые запросы для пути:', currentPath);
    
    if (currentPath.includes('/project/') && currentPath.includes('/board/') && currentPath.includes('/tasks')) {
      // Страница задач - нужны проекты, доски, колонки и задачи 
      const matches = currentPath.match(/\/project\/(\d+)\/board\/(\d+)\/tasks/);
      if (matches && matches.length >= 3) {
        const projectId = Number(matches[1]);
        const boardId = Number(matches[2]);
        
        console.log('Запрашиваем данные для страницы задач (проект:', projectId, ', доска:', boardId, ')');
        
        // Отправляем только один запрос каждого типа
        store.dispatch({ type: 'projects/fetchProjectsRequest' });
        store.dispatch({ type: 'boards/fetchBoardsByProjectRequest', payload: projectId });
        store.dispatch({ type: 'columns/fetchColumnsByBoardRequest', payload: boardId });
        store.dispatch({ type: 'tasks/fetchTasksByBoardRequest', payload: boardId });
        requestsSent = 4;
      }
    }
    else if (currentPath.includes('/project/dashboards/')) {
      // Страница досок проекта - нужны проекты и доски
      const projectIdMatch = currentPath.match(/\/project\/dashboards\/(\d+)/);
      if (projectIdMatch && projectIdMatch.length >= 2) {
        const projectId = Number(projectIdMatch[1]);
        
        console.log('Запрашиваем данные для страницы досок проекта:', projectId);
        
        // Отправляем только один запрос каждого типа
        store.dispatch({ type: 'projects/fetchProjectsRequest' });
        store.dispatch({ type: 'boards/fetchBoardsByProjectRequest', payload: projectId });
        requestsSent = 2;
      }
    }
    else if (currentPath.includes('/project') && !currentPath.includes('/dashboards/')) {
      // Страница проектов - нужны только проекты
      console.log('Запрашиваем данные для страницы проектов');
      
      // Отправляем только один запрос
      store.dispatch({ type: 'projects/fetchProjectsRequest' });
      requestsSent = 1;
    }
    
    console.log('Отправлено запросов:', requestsSent);
    
    // Устанавливаем обработчик для сброса флага при следующем обновлении страницы
    setTimeout(() => {
      clearPageLoadFlag();
      refreshed = false;
    }, 1000);
    
    return result;
  };
})();

const store = configureStore({
  reducer: {
    // ...rootReducer,
    ...apiReducer, // Добавляем RTK Query редьюсеры
  },
  // preloadedState: persistedState, // Используем сохраненное состояние при создании стора
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      // .concat(sagaMiddleware)
      // .concat(navigationMiddleware)
      // .concat(persistStateMiddleware)
      // .concat(refreshMiddleware)
      .concat(apiMiddleware)
});

// sagaMiddleware.run(rootSaga);

export default store; 