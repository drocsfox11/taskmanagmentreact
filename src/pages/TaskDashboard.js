import TopBar from "../components/TopBar";
import ProjectCard from "../components/ProjectCard";
import '../styles/pages/TaskDashboard.css'
import ProjectMenu from "../components/ProjectMenu";
import {Emoji, EmojiProvider} from "react-apple-emojis";
import emojiData from "react-apple-emojis/src/data.json"
import Girl from "../assets/icons/profile_picture.svg";
import TaskCard from "../components/TaskCard";
import OptionsPassive from "../assets/icons/options_passive.svg";

function TaskDashboard() {
    return (

        <div id='task-dashboards-dashboard-container'>
            <ProjectMenu></ProjectMenu>
            <div id='task-dashboard-container'>

                <TopBar></TopBar>
                <div id='task-dashboard-add-bar-container'>

                    <div id='task-dashboard-icon-row-container'>
                        <div id='task-dashboard-icon-container'>
                            <EmojiProvider data={emojiData}>
                                <Emoji name="teacher-light-skin-tone" width={22}/>
                            </EmojiProvider>
                        </div>

                        <div id='task-dashboard-label-container'>
                            <div id='task-dashboard-label-container-header'>Курсы языков - Дизайн</div>
                            <div id='task-dashboard-progress-container'>

                                <div id='task-dashboard-progress-bar'>

                                </div>

                                <div id='task-dashboard-progress-text'>
                                    13% завершено
                                </div>

                            </div>

                        </div>

                    </div>

                    <div id="task-dashboard-button-and-people-container">

                        <div id="task-dashboard-people">

                            <div id="task-dashboard-people-item">
                                <img src={Girl}/>
                            </div>
                            <div id="task-dashboard-people-item">
                                <img src={Girl}/>
                            </div>
                            <div id="task-dashboard-people-item">
                                <img src={Girl}/>
                            </div>
                            <div id="task-dashboard-people-item">
                                <img src={Girl}/>
                            </div>
                            <div id="task-dashboard-people-item-more">
                                +3
                            </div>

                        </div>

                        <div id='task-dashboard-add-bar-add-button'>
                            + Добавить раздел
                        </div>
                    </div>


                </div>

                <div id='task-dashboard-cards-containeres'>

                    <div id='task-dashboard-card-column'>

                        <div id='task-dashboard-card-column-topbar'>

                            <div id='task-dashboard-card-column-topbar-label-container'>
                                <div id='task-dashboard-card-column-topbar-label-name-container'>
                                    <div id='task-dashboard-card-column-topbar-label-name-circle'></div>
                                    <div id='task-dashboard-card-column-topbar-label-name-text'>Сделать</div>
                                </div>
                                <div id='task-dashboard-card-column-topbar-label-name-task-counter'>3</div>
                            </div>
                            <div>
                                <img src={OptionsPassive} alt="Options Active"/>
                            </div>

                        </div>

                        <div id='task-dashboard-add-task-button'>

                            <div id='task-dashboard-add-task-button-text'>+ Добавить задачу</div>
                        </div>

                        <div id='task-dashboard-cards-container'>

                            <TaskCard></TaskCard>
                            <TaskCard></TaskCard>
                            <TaskCard></TaskCard>
                            <TaskCard></TaskCard>

                        </div>

                    </div>
                    <div id='task-dashboard-card-column'>

                        <div id='task-dashboard-card-column-topbar'>

                            <div id='task-dashboard-card-column-topbar-label-container'>
                                <div id='task-dashboard-card-column-topbar-label-name-container'>
                                    <div id='task-dashboard-card-column-topbar-label-name-circle'></div>
                                    <div id='task-dashboard-card-column-topbar-label-name-text'>Сделать</div>
                                </div>
                                <div id='task-dashboard-card-column-topbar-label-name-task-counter'>3</div>
                            </div>
                            <div>
                                <img src={OptionsPassive} alt="Options Active"/>
                            </div>

                        </div>

                        <div id='task-dashboard-add-task-button'>

                            <div id='task-dashboard-add-task-button-text'>+ Добавить задачу</div>
                        </div>

                        <div id='task-dashboard-cards-container'>

                            <TaskCard></TaskCard>
                            <TaskCard></TaskCard>
                            <TaskCard></TaskCard>
                            <TaskCard></TaskCard>

                        </div>

                    </div>
                    <div id='task-dashboard-card-column'>

                        <div id='task-dashboard-card-column-topbar'>

                            <div id='task-dashboard-card-column-topbar-label-container'>
                                <div id='task-dashboard-card-column-topbar-label-name-container'>
                                    <div id='task-dashboard-card-column-topbar-label-name-circle'></div>
                                    <div id='task-dashboard-card-column-topbar-label-name-text'>Сделать</div>
                                </div>
                                <div id='task-dashboard-card-column-topbar-label-name-task-counter'>3</div>
                            </div>
                            <div>
                                <img src={OptionsPassive} alt="Options Active"/>
                            </div>

                        </div>

                        <div id='task-dashboard-add-task-button'>

                            <div id='task-dashboard-add-task-button-text'>+ Добавить задачу</div>
                        </div>

                        <div id='task-dashboard-cards-container'>

                            <TaskCard></TaskCard>
                            <TaskCard></TaskCard>
                            <TaskCard></TaskCard>
                            <TaskCard></TaskCard>

                        </div>

                    </div>
                    <div id='task-dashboard-card-column'>

                        <div id='task-dashboard-card-column-topbar'>

                            <div id='task-dashboard-card-column-topbar-label-container'>
                                <div id='task-dashboard-card-column-topbar-label-name-container'>
                                    <div id='task-dashboard-card-column-topbar-label-name-circle'></div>
                                    <div id='task-dashboard-card-column-topbar-label-name-text'>Сделать</div>
                                </div>
                                <div id='task-dashboard-card-column-topbar-label-name-task-counter'>3</div>
                            </div>
                            <div>
                                <img src={OptionsPassive} alt="Options Active"/>
                            </div>

                        </div>

                        <div id='task-dashboard-add-task-button'>

                            <div id='task-dashboard-add-task-button-text'>+ Добавить задачу</div>
                        </div>

                        <div id='task-dashboard-cards-container'>

                            <TaskCard></TaskCard>
                            <TaskCard></TaskCard>
                            <TaskCard></TaskCard>
                            <TaskCard></TaskCard>

                        </div>

                    </div>


                </div>

            </div>
        </div>

    );
}

export default TaskDashboard;
