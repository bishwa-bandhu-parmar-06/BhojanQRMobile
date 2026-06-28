import { useEffect } from 'react';
import { socket } from '../utils/socket';

interface OfferUpdatedPayload {
  restaurantId: string;
}

// Mirrors the website's useMenuOfferSocket.js - joins the public
// "menu:{restaurantId}" room (no auth needed, the menu itself is public)
// and calls `onOfferUpdated` whenever the owner creates/edits/pauses/
// deletes a Happy Hour offer, so an already-open guest menu reflects it
// immediately instead of only on next visit.
export function useMenuOfferSocket(restaurantId: string | undefined, onOfferUpdated: () => void) {
  useEffect(() => {
    if (!restaurantId) return;

    socket.emit('join-menu-room', { restaurantId });

    const handleOfferUpdated = (payload: OfferUpdatedPayload) => {
      if (payload.restaurantId === restaurantId) {
        onOfferUpdated();
      }
    };

    socket.on('offer:updated', handleOfferUpdated);

    return () => {
      socket.off('offer:updated', handleOfferUpdated);
    };
  }, [restaurantId, onOfferUpdated]);
}
