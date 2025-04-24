import TopBar from "../components/TopBar";
import ProjectAndDashboardCard from "../components/ProjectAndDashboardCard";
import '../styles/pages/ProjectDashboard.css'
import {useNavigate} from "react-router-dom";
import {useState} from "react";

function ProjectDashboard() {

    const navigate = useNavigate();


    const handleRedirect = () => {
        navigate('/system/project/dashboards');
    };


    return (
        <div id='project-dashboard-container'>

            <TopBar></TopBar>
            <div id='project-dashboard-add-bar-container'>

                <div id='project-dashboard-add-bar-label'>Мои проекты</div>

                <div id='project-dashboard-add-bar-add-button'>
                    + Добавить проект
                </div>

            </div>

            <div id='project-dashboard-cards-container'>

                <div id='project-dashboard-card-row'>

                    <ProjectAndDashboardCard
                        onClick={handleRedirect}

                    ></ProjectAndDashboardCard>
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
    );
}

export default ProjectDashboard;
