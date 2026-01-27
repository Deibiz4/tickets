import React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider, useAuth } from '@/context/AuthContext';

// Pages
import { Login } from '@/pages/Login';
import { Register } from '@/pages/Register';
import { Dashboard } from '@/pages/Dashboard';
import { DashboardHome } from '@/pages/DashboardHome';
import { TicketList } from '@/pages/TicketList';
import { TicketForm } from '@/pages/TicketForm';
import { History } from '@/pages/History';
import { Users } from '@/pages/Users';
import { UserForm } from '@/pages/UserForm';
import { Settings } from '@/pages/SettingsPage';
import { DashboardStats } from '@/pages/DashboardStats';
import { KBIndex } from '@/pages/KnowledgeBase/KBIndex';
import { ArticleDetail } from '@/pages/KnowledgeBase/ArticleDetail';
import { ArticleEditor } from '@/pages/KnowledgeBase/ArticleEditor';

// Componente de ruta protegida
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // El efecto de navegación se encargará de redirigir
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardHome />} />
        <Route path="tickets" element={<TicketList />} />
        <Route path="tickets/new" element={<TicketForm />} />
        <Route path="tickets/:id" element={<TicketForm />} />
        <Route path="history" element={<History />} />

        {/* Rutas de usuarios (Solo Admin) */}
        <Route path="users" element={<Users />} />
        <Route path="users/new" element={<UserForm />} />
        <Route path="users/:id" element={<UserForm />} />

        <Route path="settings" element={<Settings />} />
        <Route path="stats" element={<DashboardStats />} />
        <Route path="kb" element={<KBIndex />} />
        <Route path="kb/new" element={<ArticleEditor />} />
        <Route path="kb/:id" element={<ArticleDetail />} />
        <Route path="kb/:id/edit" element={<ArticleEditor />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gray-50">
        <AppRoutes />
        <Toaster />
      </div>
    </AuthProvider>
  );
};

export default App;
