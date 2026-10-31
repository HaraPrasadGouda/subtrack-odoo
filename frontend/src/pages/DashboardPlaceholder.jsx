import { Link, useNavigate } from 'react-router-dom';
import { Layers, LogOut, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';

export default function DashboardPlaceholder() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    toast.success('Signed out successfully');
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-6 p-8">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
          <Layers size={20} className="text-white" />
        </div>
        <span className="text-2xl font-bold text-gray-900">SubTrack</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-8 w-full max-w-md text-center">
        <LayoutDashboard size={32} className="mx-auto text-blue-400 mb-4" />
        <h1 className="text-xl font-bold text-gray-900">Welcome, {user?.name}!</h1>
        <p className="mt-2 text-sm text-gray-500">
          Role: <span className="font-medium capitalize">{user?.role}</span>
        </p>
        <p className="mt-4 text-sm text-gray-400">
          Dashboard and other pages coming soon (Pages 2–13).
        </p>

        <button
          onClick={handleLogout}
          className="mt-8 flex items-center gap-2 mx-auto text-sm text-red-500 hover:text-red-700"
        >
          <LogOut size={14} />
          Sign out
        </button>
      </div>

      <p className="text-xs text-gray-400">
        Auth pages complete — <Link to="/login" className="text-blue-500 hover:underline">Login</Link> ·{' '}
        <Link to="/signup" className="text-blue-500 hover:underline">Signup</Link> ·{' '}
        <Link to="/forgot-password" className="text-blue-500 hover:underline">Forgot</Link>
      </p>
    </div>
  );
}

