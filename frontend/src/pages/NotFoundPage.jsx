import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { homeForRole } from '@/config/navigation';

export default function NotFoundPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      <p className="text-6xl font-black text-gray-100 select-none">404</p>
      <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center -mt-4 mb-5">
        <Search size={24} className="text-gray-400" />
      </div>
      <h2 className="text-xl font-bold text-gray-800">Page not found</h2>
      <p className="mt-2 text-sm text-gray-400 max-w-xs">
        The page you&apos;re looking for doesn&apos;t exist or you don&apos;t have access.
      </p>
      <Button
        className="mt-6"
        onClick={() => navigate(homeForRole(user?.role), { replace: true })}
      >
        Go to home
      </Button>
    </div>
  );
}

