// Компоненты для условного рендеринга
export { default as ProjectRightGuard } from './ProjectRightGuard';
export { default as BoardRightGuard } from './BoardRightGuard';

// HOC для обертывания компонентов
export { default as withProjectRights } from './withProjectRights';
export { default as withBoardRights } from './withBoardRights';

// Хуки для доступа к правам
export { useProjectRights, useBoardRights } from '../../hooks/useRights'; 