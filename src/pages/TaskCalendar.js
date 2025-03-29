import TopBar from "../components/TopBar";
import '../styles/pages/TaskCalendar.css'
import ProjectMenu from "../components/ProjectMenu";
import {Emoji, EmojiProvider} from "react-apple-emojis";
import emojiData from "react-apple-emojis/src/data.json"
import DropdownIcon from "../assets/icons/month_dropdown.svg";
import LeftIcon from "../assets/icons/left_date.svg";
import RightIcon from '../assets/icons/right_date.svg'
import CalendarCard from "../components/CalendarCard";

const tasks = [
    {
        id: 1,
        startDate: "2025-04-01",
        endDate: "2025-04-05",
    },
];

function TaskDashboard() {

    const task = tasks[0];


    const startCol = parseInt(task.startDate.split("-")[2], 10); // "2025-04-01" => 01 => 1
    const endCol = parseInt(task.endDate.split("-")[2], 10) + 1; // 5 + 1 = 6

    return (

        <div id='task-calendars-dashboard-container'>
            <ProjectMenu></ProjectMenu>
            <div id='task-calendar-container'>

                <TopBar></TopBar>
                <div id='task-calendar-add-bar-container'>

                    <div id='task-calendar-icon-row-container'>
                        <div id='task-calendar-icon-container'>
                            <EmojiProvider data={emojiData}>
                                <Emoji name="teacher-light-skin-tone" width={22}/>
                            </EmojiProvider>
                        </div>

                        <div id='task-calendar-label-container'>
                            <div id='task-calendar-label-container-header'>Курсы языков - Дизайн</div>
                            <div id='task-calendar-progress-container'>

                                <div id='task-calendar-progress-bar'>

                                </div>

                                <div id='task-calendar-progress-text'>
                                    13% завершено
                                </div>

                            </div>

                        </div>

                    </div>

                </div>

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
                    <div id='custom-calendar-grid-day'>Пн 1</div>
                    <div id='custom-calendar-grid-day'>Вт 2</div>
                    <div id='custom-calendar-grid-day'>Ср 3</div>
                    <div id='custom-calendar-grid-day'>Чт 4</div>
                    <div id='custom-calendar-grid-day'>Пт 5</div>
                    <div id='custom-calendar-grid-day'>Сб 6</div>
                    <div id='custom-calendar-grid-day'>Вс 7</div>
                    <div id='custom-calendar-grid-day'>Пн 8</div>
                    <div id='custom-calendar-grid-day'>Вт 9</div>
                    <div id='custom-calendar-grid-day'>Ср 10</div>
                    <div id='custom-calendar-grid-day'>Чт 11</div>
                    <div id='custom-calendar-grid-day'>Пт 12</div>
                    <div id='custom-calendar-grid-day'>Сб 13</div>
                    <div id='custom-calendar-grid-day'>Вс 14</div>

                    <CalendarCard
                        startDate={task.startDate}
                        endDate={task.endDate}
                        style={{gridColumn: `${startCol} / ${endCol}`}}
                    />
                </div>


            </div>
        </div>

    );
}

export default TaskDashboard;
