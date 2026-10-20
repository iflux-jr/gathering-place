// The signed-in person: who they are, and signing out
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';
import { logoutUser } from '../../firebase/users';

export function useSignOut() {
  const navigate = useNavigate();
  return async () => {
    try {
      await logoutUser();
      toast.success('Signed out');
      navigate('/login', { replace: true });
    } catch {
      toast.error('Couldn’t sign out. Check your connection and try again.');
    }
  };
}

export function useWho() {
  const profile = useAuthStore(s => s.profile);
  const role = profile?.role === 'admin' ? (profile?.assignedClass ? 'admin-teacher' : 'admin') : 'teacher';
  const name: string = profile?.name || 'Signed in';
  return { name, first: name.split(/\s+/)[0], email: (profile?.email as string | undefined) ?? '', role } as const;
}
