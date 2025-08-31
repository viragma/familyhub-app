import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AuthProvider } from './context/AuthContext.jsx';

import App from './App.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AdminRoute from './components/AdminRoute.jsx'; // Új import
import DashboardPage from './pages/DashboardPage.jsx';
import TasksPage from './pages/TasksPage.jsx';
import FamilySetupPage from './pages/FamilySetupPage.jsx';
import AdminSetupPage from './pages/AdminSetupPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import UserManagementPage from './pages/UserManagementPage.jsx';
import FinancesPage from './pages/FinancesPage.jsx';
import ParentRoute from './components/ParentRoute.jsx'
import CategoryManagementPage from './pages/CategoryManagementPage.jsx';
import AccountDetailPage from './pages/AccountDetailPage.jsx';
import AnalyticsPage from './pages/AnalyticsPage';
import WishesPage from './pages/WishesPage.jsx';
import './index.css';

const router = createBrowserRouter([
  // Publikus útvonalak
  { path: "/setup-family", element: <FamilySetupPage /> },
  { path: "/setup-admin", element: <AdminSetupPage /> },
  { path: "/login", element: <LoginPage /> },
  
  // Védett útvonalak
  {
    path: "/",
    element: <ProtectedRoute />, // Ez védi az összes belső oldalt
    children: [
      {
        path: "/",
        element: <App />, // Az App a közös keret (navigáció stb.)
        children: [
          { path: "/", element: <DashboardPage /> },
          { path: "tasks", element: <TasksPage /> },
          { path: "analytics", element: <AnalyticsPage /> },
          { path: "wishes", element: <WishesPage /> },
          // Az admin útvonalat egy külön 'wrapper' védi
          {
            element: <AdminRoute />, // Ez a komponens csak az alatta lévőket védi
            children: [
              { path: "manage-family", element: <UserManagementPage /> },
              { path: "manage-categories", element: <CategoryManagementPage /> },
            ]
          },
           { path: "finances", element: <FinancesPage /> },
           { path: "finances/account/:accountId", element: <AccountDetailPage /> },
            {
            element: <ParentRoute />,
            children: [ { path: "finances", element: <FinancesPage /> } ]
          }
        ],
      },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>
);