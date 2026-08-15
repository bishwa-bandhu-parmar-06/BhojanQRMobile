// Mirror of server/constants/permissions.js.
//
// The server is the source of truth and serves this list from
// GET /staff/permissions - StaffManager fetches it so a permission added on
// the server appears here without an app release. This file is the fallback
// that renders before that request lands, and if it fails.
//
// The first seven keys are the original set and are spelled exactly as they
// are stored on existing Staff documents. They must not be renamed: the
// `permissions` array is enum-validated on the server, so a rename would
// invalidate every staff record holding one.

export interface PermissionItem {
  key: string;
  label: string;
  hint?: string;
}

export interface PermissionGroup {
  id: string;
  label: string;
  description?: string;
  permissions: PermissionItem[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: "orders",
    label: "Orders",
    description: "The live order board and everything on it",
    permissions: [
      { key: "view_pos", label: "See live orders", hint: "Open Live Orders and Active Tables" },
      { key: "manage_orders", label: "Update order status", hint: "Received through Delivered" },
      { key: "cancel_orders", label: "Cancel orders", hint: "Cancel with a reason - cannot be undone by the customer" },
      { key: "view_order_history", label: "View order history", hint: "Past completed and cancelled orders" },
    ],
  },
  {
    id: "tables",
    label: "Tables & service",
    description: "Running the floor",
    permissions: [
      { key: "manage_tables", label: "Settle and close tables", hint: "Open a bill and end a visit" },
      { key: "respond_service", label: "Answer waiter calls", hint: "Acknowledge a table that pressed call" },
    ],
  },
  {
    id: "menu",
    label: "Menu",
    description: "Dishes, prices and availability",
    permissions: [
      { key: "manage_menu", label: "Add and edit menu items", hint: "Create, price, toggle, bulk import" },
      { key: "delete_menu", label: "Delete menu items", hint: "Including Delete All - destructive" },
    ],
  },
  {
    id: "marketing",
    label: "Marketing",
    description: "Discounts and scheduled offers",
    permissions: [
      { key: "manage_offers", label: "Manage Happy Hours", hint: "Create, pause and delete discounts" },
    ],
  },
  {
    id: "qr",
    label: "Table QR codes",
    description: "The codes customers scan",
    permissions: [
      { key: "manage_qr", label: "Generate and delete QR codes", hint: "Create, download and remove table codes" },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    description: "Revenue and performance",
    permissions: [
      { key: "view_reports", label: "View reports and dashboard", hint: "Revenue figures and the sales chart" },
      { key: "export_reports", label: "Export reports", hint: "Download sales data as a file" },
    ],
  },
  {
    id: "team",
    label: "Team",
    description: "Other staff accounts",
    permissions: [
      { key: "manage_staff", label: "Manage staff", hint: "Grant with care - it lets someone widen colleagues' access" },
    ],
  },
  {
    id: "account",
    label: "Restaurant account",
    description: "The restaurant's own details",
    permissions: [
      { key: "manage_profile", label: "Edit restaurant profile", hint: "Name, addresses, logo, documents. Not the owner's login" },
    ],
  },
];

// Retired, not deleted: the server keeps these enum-valid so any record
// still holding one stays saveable. None are offered.
//
//   create_order / kitchen_display - the screens they described do not exist.
//   manage_settings - the catch-all for QR + Happy Hours + profile. Holders
//     were migrated to the specific rights (server/scripts/migrate-permissions.js).
//   manage_support - raising a support ticket is not a permission any more;
//     every restaurant and staff account can do it.
export const RETIRED_PERMISSIONS = [
  "create_order",
  "kitchen_display",
  "manage_settings",
  "manage_support",
];

export const PERMISSIONS = [
  ...PERMISSION_GROUPS.flatMap((g) => g.permissions.map((p) => p.key)),
  ...RETIRED_PERMISSIONS,
];

// Loose string rather than a union of the keys above: the catalogue is served
// by the server now, so a build of this app can legitimately encounter a
// permission it has never heard of.
export type Permission = string;

export const PERMISSION_LABELS: Record<string, string> = PERMISSION_GROUPS.reduce(
  (acc, group) => {
    group.permissions.forEach((p) => {
      acc[p.key] = p.label;
    });
    return acc;
  },
  {} as Record<string, string>,
);

export const STAFF_ROLES = ["MANAGER", "CHEF", "WAITER"] as const;

export const DEFAULT_ROLE_PERMISSIONS: Record<string, Permission[]> = {
  MANAGER: [
    "view_pos",
    "manage_orders",
    "cancel_orders",
    "view_order_history",
    "manage_tables",
    "respond_service",
    "manage_menu",
    "manage_offers",
    "manage_qr",
    "view_reports",
  ],
  WAITER: ["view_pos", "manage_orders", "manage_tables", "respond_service"],
  CHEF: ["view_pos", "manage_orders"],
};
