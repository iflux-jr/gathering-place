// src/App.tsx
// Root component — sets up routing and auth initialization

import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';

// Guards and frame
import ProtectedRoute from './components/shared/ProtectedRoute';
import AdminRoute     from './components/shared/AdminRoute';
import SplashScreen   from './components/shared/SplashScreen';
import AppShell       from './components/layout/AppShell';
import { homePathFor } from './lib/homePath';

// Pages load on demand, so a teacher on a phone never downloads the admin screens
const LoginPage          = lazy(() => import('./pages/LoginPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const AddStudentPage     = lazy(() => import('./pages/AddStudentPage'));
const InvitePage         = lazy(() => import('./pages/InvitePage'));
const RegistrationsPage  = lazy(() => import('./pages/RegistrationsPage'));
const JoinPage           = lazy(() => import('./pages/JoinPage'));
const StatusPage         = lazy(() => import('./pages/StatusPage'));
const TeacherPage        = lazy(() => import('./pages/TeacherPage'));
const AdminDashboard     = lazy(() => import('./pages/AdminDashboard'));
const NotFoundPage       = lazy(() => import('./pages/NotFoundPage'));
const StyleGuidePage     = lazy(() => import('./pages/StyleGuidePage'));

const ADMIN_SECTIONS = ['students', 'attendance', 'classes', 'requests', 'archive', 'settings'] as const;

export default function App() {
  const { initAuth, loading, initialized } = useAuthStore();

  useEffect(() => {
    const unsubscribe = initAuth();
    return () => unsubscribe();
  }, [initAuth]);

  // Show splash while Firebase resolves initial auth state
  if (!initialized || loading) return <SplashScreen />;

  return (
    <Suspense fallback={<SplashScreen />}>
      <Routes>
        {/* Public */}
        <Route path="/login"           element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/styleguide"      element={<StyleGuidePage />} />
        <Route path="/join"            element={<JoinPage />} />
        <Route path="/status"          element={<StatusPage />} />
        <Route path="/status/:code"    element={<StatusPage />} />

        {/* Signed in: everything inside the app frame */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/teacher" element={<TeacherPage />} />
            <Route path="/invite"  element={<InvitePage />} />

            <Route element={<AdminRoute />}>
              <Route path="/register" element={<AddStudentPage />} />
              <Route path="/admin" element={<AdminDashboard section="home" />} />
              <Route path="/admin/registrations" element={<RegistrationsPage />} />
              {ADMIN_SECTIONS.map(s => (
                <Route key={s} path={`/admin/${s}`} element={<AdminDashboard section={s} />} />
              ))}
            </Route>
          </Route>
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<RootRedirect />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

/** Redirect from "/" based on role */
function RootRedirect() {
  const { user, profile } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={homePathFor(profile)} replace />;
}
