import { createBrowserRouter, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './stores/authStore';

// Layouts
import AppShell from './components/layout/AppShell';

// Pages
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import ProjectSettings from './pages/ProjectSettings';
import ApprovalQueue from './pages/ApprovalQueue';
import Users from './pages/Users';

const ProtectedRoute = () => {
  const { user, accessToken, fetchProfile, isLoading } = useAuthStore();

  useEffect(() => {
    if (accessToken && !user) {
      fetchProfile();
    }
  }, [accessToken, user, fetchProfile]);

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  if (!user && isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return <AppShell />;
};

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />
  },
  {
    path: '/login',
    element: <Login />
  },
  {
    path: '/signup',
    element: <Signup />
  },

  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/dashboard',
        element: <Dashboard />
      },
      {
        path: '/projects',
        element: <Projects />
      },
      {
        path: '/projects/:id',
        element: <ProjectDetail />
      },
      {
        path: '/projects/:id/settings',
        element: <ProjectSettings />
      },
      {
        path: '/approvals',
        element: <ApprovalQueue />
      },
      {
        path: '/users',
        element: <Users />
      }
    ]
  }
]);
