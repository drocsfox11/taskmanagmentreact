import TopBar from "../components/TopBar";
import '../styles/pages/TaskCalendar.css'
import ProjectMenu from "../components/ProjectMenu";
import {Emoji, EmojiProvider} from "react-apple-emojis";
import emojiData from "react-apple-emojis/src/data.json"
import DropdownIcon from "../assets/icons/month_dropdown.svg";
import LeftIcon from "../assets/icons/left_date.svg";
import RightIcon from '../assets/icons/right_date.svg'
import CalendarCard from "../components/CalendarCard";
import { useSelector } from 'react-redux';
import LoadingSpinner from "../components/LoadingSpinner";
import { useParams, useNavigate } from "react-router-dom";
import { useGetProjectsQuery } from "../services/api/projectsApi";
import { useGetTasksByProjectQuery } from "../services/api/tasksApi";
import { useState, useEffect } from 'react';

function TaskDashboard() {
    // States for calendar management
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [projectsDropdownOpen, setProjectsDropdownOpen] = useState(false);
    
    // Get URL params and navigation
    const { projectId } = useParams();
    const navigate = useNavigate();
    
    // Fetch projects and tasks data using RTK Query
    const { data: projects = [], isLoading: isProjectsLoading } = useGetProjectsQuery();
    const { 
        data: projectTasks = [], 
        isLoading: isTasksLoading 
    } = useGetTasksByProjectQuery(projectId, { skip: !projectId });
    
    // Current selected project
    const [selectedProject, setSelectedProject] = useState(null);
    
    // Processed tasks for calendar
    const [calendarTasks, setCalendarTasks] = useState([]);
    
    // Setup initial dates for two-week view
    useEffect(() => {
        const currentDate = new Date();
        const firstDayOfWeek = new Date(currentDate);
        const dayOfWeek = currentDate.getDay();
        const diff = currentDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Sunday
        firstDayOfWeek.setDate(diff);
        
        const lastDayOfNextWeek = new Date(firstDayOfWeek);
        lastDayOfNextWeek.setDate(firstDayOfWeek.getDate() + 13); // 14 days (2 weeks) minus 1
        
        setStartDate(firstDayOfWeek);
        setEndDate(lastDayOfNextWeek);
    }, []);
    
    // Find selected project when projectId changes
    useEffect(() => {
        if (projectId && projects.length > 0) {
            const project = projects.find(p => p.id.toString() === projectId.toString());
            setSelectedProject(project || null);
        } else if (projects.length > 0 && !projectId) {
            // Select first project by default if none is selected
            setSelectedProject(projects[0]);
            // Only navigate if not already navigating (prevent infinite loop)
            if (!window.location.pathname.includes(`/system/calendar/${projects[0].id}`)) {
                navigate(`/system/calendar/${projects[0].id}`);
            }
        }
    }, [projectId, projects]);
    
    // Process project tasks when they're loaded
    useEffect(() => {
        if (projectTasks) {
            if (projectTasks.length > 0) {
                // Process tasks if needed
                const processedTasks = projectTasks.map(task => ({
                    ...task,
                    // Add any necessary field transformations here
                }));
                
                setCalendarTasks(processedTasks);
            } else if (calendarTasks.length !== 0) {
                // Only set empty array if current state is not already empty
                setCalendarTasks([]);
            }
        }
    }, [projectTasks]);
    
    // Format date for display
    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long'
        });
    };
    
    // Handle project selection
    const handleProjectSelect = (project) => {
        setSelectedProject(project);
        navigate(`/system/calendar/${project.id}`);
        setProjectsDropdownOpen(false);
    };
    
    // Generate array of dates for the calendar grid
    const getDatesArray = () => {
        const dates = [];
        const currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
            dates.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return dates;
    };
    
    // Map tasks to the calendar grid
    const mapTasksToCalendar = () => {
        const calendarDates = getDatesArray();
        const mappedTasks = [];
        
        calendarTasks.forEach(task => {
            // Проверяем, что у задачи есть хотя бы одна дата (startDate или endDate)
            if (!task.startDate && !task.endDate) {
                return; // Пропускаем задачи без дат
            }
            
            // Используем startDate если есть, иначе endDate для начальной даты
            const taskStartDate = task.startDate ? new Date(task.startDate) : new Date(task.endDate);
            // Используем endDate если есть, иначе startDate для конечной даты
            const taskEndDate = task.endDate ? new Date(task.endDate) : new Date(task.startDate);
            
            // Установить время на полночь для корректного сравнения только по дате
            const taskStartDay = new Date(taskStartDate);
            taskStartDay.setHours(0, 0, 0, 0);
            
            const taskEndDay = new Date(taskEndDate);
            taskEndDay.setHours(23, 59, 59, 999);
            
            const startDateDay = new Date(startDate);
            startDateDay.setHours(0, 0, 0, 0);
            
            // Check if task overlaps with current calendar view
            if (taskEndDay >= startDateDay && taskStartDay <= endDate) {
                // Получаем день месяца из дат
                const taskStartDayOfMonth = taskStartDate.getDate();
                const taskEndDayOfMonth = taskEndDate.getDate();
                const startDateDayOfMonth = startDate.getDate();
                
                // Calculate grid positioning by comparing calendar days with task days
                // Find matching day in calendar array for start column
                let startCol = 1; // По умолчанию первая колонка
                let endCol = 14; // По умолчанию последняя колонка
                
                // Находим индекс ячейки для начала задачи
                for (let i = 0; i < calendarDates.length; i++) {
                    if (calendarDates[i].getDate() === taskStartDayOfMonth &&
                        calendarDates[i].getMonth() === taskStartDate.getMonth() &&
                        calendarDates[i].getFullYear() === taskStartDate.getFullYear()) {
                        startCol = i + 1; // +1 потому что grid-column начинается с 1
                        break;
                    }
                }
                
                // Находим индекс ячейки для конца задачи
                for (let i = 0; i < calendarDates.length; i++) {
                    if (calendarDates[i].getDate() === taskEndDayOfMonth &&
                        calendarDates[i].getMonth() === taskEndDate.getMonth() &&
                        calendarDates[i].getFullYear() === taskEndDate.getFullYear()) {
                        endCol = i + 2; // +2 потому что grid-column-end не включает последнюю колонку
                        break;
                    }
                }
                
                // Если задача начинается раньше текущего диапазона
                if (taskStartDay < startDateDay) {
                    startCol = 1;
                }
                
                // Если задача заканчивается позже текущего диапазона
                if (taskEndDay > endDate) {
                    endCol = calendarDates.length + 1;
                }
                
                mappedTasks.push({
                    ...task,
                    startCol,
                    endCol
                });
            }
        });
        
        return mappedTasks;
    };
    
    // Handle navigation to previous/next week
    const navigatePreviousPeriod = () => {
        const newStartDate = new Date(startDate);
        newStartDate.setDate(newStartDate.getDate() - 14);
        
        const newEndDate = new Date(endDate);
        newEndDate.setDate(newEndDate.getDate() - 14);
        
        setStartDate(newStartDate);
        setEndDate(newEndDate);
    };
    
    const navigateNextPeriod = () => {
        const newStartDate = new Date(startDate);
        newStartDate.setDate(newStartDate.getDate() + 14);
        
        const newEndDate = new Date(endDate);
        newEndDate.setDate(newEndDate.getDate() + 14);
        
        setStartDate(newStartDate);
        setEndDate(newEndDate);
    };
    
    // Format month and year for the header
    const getMonthYearDisplay = () => {
        const startMonth = startDate.toLocaleString('ru-RU', { month: 'long' });
        const startYear = startDate.getFullYear();
        const endMonth = endDate.toLocaleString('ru-RU', { month: 'long' });
        const endYear = endDate.getFullYear();
        
        if (startMonth === endMonth && startYear === endYear) {
            return `${startMonth} ${startYear}`;
        } else if (startYear === endYear) {
            return `${startMonth} - ${endMonth} ${startYear}`;
        } else {
            return `${startMonth} ${startYear} - ${endMonth} ${endYear}`;
        }
    };
    
    // Generate calendar header cells
    const renderCalendarHeader = () => {
        const datesArray = getDatesArray();
        return datesArray.map((date, index) => {
            // Сначала день недели сокращенно, затем номер
            const dayName = date.toLocaleString('ru-RU', { weekday: 'short' }).toLowerCase();
            const dayNumber = date.getDate();
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            
            return (
                <div key={index} className={`day-cell ${isWeekend ? 'weekend' : ''}`}>
                    {dayName} {dayNumber}
                </div>
            );
        });
    };
    
    // Loading state
    const isLoading = isProjectsLoading || isTasksLoading;
    
    // Map tasks to calendar
    const mappedTasks = mapTasksToCalendar();

    return (
        <div className='task-calendars-dashboard-container'>
            <div className='task-calendar-container'>
                <TopBar></TopBar>
                {isLoading && <LoadingSpinner />}

                <div className='task-calendar-project-selector-container'>
                    <div className='task-calendar-project-dropdown' onClick={() => setProjectsDropdownOpen(!projectsDropdownOpen)}>
                        <div className='task-calendar-selected-project'>
                            {selectedProject ? selectedProject.title : 'Выберите проект'}
                        </div>
                        <img src={DropdownIcon} alt="Toggle dropdown" />
                        
                        {projectsDropdownOpen && (
                            <div className='task-calendar-projects-dropdown-menu'>
                                {projects.map(project => (
                                    <div 
                                        key={project.id} 
                                        className='task-calendar-project-item'
                                        onClick={() => handleProjectSelect(project)}
                                    >
                                        {project.title}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className='task-calendar-weekpicker-bar-container'>
                    <div className='task-calendar-cards-month-dropdown-container'>
                        <div className='task-calendar-cards-month-dropdown-month'>
                            {getMonthYearDisplay()}
                        </div>
                        <img src={DropdownIcon} alt="Calendar dropdown" />
                    </div>

                    <div className='task-calendar-cards-week-pagination-container'>
                        <div className='task-calendar-cards-week-pagination-left' onClick={navigatePreviousPeriod}>
                            <img src={LeftIcon} alt="Previous period" />
                        </div>
                        <div className='task-calendar-cards-week-pagination-current-week'>
                            {formatDate(startDate)} - {formatDate(endDate)}
                        </div>
                        <div className='task-calendar-cards-week-pagination-right' onClick={navigateNextPeriod}>
                            <img src={RightIcon} alt="Next period" />
                        </div>
                    </div>
                </div>

                <div className="custom-calendar-grid">
                    <div className="custom-calendar-grid-header">
                        {renderCalendarHeader()}
                    </div>

                    <div className="calendar-body">
                        {mappedTasks.length > 0 ? (
                            mappedTasks.map((task, index) => (
                                <CalendarCard
                                    key={task.id || index}
                                    task={task}
                                    startDate={task.startDate}
                                    endDate={task.endDate}
                                    boardTitle={task.boardTitle}
                                    style={{gridColumn: `${task.startCol} / ${task.endCol}`}}
                                />
                            ))
                        ) : (
                            <div className="no-tasks-message">
                                {selectedProject ? 'Нет задач с датами в выбранном проекте' : 'Выберите проект для отображения задач'}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default TaskDashboard;
