import './styles/fonts.css'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import TaskDashboard from "./pages/TaskDashboard";
import TaskCalendar from "./pages/TaskCalendar";
import MessengerPage from "./pages/MessengerPage";
import LoginPage from "./pages/LoginPage";
import ProjectDashboard from "./pages/ProjectDashboard";
import RegisterPage from "./pages/RegisterPage";
import ProjectDashboardsDashboard from "./pages/ProjectDashboardsDashboard";
import ContentContainer from "./pages/ContentContainer";
import { markPageLoad, clearPageLoadFlag } from './utils/refreshManager';
import CallManager from './components/call/CallManager';

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
    // Use state to ensure we only initialize once
    const [isCallManagerInitialized, setIsCallManagerInitialized] = useState(() => {
        return !!window.callManagerInitialized;
    });

    useEffect(() => {
        markPageLoad();
        
        // Log audio debugging help message for developers
        console.log('🎧 Audio Debugger loaded. Run window.audioDebugger.help() for assistance with audio issues.');
        
        // Debug message for call system
        console.log('📞 Call system initialized. Call notifications now handled by usersApi.');
        
        return () => {
            clearPageLoadFlag();
        };
    }, []);

    return (
        <>
            <RouterProvider router={router} />
            <CallManager ref={(ref) => {
                // Create a global reference to CallManager for direct access
                window.callManagerRef = ref;
                // Mark as initialized
                if (!window.callManagerInitialized) {
                    window.callManagerInitialized = true;
                    setIsCallManagerInitialized(true);
                }
            }} />
        </>
    );
}

export default App;
