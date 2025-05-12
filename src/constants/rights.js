export const PROJECT_RIGHTS = {
  VIEW_PROJECT: 'VIEW_PROJECT',
  EDIT_PROJECT: 'EDIT_PROJECT',
  MANAGE_MEMBERS: 'MANAGE_MEMBERS',
  MANAGE_RIGHTS: 'MANAGE_RIGHTS',
  CREATE_BOARDS: 'CREATE_BOARDS',
  EDIT_BOARDS: 'EDIT_BOARDS',
  DELETE_BOARDS: 'DELETE_BOARDS',
  MANAGE_ACCESS: 'MANAGE_ACCESS',
  ACCESS_ALL_BOARDS: 'ACCESS_ALL_BOARDS',
  MANAGE_BOARD_RIGHTS: 'MANAGE_BOARD_RIGHTS'
};

export const BOARD_RIGHTS = {
  VIEW_BOARD: 'VIEW_BOARD',
  CREATE_TASKS: 'CREATE_TASKS',
  EDIT_TASKS: 'EDIT_TASKS',
  DELETE_TASKS: 'DELETE_TASKS',
  MOVE_TASKS: 'MOVE_TASKS',
  MOVE_COLUMNS: 'MOVE_COLUMNS',
  MANAGE_MEMBERS: 'MANAGE_MEMBERS',
  MANAGE_RIGHTS: 'MANAGE_RIGHTS',
  CREATE_SECTIONS: 'CREATE_SECTIONS',
  EDIT_SECTIONS: 'EDIT_SECTIONS',
  DELETE_SECTIONS: 'DELETE_SECTIONS'
};

export const PROJECT_RIGHT_DESCRIPTIONS = {
  [PROJECT_RIGHTS.VIEW_PROJECT]: 'Базовое разрешение просматривать проект',
  [PROJECT_RIGHTS.EDIT_PROJECT]: 'Разрешение редактировать детали проекта',
  [PROJECT_RIGHTS.MANAGE_MEMBERS]: 'Разрешение добавлять/удалять участников проекта',
  [PROJECT_RIGHTS.MANAGE_RIGHTS]: 'Разрешение редактировать права участников проекта',
  [PROJECT_RIGHTS.CREATE_BOARDS]: 'Разрешение создавать доски в проекте',
  [PROJECT_RIGHTS.EDIT_BOARDS]: 'Разрешение редактировать доски в проекте',
  [PROJECT_RIGHTS.DELETE_BOARDS]: 'Разрешение удалять доски в проекте',
  [PROJECT_RIGHTS.MANAGE_ACCESS]: 'Разрешение управлять доступом пользователей к доскам',
  [PROJECT_RIGHTS.ACCESS_ALL_BOARDS]: 'Маркер для пользователей, которые должны автоматически получать доступ ко всем доскам',
  [PROJECT_RIGHTS.MANAGE_BOARD_RIGHTS]: 'Разрешение редактировать права участников на уровне досок',
};

export const BOARD_RIGHT_DESCRIPTIONS = {
  [BOARD_RIGHTS.VIEW_BOARD]: 'Базовое разрешение просматривать доску',
  [BOARD_RIGHTS.CREATE_TASKS]: 'Разрешение создавать задачи',
  [BOARD_RIGHTS.EDIT_TASKS]: 'Разрешение редактировать задачи',
  [BOARD_RIGHTS.DELETE_TASKS]: 'Разрешение удалять задачи',
  [BOARD_RIGHTS.MOVE_TASKS]: 'Разрешение перемещать задачи между колонками и в пределах колонки',
  [BOARD_RIGHTS.MOVE_COLUMNS]: 'Разрешение переупорядочивать колонки',
  [BOARD_RIGHTS.MANAGE_MEMBERS]: 'Разрешение добавлять/удалять участников доски',
  [BOARD_RIGHTS.MANAGE_RIGHTS]: 'Разрешение редактировать права участников доски',
  [BOARD_RIGHTS.CREATE_SECTIONS]: 'Разрешение создавать разделы',
  [BOARD_RIGHTS.EDIT_SECTIONS]: 'Разрешение редактировать разделы',
  [BOARD_RIGHTS.DELETE_SECTIONS]: 'Разрешение удалять разделы',
};

export const RIGHT_DESCRIPTIONS = {
  ...PROJECT_RIGHT_DESCRIPTIONS,
  ...BOARD_RIGHT_DESCRIPTIONS
}; 