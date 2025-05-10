import { useEffect, useState } from 'react';
import { useGetCurrentUserQuery } from '../services/api/usersApi';
import { useGetUserRightsQuery } from '../services/api/projectsApi';
import { useGetBoardUserRightsQuery } from '../services/api/boardsApi';

/**
 * Хук для проверки прав пользователя на уровне проекта
 * @param {number} projectId - ID проекта
 * @returns {Object} Объект с правами и методами для проверки прав
 */
export const useProjectRights = (projectId) => {
  const { data: currentUser } = useGetCurrentUserQuery();
  const userId = currentUser?.id;
  
  // Отладочный вывод для проверки параметров
  console.log(`useProjectRights called with projectId: ${projectId}, userId: ${userId}`);
  
  const { data: userRights = [], isLoading, isFetching, error } = useGetUserRightsQuery(
    { projectId, userId },
    { skip: !projectId || !userId }
  );
  
  // Добавляем отладочный вывод для результатов запроса
  useEffect(() => {
    console.log(`Project rights loaded for projectId: ${projectId}`);
    console.log(`Loading: ${isLoading}, Fetching: ${isFetching}`);
    console.log(`Rights:`, userRights);
    if (error) console.error(`Error loading rights:`, error);
  }, [projectId, userRights, isLoading, isFetching, error]);
  
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
 * @returns {Object} Объект с правами и методами для проверки прав
 */
export const useBoardRights = (boardId) => {
  const { data: currentUser } = useGetCurrentUserQuery();
  const userId = currentUser?.id;
  
  // Отладочный вывод для проверки параметров
  console.log(`useBoardRights called with boardId: ${boardId}, userId: ${userId}`);
  
  const { data: userRights = [], isLoading, isFetching, error } = useGetBoardUserRightsQuery(
    { boardId, userId },
    { skip: !boardId || !userId }
  );
  
  // Добавляем отладочный вывод для результатов запроса
  useEffect(() => {
    console.log(`Board rights loaded for boardId: ${boardId}`);
    console.log(`Loading: ${isLoading}, Fetching: ${isFetching}`);
    console.log(`Rights:`, userRights);
    if (error) console.error(`Error loading rights:`, error);
  }, [boardId, userRights, isLoading, isFetching, error]);
  
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