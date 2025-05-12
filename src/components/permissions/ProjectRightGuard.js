import React from 'react';
import { useProjectRights } from '../../hooks/useRights';

/**
 * Компонент для условного рендеринга на основе прав на уровне проекта.
 * Отображает дочерние элементы только если пользователь имеет необходимые права.
 * 
 * @param {Object} props
 * @param {number} props.projectId - ID проекта
 * @param {string|string[]} props.requires - Право или массив прав, необходимых для отображения содержимого
 * @param {boolean} props.requireAll - Если true, требуются все права из массива, иначе достаточно одного
 * @param {React.ReactNode} props.children - Содержимое для отображения при наличии прав
 * @param {React.ReactNode} props.fallback - Опционально: содержимое для отображения при отсутствии прав
 * @returns {React.ReactNode}
 */
const ProjectRightGuard = ({ 
  projectId, 
  requires, 
  requireAll = false, 
  children, 
  fallback = null 
}) => {
  const { hasRight, hasAllRights, hasAnyRight, isLoading } = useProjectRights(projectId);

  if (isLoading) return null;

  const hasAccess =
    typeof requires === 'string' 
      ? hasRight(requires) 
      : requireAll 
        ? hasAllRights(requires) 
        : hasAnyRight(requires);

  return hasAccess ? children : fallback;
};

export default ProjectRightGuard; 