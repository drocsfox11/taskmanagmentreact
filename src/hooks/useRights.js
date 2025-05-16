import { useEffect, useState } from 'react';
import { useGetCurrentUserQuery } from '../services/api/usersApi';
import { useGetCurrentUserRightsQuery, useGetAllUserRightsQuery } from '../services/api/projectsApi';
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
  
  const shouldSkip = options.skip || !userId;
  
  const { data: allProjectRights = {}, isLoading, isFetching, error } = useGetCurrentUserRightsQuery(
    { skip: shouldSkip }
  );
  
  const userRights = projectId && allProjectRights[projectId] ? allProjectRights[projectId] : [];
  
  useEffect(() => {
    if (!shouldSkip && error) {
      console.error(`Error loading project rights:`, error);
    }
  }, [error, shouldSkip]);
  
  /**
   * Проверяет наличие указанного права у пользователя
   * @param {string} rightName - Имя права для проверки
   * @returns {boolean} true, если пользователь имеет указанное право
   */
  const hasRight = (rightName) => {
    return userRights && userRights.includes && userRights.includes(rightName);
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
  
  const shouldSkip = options.skip || !boardId || !userId;
  
  const { data: userRights = [], isLoading, isFetching, error } = useGetBoardUserRightsQuery(
    { boardId, userId },
    { skip: shouldSkip }
  );
  
  useEffect(() => {
    if (!shouldSkip && error) {
      console.error(`Error loading board rights:`, error);
    }
  }, [error, shouldSkip]);
  
  /**
   * Проверяет наличие указанного права у пользователя
   * @param {string} rightName - Имя права для проверки
   * @returns {boolean} true, если пользователь имеет указанное право
   */
  const hasRight = (rightName) => {
    return userRights && userRights.includes && userRights.includes(rightName);
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