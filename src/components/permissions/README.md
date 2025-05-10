# Компоненты для работы с правами доступа

В этом каталоге содержатся компоненты и хуки для управления доступом к элементам интерфейса на основе прав пользователя.

## Хуки

### useProjectRights

Хук для проверки прав пользователя на уровне проекта.

```jsx
const { hasRight, hasAnyRight, hasAllRights, rights } = useProjectRights(projectId);

// Проверка одного права
if (hasRight(PROJECT_RIGHTS.EDIT_PROJECT)) {
  // Показать/активировать функциональность редактирования
}

// Проверка любого из списка прав
if (hasAnyRight([PROJECT_RIGHTS.EDIT_PROJECT, PROJECT_RIGHTS.DELETE_BOARDS])) {
  // Показать меню действий
}

// Проверка всех прав из списка
if (hasAllRights([PROJECT_RIGHTS.EDIT_PROJECT, PROJECT_RIGHTS.MANAGE_MEMBERS])) {
  // Показать расширенные настройки
}
```

### useBoardRights

Хук для проверки прав пользователя на уровне доски.

```jsx
const { hasRight, hasAnyRight, hasAllRights, rights } = useBoardRights(boardId);

// Проверка одного права
if (hasRight(BOARD_RIGHTS.EDIT_TASKS)) {
  // Показать кнопку редактирования задачи
}

// Проверка любого из списка прав
if (hasAnyRight([BOARD_RIGHTS.EDIT_TASKS, BOARD_RIGHTS.DELETE_TASKS])) {
  // Показать меню действий с задачей
}

// Проверка всех прав из списка
if (hasAllRights([BOARD_RIGHTS.EDIT_TASKS, BOARD_RIGHTS.MOVE_TASKS])) {
  // Показать расширенное меню задачи
}
```

## Компоненты для условного рендеринга

### ProjectRightGuard

Компонент для условного рендеринга на основе прав пользователя на уровне проекта.

```jsx
<ProjectRightGuard 
  projectId={projectId} 
  requires={PROJECT_RIGHTS.EDIT_PROJECT}
>
  <button onClick={handleEditProject}>Редактировать проект</button>
</ProjectRightGuard>

// С запасным вариантом
<ProjectRightGuard 
  projectId={projectId} 
  requires={PROJECT_RIGHTS.EDIT_PROJECT}
  fallback={<span>У вас нет прав на редактирование проекта</span>}
>
  <button onClick={handleEditProject}>Редактировать проект</button>
</ProjectRightGuard>

// С массивом прав (любое из)
<ProjectRightGuard 
  projectId={projectId} 
  requires={[PROJECT_RIGHTS.EDIT_PROJECT, PROJECT_RIGHTS.MANAGE_MEMBERS]}
>
  <button onClick={handleEditProject}>Управление проектом</button>
</ProjectRightGuard>

// С массивом прав (все из)
<ProjectRightGuard 
  projectId={projectId} 
  requires={[PROJECT_RIGHTS.EDIT_PROJECT, PROJECT_RIGHTS.MANAGE_MEMBERS]}
  requireAll={true}
>
  <button onClick={handleEditProject}>Полное управление проектом</button>
</ProjectRightGuard>
```

### BoardRightGuard

Компонент для условного рендеринга на основе прав пользователя на уровне доски.

```jsx
<BoardRightGuard 
  boardId={boardId} 
  requires={BOARD_RIGHTS.CREATE_TASKS}
>
  <button onClick={handleCreateTask}>Создать задачу</button>
</BoardRightGuard>

// С запасным вариантом
<BoardRightGuard 
  boardId={boardId} 
  requires={BOARD_RIGHTS.EDIT_TASKS}
  fallback={<span>У вас нет прав на редактирование задач</span>}
>
  <button onClick={handleEditTask}>Редактировать задачу</button>
</BoardRightGuard>

// С массивом прав (любое из)
<BoardRightGuard 
  boardId={boardId} 
  requires={[BOARD_RIGHTS.EDIT_TASKS, BOARD_RIGHTS.DELETE_TASKS]}
>
  <div className="task-actions">
    <button onClick={handleEditTask}>Редактировать</button>
    <button onClick={handleDeleteTask}>Удалить</button>
  </div>
</BoardRightGuard>

// С массивом прав (все из)
<BoardRightGuard 
  boardId={boardId} 
  requires={[BOARD_RIGHTS.EDIT_TASKS, BOARD_RIGHTS.MOVE_TASKS]}
  requireAll={true}
>
  <div className="task-advanced-actions">
    <button onClick={handleEditTask}>Редактировать и переместить</button>
  </div>
</BoardRightGuard>
```

## HOC (Компоненты высшего порядка)

### withProjectRights

HOC для проверки прав на уровне проекта. Полезен для оборачивания целых компонентов.

