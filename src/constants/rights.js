// Project rights constants
export const PROJECT_RIGHTS = {
  VIEW_PROJECT: 'VIEW_PROJECT',
  EDIT_PROJECT: 'EDIT_PROJECT',
  MANAGE_MEMBERS: 'MANAGE_MEMBERS',
  MANAGE_RIGHTS: 'MANAGE_RIGHTS',
  CREATE_BOARDS: 'CREATE_BOARDS',
  EDIT_BOARDS: 'EDIT_BOARDS',
  DELETE_BOARDS: 'DELETE_BOARDS',
  MANAGE_BOARD_ACCESS: 'MANAGE_BOARD_ACCESS',
  ACCESS_ALL_BOARDS: 'ACCESS_ALL_BOARDS'
};

// Board rights constants
export const BOARD_RIGHTS = {
  VIEW_BOARD: 'VIEW_BOARD',
  EDIT_BOARD: 'EDIT_BOARD',
  MANAGE_MEMBERS: 'MANAGE_MEMBERS',
  MANAGE_RIGHTS: 'MANAGE_RIGHTS',
  CREATE_COLUMNS: 'CREATE_COLUMNS',
  EDIT_COLUMNS: 'EDIT_COLUMNS',
  CREATE_CARDS: 'CREATE_CARDS',
  EDIT_CARDS: 'EDIT_CARDS',
  DELETE_CARDS: 'DELETE_CARDS',
  COMMENT_CARDS: 'COMMENT_CARDS',
  ASSIGN_MEMBERS: 'ASSIGN_MEMBERS'
};

// Rights descriptions - used for displaying in the UI
export const RIGHT_DESCRIPTIONS = {
  // Project rights descriptions
  [PROJECT_RIGHTS.VIEW_PROJECT]: 'Базовое право просмотра проекта',
  [PROJECT_RIGHTS.EDIT_PROJECT]: 'Редактирование информации о проекте',
  [PROJECT_RIGHTS.MANAGE_MEMBERS]: 'Управление участниками проекта',
  [PROJECT_RIGHTS.MANAGE_RIGHTS]: 'Управление правами участников',
  [PROJECT_RIGHTS.CREATE_BOARDS]: 'Создание новых досок в проекте',
  [PROJECT_RIGHTS.EDIT_BOARDS]: 'Редактирование досок',
  [PROJECT_RIGHTS.DELETE_BOARDS]: 'Удаление досок',
  [PROJECT_RIGHTS.MANAGE_BOARD_ACCESS]: 'Управление доступом к доскам',
  [PROJECT_RIGHTS.ACCESS_ALL_BOARDS]: 'Доступ ко всем доскам проекта',
  
  // Board rights descriptions
  [BOARD_RIGHTS.VIEW_BOARD]: 'Просмотр конкретной доски',
  [BOARD_RIGHTS.EDIT_BOARD]: 'Редактирование параметров доски',
  [BOARD_RIGHTS.MANAGE_MEMBERS]: 'Добавление/удаление участников доски',
  [BOARD_RIGHTS.MANAGE_RIGHTS]: 'Управление правами на доске',
  [BOARD_RIGHTS.CREATE_COLUMNS]: 'Создание новых колонок',
  [BOARD_RIGHTS.EDIT_COLUMNS]: 'Редактирование существующих колонок',
  [BOARD_RIGHTS.CREATE_CARDS]: 'Создание новых карточек',
  [BOARD_RIGHTS.EDIT_CARDS]: 'Редактирование содержимого карточек',
  [BOARD_RIGHTS.DELETE_CARDS]: 'Удаление карточек',
  [BOARD_RIGHTS.COMMENT_CARDS]: 'Добавление комментариев к карточкам',
  [BOARD_RIGHTS.ASSIGN_MEMBERS]: 'Назначение участников на карточки'
}; 