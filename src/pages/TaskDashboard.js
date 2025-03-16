import TopBar from "../components/TopBar";
import ProjectAndDashboardCard from "../components/ProjectAndDashboardCard";
import '../styles/pages/TaskDashboard.css'
import ProjectMenu from "../components/ProjectMenu";
import {Emoji, EmojiProvider} from "react-apple-emojis";
import emojiData from "react-apple-emojis/src/data.json"
import Girl from "../assets/icons/profile_picture.svg";

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

                <div id='task-dashboard-cards-container'>

                <div id='task-dashboard-card-row'>
                        <ProjectAndDashboardCard></ProjectAndDashboardCard>
                        <ProjectAndDashboardCard></ProjectAndDashboardCard>
                        <ProjectAndDashboardCard></ProjectAndDashboardCard>
                        <ProjectAndDashboardCard></ProjectAndDashboardCard>
                        <ProjectAndDashboardCard></ProjectAndDashboardCard>


                    </div>

                    <div id='task-dashboard-card-row'>
                        <ProjectAndDashboardCard></ProjectAndDashboardCard>
                        <ProjectAndDashboardCard></ProjectAndDashboardCard>
                        <ProjectAndDashboardCard></ProjectAndDashboardCard>
                        <ProjectAndDashboardCard></ProjectAndDashboardCard>
                        <ProjectAndDashboardCard></ProjectAndDashboardCard>


                    </div>

                    <div id='task-dashboard-card-row'>
                        <ProjectAndDashboardCard></ProjectAndDashboardCard>
                        <ProjectAndDashboardCard></ProjectAndDashboardCard>
                        <ProjectAndDashboardCard></ProjectAndDashboardCard>
                        <ProjectAndDashboardCard></ProjectAndDashboardCard>
                        <ProjectAndDashboardCard></ProjectAndDashboardCard>


                    </div>
                    <div id='task-dashboard-card-row'>
                        <ProjectAndDashboardCard></ProjectAndDashboardCard>
                        <ProjectAndDashboardCard></ProjectAndDashboardCard>
                        <ProjectAndDashboardCard></ProjectAndDashboardCard>
                        <ProjectAndDashboardCard></ProjectAndDashboardCard>
                        <ProjectAndDashboardCard></ProjectAndDashboardCard>


                    </div>


                </div>

            </div>
        </div>

    );
}

export default TaskDashboard;
