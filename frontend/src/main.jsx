import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from './App.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import TasksPage from './pages/TasksPage.jsx';
import './index.css';

// Itt definiáljuk az útvonalakat
const router = createBrowserRouter([
  {
    path: "/",
    element: <App />, // Az App a "keret", ami mindig megjelenik
    children: [
      // A gyermek útvonalak az App komponensen belül fognak megjelenni
      {
        path: "/",
        element: <DashboardPage />,
      },
      {
        path: "tasks",
        element: <TasksPage />,
      },
      // Ide jönnek majd a további oldalak (pl. Pénzügyek, Célok)
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);