
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import PrivateRoute from "./PrivateRoute";

import HomePage from "@/page/home/Home";
import AboutPage from "@/page/about/About";
import LoginPage from "@/page/Login/LoginPage";
import SettingsPage from "@/page/settings/SettingsPage";

const router = createBrowserRouter([
  {
    element: <MainLayout />,
    children: [
      { path: "/home", element: <HomePage /> },
      { path: "/about", element: <AboutPage /> },
      {
        path: "/dashboard",
        element: (
          <PrivateRoute>
            <h1>Zona Privada</h1>
          </PrivateRoute>
        ),
      },
       {
        path: "/settings",
        element: (
          <PrivateRoute>
            <SettingsPage />
          </PrivateRoute>
        ),
      },
      
    ],
  },
  { path: "/", element: <LoginPage /> },
  { path: "/login", element: <LoginPage /> },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
