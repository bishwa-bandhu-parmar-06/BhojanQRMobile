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
 * True once a terminal order has served out its grace period and belongs to
 * history rather than the live boards.
 */
export const isArchivedOrder = (order: any, now: number = Date.now()): boolean => {
  if (!TERMINAL_ORDER_STATUSES.includes(order?.status)) return false;
  const changedAt = new Date(order.statusUpdatedAt || order.updatedAt || 0).getTime();
  // An order with no usable timestamp stays on the board rather than
  // vanishing - visible and stale beats silently gone.
  if (!Number.isFinite(changedAt) || changedAt === 0) return false;
  return now - changedAt >= HISTORY_GRACE_MS;
};
