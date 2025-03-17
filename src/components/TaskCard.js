import '../styles/components/TaskCard.css'
import OptionsPassive from "../assets/icons/options_passive.svg";
import Girl from "../assets/icons/profile_picture.svg";
import TaskListIcon from "../assets/icons/task_list.svg";
import EyeIcon from "../assets/icons/eye.svg";
import CommentIcon from "../assets/icons/comments.svg";
import Clip from "../assets/icons/clip.svg";

function TaskCard() {
    return (
        <div id='task-card-container'>

            <div id='task-card-label-container'>

                <div id='task-card-label-background'>
                    UI
                </div>

                <div>
                    <img src={OptionsPassive} alt="Options Active"/>
                </div>

            </div>

            <div id='task-card-text-info-container'>

                <div id='task-card-text-info-header'>Сетка страницы</div>
                <div id='task-card-text-info-text'>Нужно сделать основную сетку страницы без смысловых блоков. Сетка должна быть адаптивной под все девайсы</div>


            </div>

            <div id='task-card-points-list'>

                <img src={TaskListIcon} id='task-card-points-list-icon'/>
                <div id='task-card-points-list-counter'>0/8</div>

            </div>

            <div id='task-card-delimiter'></div>

            <div id='task-card-down-container'>

                <div id="task-card-people">

                    <div id="task-card-people-item">
                        <img src={Girl}/>
                    </div>

                    <div id="task-card-people-item">
                        <img src={Girl}/>
                    </div>

                    <div id="task-card-people-item">
                        <img src={Girl}/>
                    </div>

                    <div id="task-card-people-item">
                        <img src={Girl}/>
                    </div>

                    <div id="task-card-people-item-more">
                        +3
                    </div>

                </div>

                <div id='task-card-misc-info-container'>
                    <div id='task-card-misc-info-row'>
                    <img src={EyeIcon}/>
                        <div id='task-card-misc-info-row-text'>52</div>
                    </div>
                    <div id='task-card-misc-info-row'>
                        <img src={CommentIcon}/>
                        <div id='task-card-misc-info-row-text'>52</div>
                    </div>
                    <div id='task-card-misc-info-row'>
                        <img src={Clip}/>
                        <div id='task-card-misc-info-row-text'>2</div>
                    </div>
                </div>

            </div>


        </div>
    );
}

export default TaskCard;
