import { useEffect, useState } from 'react';
import { socket } from '../utils/socket';

interface OrderStatusPayload {
  orderId: string;
  status: string;
  timestamp?: string;
}

// Joins the Socket.IO room for one order and exposes the latest
// "order:status-changed" event for it. `token` is the same
// razorpayPaymentId TrackOrder already uses to fetch the order - the server
// re-validates it before allowing the room join.
export function useOrderSocket(orderId?: string | null, token?: string | null) {
  const [latestUpdate, setLatestUpdate] = useState<OrderStatusPayload | null>(null);

  useEffect(() => {
    if (!orderId || !token) return;

    socket.emit('join-order-room', { orderId, token });

    const handleStatusChange = (payload: OrderStatusPayload) => {
      if (payload.orderId === orderId) {
        setLatestUpdate(payload);
      }
    };

    socket.on('order:status-changed', handleStatusChange);

    return () => {
      socket.off('order:status-changed', handleStatusChange);
    };
  }, [orderId, token]);

  return latestUpdate;
}
