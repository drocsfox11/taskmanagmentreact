import '../styles/components/CalendarCard.css'
import TaskListIcon from "../assets/icons/task_list.svg";
import Girl from "../assets/icons/profile_picture.svg";

function CalendarCard({ task, startDate, endDate, boardTitle, style }) {
    // Format dates for display
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        
        // Форматирование даты и времени
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        
        return `${day}.${month}.${year} ${hours}:${minutes}`;
    };

    // Calculate progress based on checklist items if available
    const calculateProgress = () => {
        if (task && task.checklist && task.checklist.length > 0) {
            const total = task.checklist.length;
            return `${total}`;
        }
        return '0';
    };

    // Get tag color if available
    const getTagColor = () => {
        if (task && task.tag && task.tag.color) {
            return task.tag.color;
        }
        return '#FFD700'; // Default color как на скриншоте
    };

    // Get tag name if available
    const getTagName = () => {
        if (task && task.tag && task.tag.name) {
            return task.tag.name;
        }
        return '';
    };

    const taskTitle = task ? task.title : 'Задача без названия';
    const taskDescription = task ? task.description : '';
    const boardName = task.boardTitle || boardTitle || '';
    const columnName = task.columnName || '';
    const progress = calculateProgress();
    const participants = task.participants || [];
    const tagColor = getTagColor();
    const tagName = getTagName();
    
    const formattedStartDate = formatDate(startDate);
    const formattedEndDate = formatDate(endDate);
    
    const displayDate = 
        formattedStartDate && formattedEndDate && formattedStartDate !== formattedEndDate
            ? `${formattedStartDate} - ${formattedEndDate}`
            : formattedStartDate || formattedEndDate || '';

    return (
        <div className='calendar-card-container' style={style}>
            <div className="calendar-card-header">
                {boardName && (
                    <div className='calendar-card-board-title'>
                        {boardName}{columnName ? ` / ${columnName}` : ''}
                    </div>
                )}
                
                {task.tag && (
                    <div className='calendar-card-tag' style={{ backgroundColor: tagColor }}>
                        {tagName}
                    </div>
                )}
            </div>

            <div className='calendar-card-content'>
                <div className='calendar-card-text-info-container'>
                    <div className='calendar-card-text-info-header'>{taskTitle}</div>
                    {taskDescription && (
                        <div className='calendar-card-text-info-text'>{taskDescription}</div>
                    )}
                </div>

                {task.checklist && task.checklist.length > 0 && (
            <div className='calendar-card-points-list'>
                        <img src={TaskListIcon} className='calendar-card-points-list-icon' alt="Task list" />
                        <div className='calendar-card-points-list-counter'>{progress}</div>
                    </div>
                )}
            </div>

            <div className='calendar-card-delimiter'></div>

            <div className='calendar-card-down-container'>
                {participants.length > 0 && (
                <div className="calendar-card-people">
                        {participants.slice(0, 4).map((user, index) => (
                            <div key={index} className="calendar-card-people-item">
                                {user.avatarURL ? (
                                    <img src={user.avatarURL} alt={user.name || 'User'} />
                                ) : (
                                    <img src={Girl} alt="Default user" />
                                )}
                    </div>
                        ))}

                        {participants.length > 4 && (
                            <div className="calendar-card-people-item-more">
                                +{participants.length - 4}
                    </div>
                        )}
                    </div>
                )}

                {displayDate && (
                    <div className='calendar-card-misc-info-container'>
                        {displayDate}
                    </div>
                )}
            </div>
        </div>
    );
}

export default CalendarCard;
