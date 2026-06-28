import { Permission } from './permissions';

// Mirrors the website's client/src/constants/dashboardTabs.js - single
// source of truth for which dashboard tab requires which permission.
// `ownerOnly: true` means the restaurant owner only - no staff permission
// can unlock it (the backend itself hard-403s staff on these routes, e.g.
// /restaurants/profile, so this isn't just cosmetic gating).
// `permission: [...]` means owners always pass; staff need at least one of
// the listed permissions. No `permission`/`ownerOnly` at all means every
// logged-in user (owner or staff) can see it.
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
