import { Permission } from './permissions';

type TabRule = { ownerOnly?: boolean; permission?: Permission[] };

export const TAB_ACCESS: Record<string, TabRule> = {
  overview: { permission: ['view_reports'] },
  orders: { permission: ['view_pos', 'manage_orders'] },
  active_tables: { permission: ['view_pos', 'manage_orders'] },
  menu: { permission: ['manage_menu'] },
  staff: { ownerOnly: true },
  marketing: { permission: ['manage_settings'] },
  qr: { permission: ['manage_settings'] },
  notifications: {},
  profile: { ownerOnly: true },
  settings: { ownerOnly: true },
  // Anyone signed in to the restaurant can report a problem they hit - a
  // waiter blocked by a broken QR code is exactly who needs this, and the
  // ticket is raised against the restaurant either way.
  support: {},
  // Same gate as the live boards it archives from: anyone allowed to see
  // orders is allowed to see what those orders became.
  order_history: { permission: ['view_pos', 'manage_orders'] },
};

const TAB_PRIORITY = ['overview', 'orders', 'active_tables', 'menu', 'marketing', 'qr', 'notifications'];

export const canAccessTab = (
  tabId: string,
  { isOwner, can }: { isOwner: boolean; can: (...perms: Permission[]) => boolean },
) => {
  const rule = TAB_ACCESS[tabId] || {};
  if (rule.ownerOnly) return isOwner;
  if (!rule.permission) return true;
  if (isOwner) return true;
  return can(...rule.permission);
};

export const getDefaultTab = (ctx: { isOwner: boolean; can: (...perms: Permission[]) => boolean }) => {
  return TAB_PRIORITY.find(id => canAccessTab(id, ctx)) || 'notifications';
};
