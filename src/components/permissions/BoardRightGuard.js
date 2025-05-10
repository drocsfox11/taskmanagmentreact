import React from 'react';
import { useBoardRights } from '../../hooks/useRights';

/**
 * Компонент для условного рендеринга на основе прав на уровне доски.
 * Отображает дочерние элементы только если пользователь имеет необходимые права.
 * 
 * @param {Object} props
 * @param {number} props.boardId - ID доски
 * @param {string|string[]} props.requires - Право или массив прав, необходимых для отображения содержимого
 * @param {boolean} props.requireAll - Если true, требуются все права из массива, иначе достаточно одного
 * @param {React.ReactNode} props.children - Содержимое для отображения при наличии прав
 * @param {React.ReactNode} props.fallback - Опционально: содержимое для отображения при отсутствии прав
 * @returns {React.ReactNode}
 */
const BoardRightGuard = ({ 
  boardId, 
  requires, 
  requireAll = false, 
  children, 
  fallback = null 
}) => {
  const { hasRight, hasAllRights, hasAnyRight, isLoading } = useBoardRights(boardId);

  // Во время загрузки прав не отображаем ничего
  if (isLoading) return null;

  // Проверяем наличие прав
  const hasAccess = 
    typeof requires === 'string' 
      ? hasRight(requires) 
      : requireAll 
        ? hasAllRights(requires) 
        : hasAnyRight(requires);

  // Отображаем содержимое только если есть доступ
  return hasAccess ? children : fallback;
};

export default BoardRightGuard; 