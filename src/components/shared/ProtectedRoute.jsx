// src/components/shared/ProtectedRoute.jsx
// Allows any signed-in staff member — teachers and admins (including admin-teachers)
import { Navigate, Outlet } from 'react-router-dom';
import useAuthStore from '../../store/authStore';
import { AuthLayout } from '../layout/AuthLayout';
import { Button } from '../ui';
import { logoutUser } from '../../firebase/users';

export default function ProtectedRoute() {
  const { user, noAccess } = useAuthStore();
  if (!user) return <Navigate to="/login" replace />;
  // An admin removed this person's access while they were signed in on this device
  if (noAccess) {
    return (
      <AuthLayout title="No access" description="This account doesn’t have access any more. Ask the admin if you think that’s wrong.">
        <Button onClick={() => logoutUser()}>Sign out</Button>
      </AuthLayout>
    );
  }
  return <Outlet />;
}
