import {
  PackageCheck,
  BadgeCheck,
  ChefHat,
  Utensils,
  Truck,
  CheckCircle,
  XCircle,
} from 'lucide-react-native';

export interface OrderStatusMeta {
  value: string;
  label: string;
  Icon: typeof PackageCheck;
  color: string;
}

export const ORDER_STATUS_FLOW: OrderStatusMeta[] = [
  {
    value: 'Order Received',
    label: 'Received',
    Icon: PackageCheck,
    color: '#d97706',
  },
  {
    value: 'Order Confirmed',
    label: 'Confirmed',
    Icon: BadgeCheck,
    color: '#0284c7',
  },
  { value: 'Preparing', label: 'Preparing', Icon: ChefHat, color: '#2563eb' },
  { value: 'Ready To Serve', label: 'Ready', Icon: Utensils, color: '#9333ea' },
  { value: 'Delivered', label: 'Delivered', Icon: Truck, color: '#4f46e5' },
  {
    value: 'Completed',
    label: 'Completed',
    Icon: CheckCircle,
    color: '#16a34a',
  },
];

export const CANCELLED_STATUS: OrderStatusMeta = {
  value: 'Cancelled',
  label: 'Cancelled',
  Icon: XCircle,
  color: '#dc2626',
};

export const ALL_ORDER_STATUSES: OrderStatusMeta[] = [
  ...ORDER_STATUS_FLOW,
  CANCELLED_STATUS,
];

export const getStatusMeta = (status: string): OrderStatusMeta =>
  ALL_ORDER_STATUSES.find(s => s.value === status) || ORDER_STATUS_FLOW[0];

export const isActiveOrderStatus = (status: string): boolean =>
  !['Completed', 'Cancelled'].includes(status);

/**
 * How long a Completed order stays on the live boards before moving to Order
 * History. Must match HISTORY_GRACE_MS in the server's orderController - the
 * boards hide with this rule and the /order/history endpoint reveals with it,
 * so a mismatch would either double-show an order or lose it from both views
 * for a while.
 *
 * The delay exists because "Completed" is the status most often tapped by
 * mistake: a minute is long enough to notice and step it back, short enough
 * that a finished order is not still in the way when the next one lands.
 */
export const HISTORY_GRACE_MS = 60 * 1000;

/**
 * The two terminal states. An order in either is finished with - nothing on
 * the live boards can act on it - so both serve out the grace period and then
 * move to history. Their filter pills on Live Orders still work; they simply
 * show what ended recently rather than everything that ever ended.
 */
export const TERMINAL_ORDER_STATUSES = ['Completed', 'Cancelled'];

/**
 * True once a terminal order has served out its grace period.
 *
 * Only meaningful for an order standing on its own. Anything belonging to a
 * table session must be judged with isArchivedGroup instead - see below.
 */
export const isArchivedOrder = (order: any, now: number = Date.now()): boolean => {
  if (!TERMINAL_ORDER_STATUSES.includes(order?.status)) return false;
  const changedAt = new Date(order.statusUpdatedAt || order.updatedAt || 0).getTime();
  // An order with no usable timestamp stays on the board rather than
  // vanishing - visible and stale beats silently gone.
  if (!Number.isFinite(changedAt) || changedAt === 0) return false;
  return now - changedAt >= HISTORY_GRACE_MS;
};

/** The key that ties repeat orders from one visit together. */
export const sessionKeyOf = (order: any): string =>
  order?.tableSessionId || order?._id;

/**
 * Groups orders by dining session, preserving order within each group.
 */
export const groupBySession = (orders: any[]): any[][] => {
  const map = new Map<string, any[]>();
  orders.forEach((order) => {
    const key = sessionKeyOf(order);
    const group = map.get(key);
    if (group) group.push(order);
    else map.set(key, [order]);
  });
  return Array.from(map.values());
};

/**
 * True once an ENTIRE session belongs to history.
 *
 * A session archives as one unit, never order by order. Judging each order
 * separately meant a table with three orders lost the first one off the board
 * the moment it was completed, leaving a "combined session" that no longer
 * showed everything the table had ordered - and eventually a session card
 * standing in for a single remaining order.
 *
 * Both conditions have to hold:
 *   - every order in the session has reached a terminal state, and
 *   - the MOST RECENT of those changes is older than the grace period.
 *
 * Taking the most recent is what keeps the group together: if one order was
 * completed ten minutes ago and its neighbour ten seconds ago, the session is
 * still on the board, because otherwise the two halves would separate.
 */
export const isArchivedGroup = (orders: any[], now: number = Date.now()): boolean => {
  if (!orders?.length) return false;
  if (!orders.every((o) => TERMINAL_ORDER_STATUSES.includes(o?.status))) return false;

  const lastChangedAt = orders.reduce((latest, o) => {
    const t = new Date(o.statusUpdatedAt || o.updatedAt || 0).getTime();
    return Number.isFinite(t) ? Math.max(latest, t) : latest;
  }, 0);

  if (lastChangedAt === 0) return false;
  return now - lastChangedAt >= HISTORY_GRACE_MS;
};
