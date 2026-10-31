/**
 * Navigation configuration for each role.
 * Each item: { label, path, icon (lucide name string) }
 * Sections with children render a divider + section label.
 */

export const NAV_ADMIN = [
  { label: 'Dashboard',     path: '/dashboard',      icon: 'LayoutDashboard' },
  { type: 'divider', label: 'Catalogue' },
  { label: 'Products',      path: '/products',       icon: 'Package' },
  { label: 'Plans',         path: '/plans',          icon: 'Layers' },
  { type: 'divider', label: 'Finance' },
  { label: 'Taxes',         path: '/taxes',          icon: 'Percent' },
  { label: 'Discounts',     path: '/discounts',      icon: 'Tag' },
  { type: 'divider', label: 'Sales' },
  { label: 'Templates',     path: '/templates',      icon: 'FileText' },
  { label: 'Subscriptions', path: '/subscriptions',  icon: 'RefreshCcw' },
  { label: 'Invoices',      path: '/invoices',       icon: 'Receipt' },
  { label: 'Payments',      path: '/payments',       icon: 'CreditCard' },
  { type: 'divider', label: 'Manage' },
  { label: 'Customers',     path: '/customers',      icon: 'Users' },
  { label: 'Dunning',       path: '/dunning',        icon: 'Bell' },
  { label: 'Users',         path: '/users',          icon: 'UserCog' },
];

export const NAV_INTERNAL = [
  { label: 'Dashboard',     path: '/dashboard',      icon: 'LayoutDashboard' },
  { type: 'divider', label: 'Sales' },
  { label: 'Subscriptions', path: '/subscriptions',  icon: 'RefreshCcw' },
  { label: 'Invoices',      path: '/invoices',       icon: 'Receipt' },
  { label: 'Payments',      path: '/payments',       icon: 'CreditCard' },
  { type: 'divider', label: 'Manage' },
  { label: 'Customers',     path: '/customers',      icon: 'Users' },
];

export const NAV_PORTAL = [
  { label: 'My Subscriptions', path: '/my-subscriptions', icon: 'RefreshCcw' },
  { label: 'My Invoices',      path: '/my-invoices',      icon: 'Receipt' },
];

export function getNavForRole(role) {
  if (role === 'admin')    return NAV_ADMIN;
  if (role === 'internal') return NAV_INTERNAL;
  if (role === 'portal')   return NAV_PORTAL;
  return [];
}

/** Home route per role */
export function homeForRole(role) {
  if (role === 'portal') return '/my-subscriptions';
  return '/dashboard';
}

