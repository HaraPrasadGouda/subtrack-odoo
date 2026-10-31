import { Menu, Bell } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getNavForRole } from '@/config/navigation';

/** Derive page title from current path */
function usePageTitle() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const navItems = getNavForRole(user?.role);
  const match = navItems.find(
    (item) => item.type !== 'divider' && item.path === pathname,
  );
  return match?.label ?? 'SubTrack';
}

export default function Header({ onMenuClick }) {
  const title = usePageTitle();

  return (
    <header className="sticky top-0 z-10 flex items-center gap-4 h-16 px-4 sm:px-6 bg-white border-b border-gray-100 shrink-0">
      {/* Hamburger — mobile only */}
      <button
        className="lg:hidden p-2 -ml-1 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        onClick={onMenuClick}
        aria-label="Open navigation"
      >
        <Menu size={20} />
      </button>

      {/* Page title */}
      <h1 className="flex-1 text-base font-semibold text-gray-800 truncate">
        {title}
      </h1>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        <button
          className="relative p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          aria-label="Notifications"
        >
          <Bell size={18} />
          {/* Notification dot */}
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-white" />
        </button>
      </div>
    </header>
  );
}

