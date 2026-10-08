import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import RootLayout from '../layouts/RootLayout';

// Code Splitting / Lazy Loading for Performance
const Home = lazy(() => import('../pages/Home'));
const SignUpPage = lazy(() => import('../pages/SignUpPage'));
const LoginPage = lazy(() => import('../pages/LoginPage'));
const MemberDashboard = lazy(() => import('../pages/MemberDashboard'));
const AdminPage = lazy(() => import('../pages/AdminPage'));
const ErrorPage = lazy(() => import('../pages/ErrorPage'));

export const routes = [
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: 'home',
        element: <Navigate to="/" replace />,
      },
      {
        path: 'signup',
        element: <SignUpPage />,
      },
      {
        path: 'apply',
        element: <Navigate to="/signup" replace />,
      },
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'member',
        element: <MemberDashboard />
      },
      {
        path: 'admin',
        element: <AdminPage />,
      },
      {
        path: '*',
        element: <ErrorPage initialCode="404" />,
      },
    ],
  },
];

export const router = createBrowserRouter(routes);

export default router;

