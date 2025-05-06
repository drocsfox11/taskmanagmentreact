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
import { useParams } from "react-router-dom";

const tasks = [
    {
        id: 1,
        startDate: "2025-04-01",
        endDate: "2025-04-05",
    },
];

function TaskDashboard() {
    // const isLoading = useSelector(state => state.ui.loading.tasks);
    const isLoading = false;
    const { projectId } = useParams();
    const task = tasks[0];

    const startCol = parseInt(task.startDate.split("-")[2], 10); // "2025-04-01" => 01 => 1
    const endCol = parseInt(task.endDate.split("-")[2], 10) + 1; // 5 + 1 = 6

    return (
        <div id='task-calendars-dashboard-container'>
            <div id='task-calendar-container'>
                <TopBar></TopBar>
                {isLoading && <LoadingSpinner />}


                <div id='task-calendar-weekpicker-bar-container'>

                    <div id='task-calendar-cards-month-dropdown-container'>

                        <div id='task-calendar-cards-month-dropdown-month'>Апрель 2025</div>
                        <img src={DropdownIcon}/>

                    </div>

                    <div id='task-calendar-cards-week-pagination-container'>

                        <div id='task-calendar-cards-week-pagination-left'>
                            <img src={LeftIcon}/>
                        </div>
                        <div id='task-calendar-cards-week-pagination-current-week'>
                            1 апреля - 14 апреля
                        </div>
                        <div id='task-calendar-cards-week-pagination-right'>
                            <img src={RightIcon}/>
                        </div>


                    </div>


                </div>

                <div className="custom-calendar-grid">

                    <div className="custom-calendar-grid-header">
                        <div className="day-cell">Пн 1</div>
                        <div className="day-cell">Вт 2</div>
                        <div className="day-cell">Ср 3</div>
                        <div className="day-cell">Чт 4</div>
                        <div className="day-cell">Пт 5</div>
                        <div className="day-cell">Сб 6</div>
                        <div className="day-cell">Вс 7</div>
                        <div className="day-cell">Пн 8</div>
                        <div className="day-cell">Вт 9</div>
                        <div className="day-cell">Ср 10</div>
                        <div className="day-cell">Чт 11</div>
                        <div className="day-cell">Пт 12</div>
                        <div className="day-cell">Сб 13</div>
                        <div className="day-cell">Вс 14</div>
                    </div>

                    <div className="calendar-body">
                        <CalendarCard
                            startDate={task.startDate}
                            endDate={task.endDate}
                            style={{gridColumn: `${startCol} / ${endCol}`}}
                        />
                        <CalendarCard
                            startDate={task.startDate}
                            endDate={task.endDate}
                            style={{gridColumn: `${startCol} / ${endCol}`}}
                        />
                        <CalendarCard
                            startDate={task.startDate}
                            endDate={task.endDate}
                            style={{gridColumn: `${startCol} / ${endCol}`}}
                        />
                        <CalendarCard
                            startDate={task.startDate}
                            endDate={task.endDate}
                            style={{gridColumn: `${startCol} / ${endCol}`}}
                        />
                        <CalendarCard
                            startDate={task.startDate}
                            endDate={task.endDate}
                            style={{gridColumn: `${startCol} / ${endCol}`}}
                        />
                        <CalendarCard
                            startDate={task.startDate}
                            endDate={task.endDate}
                            style={{gridColumn: `${startCol} / ${endCol}`}}
                        />
                        <CalendarCard
                            startDate={task.startDate}
                            endDate={task.endDate}
                            style={{gridColumn: `${startCol} / ${endCol}`}}
                        />
                        <CalendarCard
                            startDate={task.startDate}
                            endDate={task.endDate}
                            style={{gridColumn: `${startCol} / ${endCol}`}}
                        />
                        <CalendarCard
                            startDate={task.startDate}
                            endDate={task.endDate}
                            style={{gridColumn: `${startCol} / ${endCol}`}}
                        />
                    </div>



                </div>


            </div>
        </div>

    );
}

export default TaskDashboard;
