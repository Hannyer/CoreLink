// src/app/guards/Router.tsx
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import PrivateRoute from "./PrivateRoute";

import HomePage from "@/page/home/Home";
import AboutPage from "@/page/about/About";
import LoginPage from "@/page/Login/LoginPage";
import SettingsPage from "@/page/settings/SettingsPage";
import GuidesPage from "@/page/guides/GuidesPage";
import TransportsPage from "@/page/transports/TransportsPage";
import ActivitiesPage from "@/page/activities/ActivitiesPage";

const router = createBrowserRouter([
  // Público
  { path: "/login", element: <LoginPage /> },
  { path: "/", element: <Navigate to="/home" replace /> },

  // Privado (todo lo que vive con layout)
  {
    element: (
      <PrivateRoute>
        <MainLayout />
      </PrivateRoute>
    ),
    children: [
      { path: "/home", element: <HomePage /> },
      { path: "/about", element: <AboutPage /> },
      { path: "/guides", element: <GuidesPage /> },
      { path: "/activities", element: <ActivitiesPage /> },
      { path: "/transports", element: <TransportsPage /> },
      { path: "/settings", element: <SettingsPage /> },
      { path: "/dashboard", element: <h1>Zona Privada</h1> },
    ],
  },

  // 404
  { path: "*", element: <h2 style={{ padding: 24 }}>404 • Página no encontrada</h2> },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}
