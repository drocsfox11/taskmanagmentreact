import './styles/fonts.css'
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Provider } from 'react-redux';
import TaskDashboard from "./pages/TaskDashboard";
import TaskCalendar from "./pages/TaskCalendar";
import LeftMenuMessenger from "./components/LeftMenuMessenger";
import store from './store';
import MessengerPage from "./pages/MessengerPage";

const router = createBrowserRouter([
  {
    element: <MessengerPage />,
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
  return (
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  );
}

export default App;
