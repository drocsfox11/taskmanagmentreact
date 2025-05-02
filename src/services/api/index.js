import { baseApi } from './baseApi';

// Экспортируем API и хуки из всех модулей
export * from './projectsApi';
export * from './boardsApi';
export * from './columnsApi';
export * from './tasksApi';
export * from './usersApi';
export * from './authApi';
export * from './tagsApi';

// Экспортируем baseApi для добавления в store

// Экспортируем reducerPath и middleware для конфигурации Redux store
export const apiReducer = { [baseApi.reducerPath]: baseApi.reducer };
export const apiMiddleware = baseApi.middleware; 