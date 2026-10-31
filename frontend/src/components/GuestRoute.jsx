import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

/**
 * Redirects already-authenticated users away from auth pages.
 */
export default function GuestRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null; // Let ProtectedRoute handle the spinner

  if (user) {
    const dest = user.role === 'portal' ? '/my-subscriptions' : '/dashboard';
    return <Navigate to={dest} state={{ from: location }} replace />;
  }

  return children;
}