```jsx
// Создание защищенного компонента
const ProjectSettingsWithRights = withProjectRights(
  ProjectSettings, 
  { requires: PROJECT_RIGHTS.EDIT_PROJECT }
);

// Использование
<ProjectSettingsWithRights projectId={projectId} />

// С запасным компонентом
const CreateBoardButtonWithRights = withProjectRights(
  CreateBoardButton, 
  { 
    requires: PROJECT_RIGHTS.CREATE_BOARDS,
    fallback: AccessDeniedMessage
  }
);

// С массивом прав
const ManageProjectButtonWithRights = withProjectRights(
  ManageProjectButton, 
  { 
    requires: [PROJECT_RIGHTS.EDIT_PROJECT, PROJECT_RIGHTS.MANAGE_MEMBERS],
    requireAll: true
  }
);
```

### withBoardRights

HOC для проверки прав на уровне доски. Полезен для оборачивания целых компонентов.

```jsx
// Создание защищенного компонента
const EditTaskButtonWithRights = withBoardRights(
  EditTaskButton, 
  { requires: BOARD_RIGHTS.EDIT_TASKS }
);

// Использование
<EditTaskButtonWithRights boardId={boardId} taskId={taskId} />

// С запасным компонентом
const DeleteTaskButtonWithRights = withBoardRights(
  DeleteTaskButton, 
  { 
    requires: BOARD_RIGHTS.DELETE_TASKS,
    fallback: AccessDeniedMessage
  }
);

// С массивом прав
const TaskActionsWithRights = withBoardRights(
  TaskActions, 
  { 
    requires: [BOARD_RIGHTS.EDIT_TASKS, BOARD_RIGHTS.DELETE_TASKS, BOARD_RIGHTS.MOVE_TASKS],
    requireAll: false // любое из этих прав
  }
);
```

## Примеры использования в существующих компонентах

### 1. Модальное окно создания задачи

```jsx
function BoardView({ boardId }) {
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  
  return (
    <div className="board-view">
      {/* Кнопка создания задачи видна только с правом CREATE_TASKS */}
      <BoardRightGuard boardId={boardId} requires={BOARD_RIGHTS.CREATE_TASKS}>
        <button onClick={() => setShowCreateTaskModal(true)}>
          Создать задачу
        </button>
      </BoardRightGuard>
      
      {/* Модальное окно открывается только если есть право CREATE_TASKS */}
      {showCreateTaskModal && (
        <BoardRightGuard boardId={boardId} requires={BOARD_RIGHTS.CREATE_TASKS}>
          <CreateTaskModal 
            boardId={boardId} 
            onClose={() => setShowCreateTaskModal(false)}
          />
        </BoardRightGuard>
      )}
    </div>
  );
}
```

### 2. Управление проектом

```jsx
function ProjectHeader({ project }) {
  return (
    <div className="project-header">
      <h1>{project.title}</h1>
      
      {/* Кнопка управления проектом видна только с правом EDIT_PROJECT */}
      <ProjectRightGuard projectId={project.id} requires={PROJECT_RIGHTS.EDIT_PROJECT}>
        <button onClick={() => openProjectSettings()}>
          Настройки проекта
        </button>
      </ProjectRightGuard>
      
      {/* Кнопка управления участниками видна только с правом MANAGE_MEMBERS */}
      <ProjectRightGuard projectId={project.id} requires={PROJECT_RIGHTS.MANAGE_MEMBERS}>
        <button onClick={() => openMembersManagement()}>
          Управление участниками
        </button>
      </ProjectRightGuard>
    </div>
  );
}
```

### 3. Карточка задачи с проверкой прав

```jsx
function TaskCard({ task, boardId }) {
  const { hasRight } = useBoardRights(boardId);
  
  return (
    <div className="task-card">
      <h3>{task.title}</h3>
      <p>{task.description}</p>
      
      {/* Действия с задачей */}
      <div className="task-actions">
        {/* Кнопка редактирования */}
        {hasRight(BOARD_RIGHTS.EDIT_TASKS) && (
          <button onClick={() => openEditTaskModal(task)}>
            Редактировать
          </button>
        )}
        
        {/* Кнопка удаления */}
        {hasRight(BOARD_RIGHTS.DELETE_TASKS) && (
          <button onClick={() => confirmDeleteTask(task)}>
            Удалить
          </button>
        )}
        
        {/* Кнопка перемещения */}
        <BoardRightGuard boardId={boardId} requires={BOARD_RIGHTS.MOVE_TASKS}>
          <button onClick={() => openMoveTaskModal(task)}>
            Переместить
          </button>
        </BoardRightGuard>
      </div>
    </div>
  );
}
```

### 4. Настройки доски

```jsx
// Обертка компонента настроек доски с проверкой прав
const BoardSettingsWithRights = withBoardRights(
  BoardSettings,
  { 
    requires: [BOARD_RIGHTS.MANAGE_MEMBERS, BOARD_RIGHTS.MANAGE_RIGHTS],
    requireAll: false,
    fallback: AccessDeniedMessage
  }
);

function BoardView({ boardId }) {
  return (
    <div className="board-view">
      {/* Другие компоненты */}
      
      {/* Настройки доски доступны только с соответствующими правами */}
      <BoardSettingsWithRights boardId={boardId} />
    </div>
  );
}
``` 