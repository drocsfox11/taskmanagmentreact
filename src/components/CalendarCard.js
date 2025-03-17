import '../styles/components/CalendarCard.css'
import OptionsPassive from "../assets/icons/options_passive.svg";
import Girl from "../assets/icons/profile_picture.svg";
import TaskListIcon from "../assets/icons/task_list.svg";
import EyeIcon from "../assets/icons/eye.svg";
import CommentIcon from "../assets/icons/comments.svg";
import Clip from "../assets/icons/clip.svg";

function CalendarCard({ startDate, endDate, style }) {
    return (
        <div id='calendar-card-container' style={style}>


            <div id='calendar-card-text-info-container'>

                <div id='calendar-card-text-info-header'>Сетка страницы</div>
                <div id='calendar-card-text-info-text'>Нужно сделать основную сетку страницы без смысловых блоков. Сетка должна быть адаптивной под все девайсы</div>


            </div>

            <div id='calendar-card-points-list'>

                <img src={TaskListIcon} id='calendar-card-points-list-icon'/>
                <div id='calendar-card-points-list-counter'>0/8</div>

            </div>

            <div id='calendar-card-delimiter'></div>

            <div id='calendar-card-down-container'>

                <div id="calendar-card-people">

                    <div id="calendar-card-people-item">
                        <img src={Girl}/>
                    </div>

                    <div id="calendar-card-people-item">
                        <img src={Girl}/>
                    </div>

                    <div id="calendar-card-people-item">
                        <img src={Girl}/>
                    </div>

                    <div id="calendar-card-people-item">
                        <img src={Girl}/>
                    </div>

                    <div id="calendar-card-people-item-more">
                        +3
                    </div>

                </div>

                <div id='calendar-card-misc-info-container'>
                    {startDate} - {endDate}
                </div>

            </div>


        </div>
    );
}

export default CalendarCard;
