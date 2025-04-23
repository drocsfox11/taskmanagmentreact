import './styles/fonts.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import TaskDashboard from "./pages/TaskDashboard";
import TaskCalendar from "./pages/TaskCalendar";
import LeftMenuMessenger from "./components/LeftMenuMessenger";

const router = createBrowserRouter([
  {
    element: <LeftMenuMessenger />,
    children: [
      {
        index: true,
        element: <TaskDashboard />,
      },
      {
        path: "/calendar",
        element: <TaskCalendar />,
      },

    ]
  }
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;
