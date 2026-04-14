// src/components/shared/AdminRoute.jsx
import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

export default function AdminRoute() {
  const { user, profile } = useAuthStore();
  if (!user)                     return <Navigate to="/login"   replace />;
  if (profile?.role !== 'admin') return <Navigate to="/teacher" replace />;
  return <Outlet />;
}
