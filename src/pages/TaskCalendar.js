import TopBar from "../components/TopBar";
import '../styles/pages/TaskCalendar.css'
import DropdownIcon from "../assets/icons/month_dropdown.svg";
import LeftIcon from "../assets/icons/left_date.svg";
import RightIcon from '../assets/icons/right_date.svg'
import CalendarCard from "../components/CalendarCard";
import { useSelector } from 'react-redux';
import LoadingSpinner from "../components/LoadingSpinner";
import { useParams, useNavigate } from "react-router-dom";
import { useGetProjectsQuery, useSearchTasksMutation, useGetBoardsQuery } from "../services/api";
import { useState, useEffect, useRef } from 'react';
import { useDebounce } from '../hooks/useDebounce';

function TaskCalendar() {
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());
    const [viewMode, setViewMode] = useState('week');
    const [columnSize, setColumnSize] = useState('day');
    const [searchParams, setSearchParams] = useState({
        searchText: "",
        projectId: null,
        boardId: null,
        tagId: null,
        isCompleted: null,
        sortDirection: "asc",
        isTitleSearch: true,
        isDescriptionSearch: true
    });
    const [searchIn, setSearchIn] = useState("both");
    const [filtersVisible, setFiltersVisible] = useState(false);
    const [searchError, setSearchError] = useState(null);
    
    const { projectId } = useParams();

    const { data: projects = [], isLoading: isProjectsLoading } = useGetProjectsQuery();
    const { data: boards = [], isLoading: isBoardsLoading } = useGetBoardsQuery(
        searchParams.projectId, 
        { skip: !searchParams.projectId }
    );
    const [searchTasks, { 
        data: searchResults,
        isLoading: isSearchLoading,
        error: searchApiError
    }] = useSearchTasksMutation();
    
    const calendarTasks = searchResults || [];
    const debouncedSearchText = useDebounce(searchParams.searchText, 500);
    
    useEffect(() => {
        if (viewMode === 'week') {
            initializeWeekView();
        } else if (viewMode === 'twoWeek') {
            initializeTwoWeekView();
        } else if (viewMode === 'month') {
            initializeMonthView();
        } else if (viewMode === 'columns') {
            initializeColumnsView();
        }
    }, [viewMode, columnSize]);
    
    const initializeWeekView = () => {
        const currentDate = new Date();
        const firstDayOfWeek = new Date(currentDate);
        const dayOfWeek = currentDate.getDay();
        const diff = currentDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        firstDayOfWeek.setDate(diff);
        
        const lastDayOfWeek = new Date(firstDayOfWeek);
        lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
        
        setStartDate(firstDayOfWeek);
        setEndDate(lastDayOfWeek);
    };
    
    const initializeTwoWeekView = () => {
        const currentDate = new Date();
        const firstDayOfWeek = new Date(currentDate);
        const dayOfWeek = currentDate.getDay();
        const diff = currentDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        firstDayOfWeek.setDate(diff);
        
        const lastDayOfNextWeek = new Date(firstDayOfWeek);
        lastDayOfNextWeek.setDate(firstDayOfWeek.getDate() + 13);
        
        setStartDate(firstDayOfWeek);
        setEndDate(lastDayOfNextWeek);
    };
    
    const initializeMonthView = () => {
        const currentDate = new Date();
        const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        

        const dayOfWeek = firstDay.getDay();
        const adjustedFirstDay = new Date(firstDay);
        if (dayOfWeek !== 1) {
            const daysToAdjust = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
            adjustedFirstDay.setDate(adjustedFirstDay.getDate() - daysToAdjust);
        }

        const lastDay = new Date(adjustedFirstDay);
        lastDay.setDate(adjustedFirstDay.getDate() + 34);
        
        setStartDate(adjustedFirstDay);
        setEndDate(lastDay);
    };
    
    const initializeColumnsView = () => {
        const currentDate = new Date();
        

        const startingDate = new Date(currentDate);
        startingDate.setHours(0, 0, 0, 0);

        const lastDate = new Date(startingDate);
        
        if (columnSize === 'day') {
            lastDate.setDate(startingDate.getDate() + 5); // Show 6 days
        } else if (columnSize === 'week') {
            lastDate.setDate(startingDate.getDate() + (6 * 7) - 1); // Show 6 weeks
        } else if (columnSize === 'month') {
            lastDate.setMonth(startingDate.getMonth() + 6); // Show 6 months
            lastDate.setDate(lastDate.getDate() - 1);
        }
        
        setStartDate(startingDate);
        setEndDate(lastDate);
    };

    useEffect(() => {
        if (projectId) {
            setSearchParams(prev => ({
                ...prev,
                projectId: parseInt(projectId) || null
            }));
        }
    }, [projectId]);


    useEffect(() => {
        performSearch();
    }, [debouncedSearchText, searchParams.projectId, searchParams.boardId, 
        searchParams.tagId, searchParams.isCompleted, searchParams.sortDirection,
        searchParams.isTitleSearch, searchParams.isDescriptionSearch]);
    



    const performSearch = async () => {
        setSearchError(null);
        
        const filteredParams = Object.entries(searchParams).reduce((acc, [key, value]) => {
            if (value !== null && value !== undefined) {
                if (Array.isArray(value) && value.length === 0) {
                    return acc;
                }
                acc[key] = value;
            }
            return acc;
        }, {});
        
        try {
            await searchTasks(filteredParams);
        } catch (error) {
            console.error("Search error:", error);
            setSearchError(`Ошибка поиска: ${error.message || 'Неизвестная ошибка'}`);
        }
    };
    
    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long'
        });
    };
    
    const handleSearchTextChange = (e) => {
        setSearchParams(prev => ({
            ...prev,
            searchText: e.target.value
        }));
    };
    
    const handleProjectChange = (projectId) => {
        setSearchParams(prev => ({
            ...prev,
            projectId: projectId,
            boardId: null,
            tagId: null
        }));
    };
    
    const handleBoardChange = (boardId) => {
        setSearchParams(prev => ({
            ...prev,
            boardId: boardId,
            tagId: null
        }));
    };
    
    const handleTagChange = (tagId) => {
        setSearchParams(prev => ({
            ...prev,
            tagId: tagId
        }));
    };
    
    const handleCompletionStatusChange = (status) => {
        setSearchParams(prev => ({
            ...prev,
            isCompleted: status
        }));
    };
    
    const handleSortDirectionChange = (direction) => {
        setSearchParams(prev => ({
            ...prev,
            sortDirection: direction
        }));
    };
    
    const handleSearchInChange = (searchInValue) => {
        setSearchIn(searchInValue);
        
        setSearchParams(prev => ({
            ...prev,
            isTitleSearch: searchInValue === 'title' || searchInValue === 'both',
            isDescriptionSearch: searchInValue === 'description' || searchInValue === 'both'
        }));
        
        performSearch();
    };
    
    const handleChangeViewMode = (mode) => {
        setViewMode(mode);
    };
    
    const handleClearSearch = () => {
        setSearchParams({
            searchText: "",
            projectId: parseInt(projectId) || null,
            boardId: null,
            tagId: null,
            isCompleted: null,
            sortDirection: "asc",
            isTitleSearch: true,
            isDescriptionSearch: true
        });
        setSearchIn("both");
    };
    
    const toggleFilters = () => {
        setFiltersVisible(!filtersVisible);
    };
    
    const getDatesArray = () => {
        const dates = [];
        const currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
            dates.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return dates;
    };
    
    const mapTasksToCalendar = () => {
        const calendarDates = getDatesArray();
        const mappedTasks = [];
        console.log("Маппинг задач");
        calendarTasks.forEach(task => {
            console.log(task);
            if (!task.startDate && !task.endDate) {
                console.log("Пропускаю")
                return;
            }
            
            const taskStartDate = task.startDate ? new Date(task.startDate) : new Date(task.endDate);
            const taskEndDate = task.endDate ? new Date(task.endDate) : new Date(task.startDate);
            
            const taskStartDay = new Date(taskStartDate);
            taskStartDay.setHours(0, 0, 0, 0);
            
            const taskEndDay = new Date(taskEndDate);
            taskEndDay.setHours(23, 59, 59, 999);
            
            const startDateDay = new Date(startDate);
            startDateDay.setHours(0, 0, 0, 0);
            
            if (taskEndDay >= startDateDay && taskStartDay <= endDate) {
                const taskStartDayOfMonth = taskStartDate.getDate();
                const taskEndDayOfMonth = taskEndDate.getDate();
                
                let gridColumns = viewMode === 'twoWeek' ? 14 : viewMode === 'week' ? 7 : 7;
                let startCol = 1;
                let endCol = gridColumns;
                
                for (let i = 0; i < calendarDates.length; i++) {
                    if (calendarDates[i].getDate() === taskStartDayOfMonth &&
                        calendarDates[i].getMonth() === taskStartDate.getMonth() &&
                        calendarDates[i].getFullYear() === taskStartDate.getFullYear()) {
                        // For month view, we need to calculate column based on day of week (0-6)
                        if (viewMode === 'month') {
                            const dayOfWeek = calendarDates[i].getDay();
                            startCol = dayOfWeek === 0 ? 7 : dayOfWeek; // Sunday is 7, Monday is 1
                            
                            // Calculate the row (week number in the month view)
                            const weekNumber = Math.floor(i / 7) + 1;
                            startCol = startCol + ((weekNumber - 1) * 7);
                        } else {
                            startCol = i + 1;
                        }
                        break;
                    }
                }
                
                // Find the ending column based on the position in the dates array
                for (let i = 0; i < calendarDates.length; i++) {
                    if (calendarDates[i].getDate() === taskEndDayOfMonth &&
                        calendarDates[i].getMonth() === taskEndDate.getMonth() &&
                        calendarDates[i].getFullYear() === taskEndDate.getFullYear()) {
                        // For month view, we need to calculate column based on day of week (0-6)
                        if (viewMode === 'month') {
                            const dayOfWeek = calendarDates[i].getDay();
                            endCol = dayOfWeek === 0 ? 7 : dayOfWeek; // Sunday is 7, Monday is 1
                            
                            // Calculate the row (week number in the month view)
                            const weekNumber = Math.floor(i / 7) + 1;
                            endCol = endCol + ((weekNumber - 1) * 7) + 1;
                        } else {
                            endCol = i + 2;
                        }
                        break;
                    }
                }
                
                if (taskStartDay < startDateDay) {
                    startCol = 1;
                }
                
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
    
    const navigatePreviousPeriod = () => {
        if (viewMode === 'columns') {
            navigatePreviousPeriodColumns();
            return;
        }
        
        if (viewMode === 'week') {
            const newStartDate = new Date(startDate);
            newStartDate.setDate(newStartDate.getDate() - 7);
            
            const newEndDate = new Date(endDate);
            newEndDate.setDate(newEndDate.getDate() - 7);
            
            setStartDate(newStartDate);
            setEndDate(newEndDate);
        } else if (viewMode === 'twoWeek') {
            const newStartDate = new Date(startDate);
            newStartDate.setDate(newStartDate.getDate() - 14);
            
            const newEndDate = new Date(endDate);
            newEndDate.setDate(newEndDate.getDate() - 14);
            
            setStartDate(newStartDate);
            setEndDate(newEndDate);
        } else if (viewMode === 'month') {
            const monthCounts = {};
            const dates = getDatesArray();
            
            dates.forEach(date => {
                const monthKey = `${date.getMonth()}-${date.getFullYear()}`;
                monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
            });
            
            let primaryMonthKey = Object.keys(monthCounts).reduce((a, b) => 
                monthCounts[a] > monthCounts[b] ? a : b);
            
            const [primaryMonth, primaryYear] = primaryMonthKey.split('-').map(Number);
            
            const newMonth = primaryMonth - 1;
            const newYear = primaryYear + (newMonth < 0 ? -1 : 0);
            const newMonthAdjusted = newMonth < 0 ? 11 : newMonth;
            
            const newStartDate = new Date(newYear, newMonthAdjusted, 1);
            
            const dayOfWeek = newStartDate.getDay();
            if (dayOfWeek !== 1) {
                const daysToAdjust = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                newStartDate.setDate(newStartDate.getDate() - daysToAdjust);
            }
            
            const newEndDate = new Date(newStartDate);
            newEndDate.setDate(newStartDate.getDate() + 34);
            
            setStartDate(newStartDate);
            setEndDate(newEndDate);
        }
    };
    
    const navigateNextPeriod = () => {
        if (viewMode === 'columns') {
            navigateNextPeriodColumns();
            return;
        }
        
        if (viewMode === 'week') {
            const newStartDate = new Date(startDate);
            newStartDate.setDate(newStartDate.getDate() + 7);
            
            const newEndDate = new Date(endDate);
            newEndDate.setDate(newEndDate.getDate() + 7);
            
            setStartDate(newStartDate);
            setEndDate(newEndDate);
        } else if (viewMode === 'twoWeek') {
            const newStartDate = new Date(startDate);
            newStartDate.setDate(newStartDate.getDate() + 14);
            
            const newEndDate = new Date(endDate);
            newEndDate.setDate(newEndDate.getDate() + 14);
            
            setStartDate(newStartDate);
            setEndDate(newEndDate);
        } else if (viewMode === 'month') {
            const monthCounts = {};
            const dates = getDatesArray();
            
            dates.forEach(date => {
                const monthKey = `${date.getMonth()}-${date.getFullYear()}`;
                monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
            });
            
            let primaryMonthKey = Object.keys(monthCounts).reduce((a, b) => 
                monthCounts[a] > monthCounts[b] ? a : b);
            
            const [primaryMonth, primaryYear] = primaryMonthKey.split('-').map(Number);

            const newMonth = primaryMonth + 1;
            const newYear = primaryYear + (newMonth > 11 ? 1 : 0);
            const newMonthAdjusted = newMonth > 11 ? 0 : newMonth;
            
            const newStartDate = new Date(newYear, newMonthAdjusted, 1);
            
            const dayOfWeek = newStartDate.getDay();
            if (dayOfWeek !== 1) { // Not Monday
                const daysToAdjust = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                newStartDate.setDate(newStartDate.getDate() - daysToAdjust);
            }
            
            const newEndDate = new Date(newStartDate);
            newEndDate.setDate(newStartDate.getDate() + 34);
            
            setStartDate(newStartDate);
            setEndDate(newEndDate);
        }
    };
    
    const getMonthYearDisplay = () => {
        const startMonth = startDate.toLocaleString('ru-RU', { month: 'long' });
        const startYear = startDate.getFullYear();
        const endMonth = endDate.toLocaleString('ru-RU', { month: 'long' });
        const endYear = endDate.getFullYear();
        
        if (viewMode === 'month') {
            const monthCounts = {};
            const dates = getDatesArray();
            
            dates.forEach(date => {
                const monthKey = `${date.getMonth()}-${date.getFullYear()}`;
                monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
            });
            
            let primaryMonthKey = Object.keys(monthCounts).reduce((a, b) => 
                monthCounts[a] > monthCounts[b] ? a : b);
            
            const [primaryMonth, primaryYear] = primaryMonthKey.split('-');
            const primaryMonthDate = new Date(parseInt(primaryYear), parseInt(primaryMonth), 1);
            
            return primaryMonthDate.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
        } else {
            if (startMonth === endMonth && startYear === endYear) {
                return `${startMonth} ${startYear}`;
            } else if (startYear === endYear) {
                return `${startMonth} - ${endMonth} ${startYear}`;
            } else {
                return `${startMonth} ${startYear} - ${endMonth} ${endYear}`;
            }
        }
    };
    
    const renderCalendarHeader = () => {
        const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
        
        if (viewMode === 'month' || viewMode === 'week') {
            return dayNames.map((day, index) => {
                const isWeekend = index >= 5; // Saturday and Sunday
                
                return (
                    <div key={`header-${index}`} className={`day-cell ${isWeekend ? 'weekend' : ''}`}>
                        {day}
                    </div>
                );
            });
        } else {
            const datesArray = getDatesArray();
            return datesArray.map((date, index) => {
                const dayName = date.toLocaleString('ru-RU', { weekday: 'short' }).toLowerCase();
                const dayNumber = date.getDate();
                const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                
                return (
                    <div key={`header-${index}`} className={`day-cell ${isWeekend ? 'weekend' : ''}`}>
                        {dayName} {dayNumber}
                    </div>
                );
            });
        }
    };
    
    const renderCalendarBody = () => {
        const dates = getDatesArray();
        
        if (viewMode === 'month') {
            const weeks = [];
            const numWeeks = Math.ceil(dates.length / 7);
            
            const tasksByDate = {};
            
            calendarTasks.forEach(task => {
                if (!task.startDate && !task.endDate) {
                    return;
                }
                
                const taskStartDate = task.startDate ? new Date(task.startDate) : new Date(task.endDate);
                const taskEndDate = task.endDate ? new Date(task.endDate) : new Date(task.startDate);
                
                const taskDates = [];
                const currentDate = new Date(taskStartDate);
                currentDate.setHours(0, 0, 0, 0);
                
                const endDate = new Date(taskEndDate);
                endDate.setHours(0, 0, 0, 0);
                
                while (currentDate <= endDate) {
                    taskDates.push(new Date(currentDate));
                    currentDate.setDate(currentDate.getDate() + 1);
                }
                
                taskDates.forEach(date => {
                    const dateKey = date.toISOString().split('T')[0];
                    if (!tasksByDate[dateKey]) {
                        tasksByDate[dateKey] = [];
                    }
                    
                    if (!tasksByDate[dateKey].some(t => t.id === task.id)) {
                        tasksByDate[dateKey].push(task);
                    }
                });
            });
            
            for (let week = 0; week < numWeeks; week++) {
                const weekDates = dates.slice(week * 7, (week + 1) * 7);
                
                weeks.push(
                    <div key={`week-${week}`} className="calendar-week">
                        {weekDates.map((date, dayIndex) => {
                            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                            
                            const monthCounts = {};
                            dates.forEach(d => {
                                const monthKey = `${d.getMonth()}-${d.getFullYear()}`;
                                monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
                            });
                            
                            let primaryMonthKey = Object.keys(monthCounts).reduce((a, b) => 
                                monthCounts[a] > monthCounts[b] ? a : b);
                            
                            const [primaryMonth, primaryYear] = primaryMonthKey.split('-');
                            
                            const isCurrentMonth = 
                                date.getMonth() === parseInt(primaryMonth) && 
                                date.getFullYear() === parseInt(primaryYear);
                                
                            const isOtherMonth = !isCurrentMonth;
                            
                            const dateKey = date.toISOString().split('T')[0];
                            const dayTasks = tasksByDate[dateKey] || [];
                            
                            return (
                                <div 
                                    key={`day-${week}-${dayIndex}`} 
                                    className={`calendar-day-cell ${isWeekend ? 'weekend' : ''} ${isOtherMonth ? 'other-month' : ''}`}
                                >
                                    <div className="day-number">{date.getDate()}</div>
                                    <div className="day-content">
                                        {dayTasks.length > 0 ? (
                                            dayTasks.slice(0, 3).map((task, taskIndex) => (
                                                <div 
                                                    key={`task-${task.id}-${taskIndex}`} 
                                                    className="month-view-task-item"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleTaskClick(task);
                                                    }}
                                                >
                                                    <div 
                                                        className="month-view-task-color" 
                                                        style={{ backgroundColor: task.tag ? task.tag.color : '#5558FF' }}
                                                    ></div>
                                                    <div className="month-view-task-title">{task.title}</div>
                                                </div>
                                            ))
                                        ) : null}
                                        
                                        {dayTasks.length > 3 && (
                                            <div className="month-view-more-tasks">
                                                +{dayTasks.length - 3} еще
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                );
            }
            
            return (
                <div className="calendar-month-grid">
                    {weeks}
                </div>
            );
        }
        
        return null;
    };
    
    const isLoading = isProjectsLoading || isSearchLoading || isBoardsLoading;
    
    const mappedTasks = mapTasksToCalendar();
    
    const availableTags = boards.find(board => board.id === searchParams.boardId)?.tags || [];

    const handleTaskClick = (task) => {
        console.log('Task clicked:', task);

        
        alert(`Task: ${task.title}\nDescription: ${task.description || 'No description'}`);
    };

    const handleColumnSizeChange = (size) => {
        setColumnSize(size);
    };

    const navigatePreviousPeriodColumns = () => {
        const newStartDate = new Date(startDate);
        const newEndDate = new Date(endDate);
        
        if (columnSize === 'day') {
            newStartDate.setDate(startDate.getDate() - 6); // Move back 6 days
            newEndDate.setDate(endDate.getDate() - 6);
        } else if (columnSize === 'week') {
            newStartDate.setDate(startDate.getDate() - (6 * 7)); // Move back 6 weeks
            newEndDate.setDate(endDate.getDate() - (6 * 7));
        } else if (columnSize === 'month') {
            newStartDate.setMonth(startDate.getMonth() - 6); // Move back 6 months
            newEndDate.setMonth(endDate.getMonth() - 6);
        }
        
        setStartDate(newStartDate);
        setEndDate(newEndDate);
    };

    const navigateNextPeriodColumns = () => {
        const newStartDate = new Date(startDate);
        const newEndDate = new Date(endDate);
        
        if (columnSize === 'day') {
            newStartDate.setDate(startDate.getDate() + 6); // Move forward 6 days
            newEndDate.setDate(endDate.getDate() + 6);
        } else if (columnSize === 'week') {
            newStartDate.setDate(startDate.getDate() + (6 * 7)); // Move forward 6 weeks
            newEndDate.setDate(endDate.getDate() + (6 * 7));
        } else if (columnSize === 'month') {
            newStartDate.setMonth(startDate.getMonth() + 6); // Move forward 6 months
            newEndDate.setMonth(endDate.getMonth() + 6);
        }
        
        setStartDate(newStartDate);
        setEndDate(newEndDate);
    };

    const getColumnPeriods = () => {
        const periods = [];
        const currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
            if (columnSize === 'day') {
                periods.push({
                    start: new Date(currentDate),
                    end: new Date(currentDate),
                    label: formatDate(currentDate)
                });
                currentDate.setDate(currentDate.getDate() + 1);
            } else if (columnSize === 'week') {
                const weekStart = new Date(currentDate);
                const weekEnd = new Date(currentDate);
                weekEnd.setDate(weekStart.getDate() + 6);
                
                periods.push({
                    start: weekStart,
                    end: weekEnd,
                    label: `${formatDate(weekStart)} - ${formatDate(weekEnd)}`
                });
                
                currentDate.setDate(currentDate.getDate() + 7);
            } else if (columnSize === 'month') {
                const monthStart = new Date(currentDate);
                const monthEnd = new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth() + 1,
                    0 // Last day of current month
                );
                
                periods.push({
                    start: monthStart,
                    end: monthEnd,
                    label: monthStart.toLocaleString('ru-RU', { month: 'long', year: 'numeric' })
                });
                
                currentDate.setMonth(currentDate.getMonth() + 1);
                currentDate.setDate(1);
            }
        }
        
        return periods;
    };

    const renderColumnsView = () => {
        const periods = getColumnPeriods();
        
        const tasksByPeriod = {};
        
        periods.forEach((period, index) => {
            tasksByPeriod[index] = [];
        });
        
        calendarTasks.forEach(task => {
            if (!task.startDate && !task.endDate) {
                return;
            }
            
            const taskStartDate = task.startDate ? new Date(task.startDate) : new Date(task.endDate);
            const taskEndDate = task.endDate ? new Date(task.endDate) : new Date(task.startDate);
            
            periods.forEach((period, index) => {
                if (
                    (taskStartDate <= period.end && taskEndDate >= period.start) || 
                    (taskStartDate >= period.start && taskStartDate <= period.end) ||
                    (taskEndDate >= period.start && taskEndDate <= period.end)
                ) {
                    tasksByPeriod[index].push(task);
                }
            });
        });
        
        return (
            <div className="columns-view-container">
                <div className="columns-view-header">
                    <div className="columns-view-size-selector">
                        <button 
                            className={`column-size-button ${columnSize === 'day' ? 'active' : ''}`}
                            onClick={() => handleColumnSizeChange('day')}
                        >
                            День
                        </button>
                        <button 
                            className={`column-size-button ${columnSize === 'week' ? 'active' : ''}`}
                            onClick={() => handleColumnSizeChange('week')}
                        >
                            Неделя
                        </button>
                        <button 
                            className={`column-size-button ${columnSize === 'month' ? 'active' : ''}`}
                            onClick={() => handleColumnSizeChange('month')}
                        >
                            Месяц
                        </button>
                    </div>
                </div>
                
                <div className="columns-view-content">
                    {periods.map((period, index) => (
                        <div key={`column-${index}`} className="time-column">
                            <div className="time-column-header">
                                {period.label}
                            </div>
                            <div className="time-column-content">
                                {tasksByPeriod[index].length > 0 ? (
                                    tasksByPeriod[index].map((task) => (
                                        <div 
                                            key={`column-task-${task.id}`} 
                                            className="column-task-card"
                                            onClick={() => handleTaskClick(task)}
                                        >
                                            {task.tag && (
                                                <div 
                                                    className="column-task-tag" 
                                                    style={{ backgroundColor: task.tag.color }}
                                                ></div>
                                            )}
                                            <div className="column-task-title">{task.title}</div>
                                            {task.startDate && (
                                                <div className="column-task-dates">
                                                    {new Date(task.startDate).toLocaleDateString('ru-RU')}
                                                    {task.endDate && task.endDate !== task.startDate && (
                                                        ` - ${new Date(task.endDate).toLocaleDateString('ru-RU')}`
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="no-tasks-in-column">Нет задач</div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className='task-calendars-dashboard-container'>
            <div className='task-calendar-container'>
                <TopBar></TopBar>
                {isLoading && <LoadingSpinner />}
                
                <div className='task-calendar-search-filters-row'>
                    <div className='task-calendar-search-input-container'>
                        <input
                            type="text"
                            placeholder="Поиск задач..."
                            value={searchParams.searchText}
                            onChange={handleSearchTextChange}
                            className="task-calendar-search-text-input"
                        />
                        {searchParams.searchText && (
                            <button className="clear-search-btn" onClick={handleClearSearch}>
                                ×
                            </button>
                        )}
                    </div>
                    
                    <div className="task-calendar-search-toggle">
                        <div 
                            className={`search-toggle-option ${searchIn === 'title' ? 'active' : ''}`}
                            onClick={() => handleSearchInChange('title')}
                        >
                            Название
                        </div>
                        <div 
                            className={`search-toggle-option ${searchIn === 'description' ? 'active' : ''}`}
                            onClick={() => handleSearchInChange('description')}
                        >
                            Описание
                        </div>
                        <div 
                            className={`search-toggle-option ${searchIn === 'both' ? 'active' : ''}`}
                            onClick={() => handleSearchInChange('both')}
                        >
                            Оба
                        </div>
                    </div>
                    
                    <button 
                        className={`task-calendar-filter-toggle-btn ${filtersVisible ? 'active' : ''}`}
                        onClick={toggleFilters}
                    >
                        Фильтры {filtersVisible ? '▲' : '▼'}
                    </button>
                </div>
                
                {searchError && (
                    <div className="search-error-message">
                        {searchError}
                    </div>
                )}
                
                {filtersVisible && (
                    <div className='task-calendar-filters-container'>
                        <div className='task-calendar-filter'>
                            <label>Проект:</label>
                            <select 
                                value={searchParams.projectId || ""}
                                onChange={(e) => handleProjectChange(e.target.value ? parseInt(e.target.value) : null)}
                            >
                                <option value="">Все проекты</option>
                                {projects.map(project => (
                                    <option key={project.id} value={project.id}>
                                        {project.title}
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        <div className='task-calendar-filter'>
                            <label>Доска:</label>
                            <select 
                                value={searchParams.boardId || ""}
                                onChange={(e) => handleBoardChange(e.target.value ? parseInt(e.target.value) : null)}
                                disabled={!searchParams.projectId}
                            >
                                <option value="">Все доски</option>
                                {boards.map(board => (
                                    <option key={board.id} value={board.id}>
                                        {board.title}
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        <div className='task-calendar-filter'>
                            <label>Тег:</label>
                            <select 
                                value={searchParams.tagId || ""}
                                onChange={(e) => handleTagChange(e.target.value ? parseInt(e.target.value) : null)}
                                disabled={!searchParams.boardId}
                            >
                                <option value="">Все теги</option>
                                {availableTags.map(tag => (
                                    <option key={tag.id} value={tag.id}>
                                        {tag.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        <div className='task-calendar-filter'>
                            <label>Статус:</label>
                            <select 
                                value={searchParams.isCompleted === null ? "" : searchParams.isCompleted.toString()}
                                onChange={(e) => handleCompletionStatusChange(
                                    e.target.value === "" ? null : e.target.value === "true"
                                )}
                            >
                                <option value="">Любой статус</option>
                                <option value="false">Не завершено</option>
                                <option value="true">Завершено</option>
                            </select>
                        </div>
                        
                        <div className='task-calendar-filter'>
                            <label>Сортировка по дате:</label>
                            <select 
                                value={searchParams.sortDirection}
                                onChange={(e) => handleSortDirectionChange(e.target.value)}
                            >
                                <option value="asc">От ближних к дальним</option>
                                <option value="desc">От дальних к ближним</option>
                            </select>
                        </div>
                    </div>
                )}

                <div className='task-calendar-weekpicker-bar-container'>
                    <div className='task-calendar-cards-month-dropdown-container'>
                        <div className='task-calendar-cards-month-dropdown-month'>
                            {getMonthYearDisplay()}
                        </div>
                        <img src={DropdownIcon} alt="Calendar dropdown" />
                    </div>

                    <div className="task-calendar-view-toggle">
                        <button 
                            className={`view-mode-button ${viewMode === 'week' ? 'active' : ''}`}
                            onClick={() => handleChangeViewMode('week')}
                        >
                            Неделя
                        </button>
                        <button 
                            className={`view-mode-button ${viewMode === 'twoWeek' ? 'active' : ''}`}
                            onClick={() => handleChangeViewMode('twoWeek')}
                        >
                            2 недели
                        </button>
                        <button 
                            className={`view-mode-button ${viewMode === 'month' ? 'active' : ''}`}
                            onClick={() => handleChangeViewMode('month')}
                        >
                            Месяц
                        </button>
                        <button 
                            className={`view-mode-button ${viewMode === 'columns' ? 'active' : ''}`}
                            onClick={() => handleChangeViewMode('columns')}
                        >
                            Колонки
                        </button>
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

                {viewMode === 'month' ? (
                    <div className="custom-calendar-grid month-view" key="month-view">
                        <div className="custom-calendar-grid-header month-header">
                            {renderCalendarHeader()}
                        </div>
                        {renderCalendarBody()}
                    </div>
                ) : viewMode === 'columns' ? (
                    <div className="custom-calendar-grid columns-view" key="columns-view">
                        {renderColumnsView()}
                    </div>
                ) : (
                    <div className={`custom-calendar-grid ${viewMode === 'week' ? 'week-view' : 'two-week-view'}`} key={viewMode === 'week' ? 'week-view' : 'two-week-view'}>
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
                                    {searchParams.searchText || filtersVisible ? 'Нет задач, соответствующих критериям поиска' : 'Нет задач с датами для отображения в календаре'}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default TaskCalendar;
