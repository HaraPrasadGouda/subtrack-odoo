import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, Layers, Percent, Tag, FileText,
  RefreshCcw, Receipt, CreditCard, Users, Bell, UserCog,
  Layers as LayersIcon, LogOut, X, ChevronRight,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { getNavForRole } from '@/config/navigation';

// Map icon name strings to components
const ICON_MAP = {
  LayoutDashboard,
  Package,
  Layers,
  Percent,
  Tag,
  FileText,
  RefreshCcw,
  Receipt,
  CreditCard,
  Users,
  Bell,
  UserCog,
};

function NavIcon({ name, size = 16 }) {
  const Icon = ICON_MAP[name] || ChevronRight;
  return <Icon size={size} />;
}

function UserAvatar({ name, role }) {
  const initials = name
    ? name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';
  const roleColors = {
    admin:    'bg-violet-100 text-violet-700',
    internal: 'bg-blue-100 text-blue-700',
    portal:   'bg-emerald-100 text-emerald-700',
  };
  return (
    <div className={clsx('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0', roleColors[role] || 'bg-gray-100 text-gray-600')}>
      {initials}
    </div>
  );
}

function RoleBadge({ role }) {
  const labels = { admin: 'Admin', internal: 'Staff', portal: 'Customer' };
  const colors = {
    admin:    'bg-violet-50 text-violet-600 border-violet-100',
    internal: 'bg-blue-50 text-blue-600 border-blue-100',
    portal:   'bg-emerald-50 text-emerald-600 border-emerald-100',
  };
  return (
    <span className={clsx('text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border', colors[role] || 'bg-gray-50 text-gray-500 border-gray-100')}>
      {labels[role] || role}
    </span>
  );
}

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navItems = getNavForRole(user?.role);

  function handleLogout() {
    logout();
    toast.success('Signed out successfully');
    navigate('/login', { replace: true });
  }

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/30 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={clsx(
          'fixed top-0 left-0 z-30 h-screen w-64 flex flex-col bg-white border-r border-gray-100',
          'transition-transform duration-200 ease-in-out',
          'lg:relative lg:translate-x-0 lg:z-auto lg:shrink-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <LayersIcon size={16} className="text-white" />
            </div>
            <span className="text-base font-bold text-gray-900 tracking-tight">SubTrack</span>
          </div>
          {/* Close button — mobile only */}
          <button
            className="lg:hidden p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {navItems.map((item, idx) => {
            if (item.type === 'divider') {
              return (
                <div key={`div-${idx}`} className="pt-4 pb-1 px-2">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                    {item.label}
                  </p>
                </div>
              );
            }
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => onClose?.()}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-100',
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={clsx('shrink-0', isActive ? 'text-blue-600' : 'text-gray-400')}>
                      <NavIcon name={item.icon} />
                    </span>
                    {item.label}
                    {isActive && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="shrink-0 border-t border-gray-100 p-3">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
            <UserAvatar name={user?.name} role={user?.role} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">{user?.name}</p>
              <RoleBadge role={user?.role} />
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

