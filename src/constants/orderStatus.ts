import {
  PackageCheck,
  BadgeCheck,
  ChefHat,
  Utensils,
  Truck,
  CheckCircle,
  XCircle,
} from 'lucide-react-native';

// Single source of truth for the 7-status order lifecycle, ported from
// client/src/constants/orderStatus.js - shared by the customer-facing
// TrackOrder screen (and, later, the restaurant order-management screens).
export interface OrderStatusMeta {
  value: string;
  label: string;
  Icon: typeof PackageCheck;
  color: string;
}

export const ORDER_STATUS_FLOW: OrderStatusMeta[] = [
  { value: 'Order Received', label: 'Received', Icon: PackageCheck, color: '#d97706' },
  { value: 'Order Confirmed', label: 'Confirmed', Icon: BadgeCheck, color: '#0284c7' },
  { value: 'Preparing', label: 'Preparing', Icon: ChefHat, color: '#2563eb' },
  { value: 'Ready To Serve', label: 'Ready', Icon: Utensils, color: '#9333ea' },
  { value: 'Delivered', label: 'Delivered', Icon: Truck, color: '#4f46e5' },
  { value: 'Completed', label: 'Completed', Icon: CheckCircle, color: '#16a34a' },
];

export const CANCELLED_STATUS: OrderStatusMeta = {
  value: 'Cancelled',
  label: 'Cancelled',
  Icon: XCircle,
  color: '#dc2626',
};

export const ALL_ORDER_STATUSES: OrderStatusMeta[] = [...ORDER_STATUS_FLOW, CANCELLED_STATUS];

export const getStatusMeta = (status: string): OrderStatusMeta =>
  ALL_ORDER_STATUSES.find(s => s.value === status) || ORDER_STATUS_FLOW[0];

// Same generalization used server-side: anything that isn't a terminal
// state still counts as active workload for the order.
export const isActiveOrderStatus = (status: string): boolean =>
  !['Completed', 'Cancelled'].includes(status);
