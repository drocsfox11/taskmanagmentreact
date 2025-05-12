import { useEffect, useState } from 'react';
import { useGetCurrentUserQuery } from '../services/api/usersApi';
import { useGetUserRightsQuery, useGetAllUserRightsQuery } from '../services/api/projectsApi';
import { useGetBoardUserRightsQuery } from '../services/api/boardsApi';

/**
 * Хук для проверки прав пользователя на уровне проекта
 * @param {number} projectId - ID проекта
 * @param {Object} options - Опции запроса (например, {skip: true} для пропуска запроса)
 * @returns {Object} Объект с правами и методами для проверки прав
 */
export const useProjectRights = (projectId, options = {}) => {
  const { data: currentUser } = useGetCurrentUserQuery();
  const userId = currentUser?.id;
  
  // Определяем, нужно ли пропустить запрос
  const shouldSkip = options.skip || !userId;
  
  // Отладочный вывод для проверки параметров
  console.log(`useProjectRights called with projectId: ${projectId}, userId: ${userId}, skip: ${shouldSkip}`);
  
  // Получение всех прав пользователя на всех проектах
  const { data: allProjectRights = {}, isLoading, isFetching, error } = useGetAllUserRightsQuery(
    userId,
    { skip: shouldSkip }
  );
  
  // Извлекаем права для конкретного проекта из объекта всех прав
  const userRights = projectId && allProjectRights[projectId] ? allProjectRights[projectId] : [];
  
  // Добавляем отладочный вывод для результатов запроса
  useEffect(() => {
    if (!shouldSkip) {
      console.log(`Project rights loaded for projectId: ${projectId}`);
      console.log(`Loading: ${isLoading}, Fetching: ${isFetching}`);
      console.log(`Rights for project ${projectId}:`, userRights);
      if (error) console.error(`Error loading rights:`, error);
    }
  }, [projectId, userRights, isLoading, isFetching, error, shouldSkip]);
  
  /**
   * Проверяет наличие указанного права у пользователя
   * @param {string} rightName - Имя права для проверки
   * @returns {boolean} true, если пользователь имеет указанное право
   */
  const hasRight = (rightName) => {
    const result = userRights && userRights.includes && userRights.includes(rightName);
    console.log(`Checking right: ${rightName}, result: ${result}`);
    return result;
  };
  
  /**
   * Проверяет наличие хотя бы одного из указанных прав у пользователя
   * @param {string[]} rightNames - Массив прав для проверки
   * @returns {boolean} true, если пользователь имеет хотя бы одно из указанных прав
   */
  const hasAnyRight = (rightNames) => {
    if (!userRights || isLoading) return false;
    return rightNames.some(right => userRights.includes(right));
  };
  
  /**
   * Проверяет наличие всех указанных прав у пользователя
   * @param {string[]} rightNames - Массив прав для проверки
   * @returns {boolean} true, если пользователь имеет все указанные права
   */
  const hasAllRights = (rightNames) => {
    if (!userRights || isLoading) return false;
    return rightNames.every(right => userRights.includes(right));
  };
  
  return {
    rights: userRights,
    isLoading,
    hasRight,
    hasAnyRight,
    hasAllRights,
    userId
  };
};

/**
 * Хук для проверки прав пользователя на уровне доски
 * @param {number} boardId - ID доски
 * @param {Object} options - Опции запроса (например, {skip: true} для пропуска запроса)
 * @returns {Object} Объект с правами и методами для проверки прав
 */
export const useBoardRights = (boardId, options = {}) => {
  const { data: currentUser } = useGetCurrentUserQuery();
  const userId = currentUser?.id;
  
  // Определяем, нужно ли пропустить запрос
  const shouldSkip = options.skip || !boardId || !userId;
  
  // Отладочный вывод для проверки параметров
  console.log(`useBoardRights called with boardId: ${boardId}, userId: ${userId}, skip: ${shouldSkip}`);
  
  const { data: userRights = [], isLoading, isFetching, error } = useGetBoardUserRightsQuery(
    { boardId, userId },
    { skip: shouldSkip }
  );
  
  // Добавляем отладочный вывод для результатов запроса
  useEffect(() => {
    if (!shouldSkip) {
      console.log(`Board rights loaded for boardId: ${boardId}`);
      console.log(`Loading: ${isLoading}, Fetching: ${isFetching}`);
      console.log(`Rights:`, userRights);
      if (error) console.error(`Error loading rights:`, error);
    }
  }, [boardId, userRights, isLoading, isFetching, error, shouldSkip]);
  
  /**
   * Проверяет наличие указанного права у пользователя
   * @param {string} rightName - Имя права для проверки
   * @returns {boolean} true, если пользователь имеет указанное право
   */
  const hasRight = (rightName) => {
    const result = userRights && userRights.includes && userRights.includes(rightName);
    console.log(`Checking board right: ${rightName}, result: ${result}`);
    return result;
  };
  
  /**
   * Проверяет наличие хотя бы одного из указанных прав у пользователя
   * @param {string[]} rightNames - Массив прав для проверки
   * @returns {boolean} true, если пользователь имеет хотя бы одно из указанных прав
   */
  const hasAnyRight = (rightNames) => {
    if (!userRights || isLoading) return false;
    return rightNames.some(right => userRights.includes(right));
  };
  
  /**
   * Проверяет наличие всех указанных прав у пользователя
   * @param {string[]} rightNames - Массив прав для проверки
   * @returns {boolean} true, если пользователь имеет все указанные права
   */
  const hasAllRights = (rightNames) => {
    if (!userRights || isLoading) return false;
    return rightNames.every(right => userRights.includes(right));
  };
  
  return {
    rights: userRights,
    isLoading,
    hasRight,
    hasAnyRight,
    hasAllRights,
    userId
  };
}; 