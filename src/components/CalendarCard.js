import '../styles/components/CalendarCard.css'
import OptionsPassive from "../assets/icons/options_passive.svg";
import Girl from "../assets/icons/profile_picture.svg";
import TaskListIcon from "../assets/icons/task_list.svg";
import EyeIcon from "../assets/icons/eye.svg";
import CommentIcon from "../assets/icons/comments.svg";
import Clip from "../assets/icons/clip.svg";

function CalendarCard({ startDate, endDate, style }) {
    return (
        <div className='calendar-card-container' style={style}>


            <div className='calendar-card-text-info-container'>

                <div className='calendar-card-text-info-header'>Сетка страницы</div>
                <div className='calendar-card-text-info-text'>Нужно сделать основную сетку страницы без смысловых блоков. Сетка должна быть адаптивной под все девайсы</div>


            </div>

            <div className='calendar-card-points-list'>

                <img src={TaskListIcon} className='calendar-card-points-list-icon'/>
                <div className='calendar-card-points-list-counter'>0/8</div>

            </div>

            <div className='calendar-card-delimiter'></div>

            <div className='calendar-card-down-container'>

                <div className="calendar-card-people">

                    <div className="calendar-card-people-item">
                        <img src={Girl}/>
                    </div>

                    <div className="calendar-card-people-item">
                        <img src={Girl}/>
                    </div>

                    <div className="calendar-card-people-item">
                        <img src={Girl}/>
                    </div>

                    <div className="calendar-card-people-item">
                        <img src={Girl}/>
                    </div>

                    <div className="calendar-card-people-item-more">
                        +3
                    </div>

                </div>

                <div className='calendar-card-misc-info-container'>
                    {startDate} - {endDate}
                </div>

            </div>


        </div>
    );
}

export default CalendarCard;
