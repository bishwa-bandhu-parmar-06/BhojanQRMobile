// Mirrored from server/constants/permissions.js (and the website's
// client/src/constants/permissions.js) - keep all three in sync.
export const PERMISSIONS = [
  'view_pos',
  'create_order',
  'manage_orders',
  'manage_menu',
  'view_reports',
  'manage_settings',
  'kitchen_display',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<Permission, string> = {
  view_pos: 'View POS / Live Orders',
  create_order: 'Create Orders',
  manage_orders: 'Manage Orders (update status, close tables)',
  manage_menu: 'Manage Menu',
  view_reports: 'View Reports & Analytics',
  manage_settings: 'Manage Settings (QR codes, Happy Hours, Settings)',
  kitchen_display: 'Kitchen Display',
};

export const STAFF_ROLES = ['MANAGER', 'CHEF', 'WAITER'] as const;

export const DEFAULT_ROLE_PERMISSIONS: Record<string, Permission[]> = {
  MANAGER: ['view_pos', 'manage_orders', 'manage_menu', 'view_reports', 'manage_settings'],
  WAITER: ['view_pos', 'create_order'],
  CHEF: ['kitchen_display', 'manage_orders'],
};
