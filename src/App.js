import './styles/fonts.css'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import TaskDashboard from "./pages/TaskDashboard";
import TaskCalendar from "./pages/TaskCalendar";
import MessengerPage from "./pages/MessengerPage";
import LoginPage from "./pages/LoginPage";
import ProjectDashboard from "./pages/ProjectDashboard";
import RegisterPage from "./pages/RegisterPage";
import ProjectDashboardsDashboard from "./pages/ProjectDashboardsDashboard";
import ContentContainer from "./pages/ContentContainer";
import { useEffect } from 'react';
import { markPageLoad, clearPageLoadFlag } from './utils/refreshManager';

const router = createBrowserRouter([
    {
        path: "/login",
        element: <LoginPage />,
    },
    {
        path: "/register",
        element: <RegisterPage />,
    },
    {
        path: "/system",
        element: <ContentContainer />,
        children: [
            { index: true, element: <Navigate to="project" replace /> },
            { 
                path: "project",
                children: [
                    { index: true, element: <ProjectDashboard /> },
                    { path: "dashboards/:projectId", element: <ProjectDashboardsDashboard /> },
                    { path: ":projectId/board/:boardId/tasks", element: <TaskDashboard /> },
                    { path: "tasks/:projectId?", element: <TaskDashboard /> }
                ]
            },
            { path: "messenger", children: [
                { index: true, element: <MessengerPage /> },
                { path: ":chatId", element: <MessengerPage /> }
            ] },
            { path: "calendar/:projectId?", element: <TaskCalendar /> }
        ]
    },
    {
        path: "*",
        element: <Navigate to="/system" replace />
    }
]);

function App() {
    // Установить флаг, что страница была загружена
    useEffect(() => {
        // Устанавливаем флаг только при первоначальной загрузке
        markPageLoad();
        
        // При размонтировании компонента очищаем флаг
        return () => {
            clearPageLoadFlag();
        };
    }, []);

    return (
        <RouterProvider router={router} />
    );
}

export default App;
