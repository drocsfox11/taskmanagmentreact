import TopBar from "../components/TopBar";
import ProjectAndDashboardCard from "../components/ProjectAndDashboardCard";
import '../styles/pages/ProjectDashboardsDashboard.css'
import ProjectMenu from "../components/ProjectMenu";
import {useNavigate} from "react-router-dom";

function ProjectDashBoardsDashboard() {

    const navigate = useNavigate();
    const handleRedirect = () => {
        navigate('/system/project/tasks');
    };

    return (

        <div id='project-dashboards-dashboard-container'>
            <ProjectMenu></ProjectMenu>
            <div id='project-dashboard-container'>

                <TopBar></TopBar>
                <div id='project-dashboard-add-bar-container'>

                    <div id='project-dashboard-add-bar-label'>Уроки дизайна</div>

                    <div id='project-dashboard-add-bar-add-button'>
                        + Добавить доску
                    </div>

                </div>

                <div id='project-dashboard-cards-container'>

                    <div id='project-dashboard-card-row'>
                        <ProjectAndDashboardCard onClick={handleRedirect}></ProjectAndDashboardCard>
                        <ProjectAndDashboardCard></ProjectAndDashboardCard>
                        <ProjectAndDashboardCard></ProjectAndDashboardCard>
                        <ProjectAndDashboardCard></ProjectAndDashboardCard>
                        <ProjectAndDashboardCard></ProjectAndDashboardCard>


                    </div>

                    <div id='project-dashboard-card-row'>
                        <ProjectAndDashboardCard></ProjectAndDashboardCard>
                        <ProjectAndDashboardCard></ProjectAndDashboardCard>
                        <ProjectAndDashboardCard></ProjectAndDashboardCard>
                        <ProjectAndDashboardCard></ProjectAndDashboardCard>
                        <ProjectAndDashboardCard></ProjectAndDashboardCard>


                    </div>

                    <div id='project-dashboard-card-row'>
                        <ProjectAndDashboardCard></ProjectAndDashboardCard>
                        <ProjectAndDashboardCard></ProjectAndDashboardCard>
                        <ProjectAndDashboardCard></ProjectAndDashboardCard>
                        <ProjectAndDashboardCard></ProjectAndDashboardCard>
                        <ProjectAndDashboardCard></ProjectAndDashboardCard>


                    </div>
                    <div id='project-dashboard-card-row'>
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

export default ProjectDashBoardsDashboard;
