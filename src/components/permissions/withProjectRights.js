import React from 'react';
import { useProjectRights } from '../../hooks/useRights';

/**
 * HOC (компонент высшего порядка) для обертывания компонентов и проверки прав на уровне проекта.
 * 
 * @param {React.ComponentType} Component - Компонент для обертывания
 * @param {Object} options - Опции проверки прав
 * @param {string|string[]} options.requires - Право или массив прав, необходимых для отображения компонента
 * @param {boolean} options.requireAll - Если true, требуются все права из массива, иначе достаточно одного
 * @param {React.ComponentType} options.fallback - Опционально: компонент для отображения при отсутствии прав
 * @returns {React.ComponentType} Обернутый компонент с проверкой прав
 */
const withProjectRights = (
  Component,
  { requires, requireAll = false, fallback: FallbackComponent = null }
) => {
  // Создаем и возвращаем новый компонент
  return function WrappedWithRights(props) {
    const { projectId, ...restProps } = props;
    
    // Получаем права - важно всегда вызывать хук, даже если projectId не определён
    const { hasRight, hasAllRights, hasAnyRight, isLoading } = useProjectRights(projectId || 0);
    
    // Если не передан projectId, показываем предупреждение и возвращаем исходный компонент
    if (!projectId) {
      console.warn('withProjectRights: projectId is required for rights checking');
      return <Component {...props} />;
    }
    
    // Во время загрузки прав не отображаем компонент
    if (isLoading) return null;
    
    // Проверяем наличие прав
    const hasAccess = 
      typeof requires === 'string' 
        ? hasRight(requires) 
        : requireAll 
          ? hasAllRights(requires) 
          : hasAnyRight(requires);
    
    // Возвращаем компонент или fallback в зависимости от прав
    return hasAccess 
      ? <Component {...props} />
      : FallbackComponent
        ? <FallbackComponent {...restProps} />
        : null;
  };
};

export default withProjectRights; 