// src/pages/NotFoundPage.jsx
import { Link } from 'react-router-dom';
import useAuthStore from '../store/authStore';

export default function NotFoundPage() {
  const { user, profile } = useAuthStore();
  const home = !user ? '/login' : profile?.role === 'admin' ? '/admin' : '/teacher';
  return (
    <div className="min-h-screen page-wrapper flex items-center justify-center px-4">
      <div className="text-center animate-slide-up">
        <p className="font-display text-8xl font-bold text-brown-200 mb-4">404</p>
        <h1 className="font-display text-2xl font-semibold text-brown-500 mb-2">Page not found</h1>
        <p className="font-body text-brown-300 text-sm mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to={home} className="btn-primary inline-flex">Go back home</Link>
      </div>
    </div>
  );
}
