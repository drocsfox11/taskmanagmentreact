import './styles/fonts.css'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { Provider } from 'react-redux';
import TaskDashboard from "./pages/TaskDashboard";
import TaskCalendar from "./pages/TaskCalendar";
import MessengerPage from "./pages/MessengerPage";
import LoginPage from "./pages/LoginPage";
import ProjectDashboard from "./pages/ProjectDashboard";
import RegisterPage from "./pages/RegisterPage";
import ProjectDashboardsDashboard from "./pages/ProjectDashboardsDashboard";
import ContentContainer from "./pages/ContentContainer";
import AuthGuard from "./components/AuthGuard";
import store from './store';

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
            { path: "calendar", element: <TaskCalendar /> },
            { path: "project/dashboards", element: <ProjectDashboardsDashboard /> },
            { path: "project/tasks", element: <TaskDashboard /> }
        ]
    },
    {
        path: "*",
        element: <Navigate to="/system" replace />
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
