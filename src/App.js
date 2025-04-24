import './styles/fonts.css'
import {createBrowserRouter, Navigate, RouterProvider} from 'react-router-dom';
import { Provider } from 'react-redux';
import TaskDashboard from "./pages/TaskDashboard";
import TaskCalendar from "./pages/TaskCalendar";
import LeftMenuMessenger from "./components/LeftMenuMessenger";
import store from './store';
import MessengerPage from "./pages/MessengerPage";
import LoginPage from "./pages/LoginPage";
import ProjectDashboard from "./pages/ProjectDashboard";
import RegisterPage from "./pages/RegisterPage";
import ProjectDashboardsDashboard from "./pages/ProjectDashboardsDashboard";
import ContentContainer from "./pages/ContentContainer";
import AuthGuard from "./components/AuthGuard";

const router = createBrowserRouter([
    {
        index: true,
        element: <LoginPage />,
    },
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
            {
                path: "/system/project",
                element: <ProjectDashboard />,
            },
            {
                path: "/system/messenger",
                element: <MessengerPage />,
            },
            {
                path: "/system/calendar",
                element: <TaskCalendar />,
            },
            {
                path: "/system/project/dashboards",
                element: <ProjectDashboardsDashboard />,
            },
            {
                path: "/system/project/tasks",
                element: <TaskDashboard />,
            }
        ]
    }
]);

function App() {
    return (
        <Provider store={store}>
            <RouterProvider router={router} />
        </Provider>
    );
}

export default App;
