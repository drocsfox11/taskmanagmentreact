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
import AuthGuard from "./components/AuthGuard";
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
        element: (
            <AuthGuard>
                <ContentContainer />
            </AuthGuard>
        ),
        children: [
            { index: true, element: <Navigate to="project" replace /> },
            { path: "project", element: <ProjectDashboard /> },
            { path: "messenger", element: <MessengerPage /> },
            { path: "calendar/:projectId?", element: <TaskCalendar /> },
            { path: "project/dashboards/:projectId", element: <ProjectDashboardsDashboard /> },
            { path: "project/:projectId/board/:boardId/tasks", element: <TaskDashboard /> },
            { path: "project/tasks/:projectId?", element: <TaskDashboard /> }
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
