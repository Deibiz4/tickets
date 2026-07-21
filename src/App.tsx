import React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider, useAuth } from '@/context/AuthContext';

// Pages (Lazy loaded for better performance)
const Login = React.lazy(() => import('@/pages/Login').then(m => ({ default: m.Login })));
const Register = React.lazy(() => import('@/pages/Register').then(m => ({ default: m.Register })));
const ForgotPassword = React.lazy(() => import('@/pages/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const ResetPassword = React.lazy(() => import('@/pages/ResetPassword').then(m => ({ default: m.ResetPassword })));
const Dashboard = React.lazy(() => import('@/pages/Dashboard').then(m => ({ default: m.Dashboard })));
const DashboardHome = React.lazy(() => import('@/pages/DashboardHome').then(m => ({ default: m.DashboardHome })));
const TicketList = React.lazy(() => import('@/pages/TicketList').then(m => ({ default: m.TicketList })));
const TicketForm = React.lazy(() => import('@/pages/TicketForm').then(m => ({ default: m.TicketForm })));
const History = React.lazy(() => import('@/pages/History').then(m => ({ default: m.History })));
const Users = React.lazy(() => import('@/pages/Users').then(m => ({ default: m.Users })));
const UserForm = React.lazy(() => import('@/pages/UserForm').then(m => ({ default: m.UserForm })));
const Settings = React.lazy(() => import('@/pages/SettingsPage').then(m => ({ default: m.Settings })));
const DashboardStats = React.lazy(() => import('@/pages/DashboardStats').then(m => ({ default: m.DashboardStats })));
const AdminPanel = React.lazy(() => import('@/pages/AdminPanel').then(m => ({ default: m.AdminPanel })));
const KBIndex = React.lazy(() => import('@/pages/KnowledgeBase/KBIndex').then(m => ({ default: m.KBIndex })));
const ArticleDetail = React.lazy(() => import('@/pages/KnowledgeBase/ArticleDetail').then(m => ({ default: m.ArticleDetail })));
const ArticleEditor = React.lazy(() => import('@/pages/KnowledgeBase/ArticleEditor').then(m => ({ default: m.ArticleEditor })));

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
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
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
        <Route path="admin" element={<AdminPanel />} />
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
        <React.Suspense fallback={
          <div className="min-h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
          </div>
        }>
          <AppRoutes />
        </React.Suspense>
        <Toaster />
      </div>
    </AuthProvider>
  );
};

export default App;
