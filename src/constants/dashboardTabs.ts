import { Permission } from './permissions';

type TabRule = {
  ownerOnly?: boolean;
  permission?: Permission[];
  // Explicitly open to anyone signed in. Has to be stated rather than
  // inferred from a missing `permission` list, so that forgetting to write a
  // rule denies access instead of granting it.
  openToAll?: boolean;
};

// Each rule lists every permission that opens the tab - "any of these".
// Kept in step with the server's route guards: a rule here that is wider than
// the guard shows a section whose every request then fails, and one that is
// narrower hides a feature the account is entitled to.
export const TAB_ACCESS: Record<string, TabRule> = {
  overview: { permission: ['view_reports'] },
  orders: { permission: ['view_pos', 'manage_orders'] },
  active_tables: { permission: ['view_pos', 'manage_orders', 'manage_tables'] },
  menu: { permission: ['manage_menu', 'delete_menu'] },
  // No longer owner-only: an owner can now delegate the team screen. The
  // permission is deliberately hard to hand out by accident - it is the one
  // that lets a staff member widen anyone else's access.
  staff: { permission: ['manage_staff'] },
  marketing: { permission: ['manage_offers'] },
  qr: { permission: ['manage_qr'] },
  notifications: { openToAll: true },
  // Was owner-only until the permission split, so requiring an explicit
  // right takes nothing away from anyone. Editing the restaurant is not the
  // same as taking over the account: the owner's login email and password
  // stay owner-only inside the screen itself.
  profile: { permission: ['manage_profile'] },
  // App Settings is theme/language/alerts for THIS device. Nothing about it
  // is account data, so there is nothing to restrict.
  settings: { openToAll: true },
  // Open to anyone signed in, and not a permission at all. A ticket goes to
  // this app's admin rather than to anyone inside the restaurant, and the
  // person who hits a bug is the one who needs to report it - gating it
  // silences exactly the people it exists for.
  support: { openToAll: true },
  // Same gate as the live boards it archives from: anyone allowed to see
  // orders is allowed to see what those orders became.
  // view_order_history ONLY. It is its own right for a reason: someone who
  // works the current board has no reason to read back through past takings,
  // and accepting view_pos here made the permission unticked-but-granted.
  order_history: { permission: ['view_order_history'] },
};

const TAB_PRIORITY = ['overview', 'orders', 'active_tables', 'menu', 'marketing', 'qr', 'notifications'];

export const canAccessTab = (
  tabId: string,
  { isOwner, can }: { isOwner: boolean; can: (...perms: Permission[]) => boolean },
) => {
  const rule = TAB_ACCESS[tabId];

  // Deny by default. This used to be `TAB_ACCESS[tabId] || {}` followed by
  // "no permission list means everyone" - so a section whose id was missing
  // from the table, or added without a rule, was visible to every staff
  // member. A gate that fails open is not a gate.
  if (!rule) return isOwner;

  if (rule.openToAll) return true;
  if (rule.ownerOnly) return isOwner;
  // The owner holds every permission implicitly and is never listed against
  // one, so this has to come before the permission check.
  if (isOwner) return true;
  if (!rule.permission) return false;
  return can(...rule.permission);
};

export const getDefaultTab = (ctx: { isOwner: boolean; can: (...perms: Permission[]) => boolean }) => {
  return TAB_PRIORITY.find(id => canAccessTab(id, ctx)) || 'notifications';
};
