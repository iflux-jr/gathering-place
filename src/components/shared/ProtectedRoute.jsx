// src/components/shared/ProtectedRoute.jsx
// Allows any authenticated user — both teachers AND admins (including admin-teachers)
import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

export default function ProtectedRoute() {
  const { user } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
