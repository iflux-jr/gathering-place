// src/App.jsx
// Root component — sets up routing and auth initialization

import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';

// Pages
import LoginPage        from './pages/LoginPage';
import RegisterPage     from './pages/RegisterPage';
import TeacherDashboard from './pages/TeacherDashboard';
import AdminDashboard   from './pages/AdminDashboard';
import NotFoundPage     from './pages/NotFoundPage';

// Guards
import ProtectedRoute   from './components/shared/ProtectedRoute';
import AdminRoute       from './components/shared/AdminRoute';

// Loading screen
import SplashScreen     from './components/shared/SplashScreen';

export default function App() {
  const { initAuth, loading, initialized } = useAuthStore();

  useEffect(() => {
    const unsubscribe = initAuth();
    return () => unsubscribe();
  }, []);

  // Show splash while Firebase resolves initial auth state
  if (!initialized || loading) return <SplashScreen />;

  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected — any authenticated user */}
      <Route element={<ProtectedRoute />}>
        <Route path="/register"        element={<RegisterPage />} />
        <Route path="/teacher"         element={<TeacherDashboard />} />
      </Route>

      {/* Admin only */}
      <Route element={<AdminRoute />}>
        <Route path="/admin"           element={<AdminDashboard />} />
      </Route>

      {/* Default redirect */}
      <Route path="/"  element={<RootRedirect />} />
      <Route path="*"  element={<NotFoundPage />} />
    </Routes>
  );
}

/** Redirect from "/" based on role */
function RootRedirect() {
  const { user, profile } = useAuthStore();
  if (!user)                        return <Navigate to="/login"   replace />;
  if (profile?.role === 'admin')    return <Navigate to="/admin"   replace />;
  return                                   <Navigate to="/teacher" replace />;
}
