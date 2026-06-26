import { DateTime } from 'luxon';

// Mirrors client/src/utils/pricingEngine.js (and server/utils/pricingEngine.js)
// exactly - this is what lets the menu screen show/hide a Happy Hour discount
// the instant its schedule starts/ends using only the device clock, with zero
// server polling. The backend re-runs the same logic independently at
// checkout, since this client-side evaluation is for display only and is
// never trusted for price.

const DAY_ABBREVIATIONS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const MIN_FINAL_PRICE = 1;

export const PRICE_LOCK_DURATION_MS = 15 * 60 * 1000;

export interface OfferSchedule {
  startTime: string;
  endTime: string;
  days: string[];
}

export interface Offer {
  _id: string;
  name: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  status: string;
  applyTo: {
    scope: 'items' | 'category' | 'all';
    menuItems?: Array<string | { toString(): string }>;
    categories?: string[];
  };
  schedule: OfferSchedule;
}

export interface PricedItem {
  _id: string;
  category?: string;
  price: number | string;
}

export interface BestOffer {
  offerId: string;
  offerName: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  basePrice: number;
  discountedPrice: number;
  discountAmount: number;
  endsAt: Date;
}

function toLocal(at: Date | string | number, timezone?: string) {
  return DateTime.fromJSDate(at instanceof Date ? at : new Date(at), {
    zone: timezone || 'Asia/Kolkata',
  });
}

function minutesSinceMidnight(localDateTime: DateTime) {
  return localDateTime.hour * 60 + localDateTime.minute;
}

function timeStringToMinutes(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function isScheduleActiveAt(
  schedule: OfferSchedule,
  at: Date | string | number,
  timezone?: string,
): boolean {
  const local = toLocal(at, timezone);
  const today = DAY_ABBREVIATIONS[local.weekday - 1];
  const yesterday = DAY_ABBREVIATIONS[(local.weekday - 2 + 7) % 7];
  const nowMin = minutesSinceMidnight(local);
  const startMin = timeStringToMinutes(schedule.startTime);
  const endMin = timeStringToMinutes(schedule.endTime);
  const crossesMidnight = endMin <= startMin;

  if (!crossesMidnight) {
    return schedule.days.includes(today) && nowMin >= startMin && nowMin < endMin;
  }

  const eveningSide = schedule.days.includes(today) && nowMin >= startMin;
  const morningContinuation = schedule.days.includes(yesterday) && nowMin < endMin;
  return eveningSide || morningContinuation;
}

export function computeEndsAt(
  schedule: OfferSchedule,
  at: Date | string | number,
  timezone?: string,
): Date {
  const local = toLocal(at, timezone);
  const [endH, endM] = schedule.endTime.split(':').map(Number);
  const startMin = timeStringToMinutes(schedule.startTime);
  const endMin = timeStringToMinutes(schedule.endTime);
  const crossesMidnight = endMin <= startMin;
  const nowMin = minutesSinceMidnight(local);

  const isMorningContinuation = crossesMidnight && nowMin < endMin;
  let endDay = local;
  if (crossesMidnight && !isMorningContinuation) {
    endDay = local.plus({ days: 1 });
  }

  return endDay.set({ hour: endH, minute: endM, second: 0, millisecond: 0 }).toJSDate();
}

export function applicableOffersForItem(offers: Offer[], item: PricedItem): Offer[] {
  const itemId = item._id ? item._id.toString() : String(item);
  return offers.filter(offer => {
    if (offer.applyTo.scope === 'all') return true;
    if (offer.applyTo.scope === 'category') {
      return !!offer.applyTo.categories?.includes(item.category || '');
    }
    if (offer.applyTo.scope === 'items') {
      return !!offer.applyTo.menuItems?.some(id => id.toString() === itemId);
    }
    return false;
  });
}

export function computeDiscountedPrice(
  basePrice: number,
  discountType: 'percentage' | 'fixed',
  discountValue: number,
): number {
  const raw =
    discountType === 'percentage'
      ? basePrice - basePrice * (discountValue / 100)
      : basePrice - discountValue;
  return Math.max(MIN_FINAL_PRICE, Math.round(raw * 100) / 100);
}

export function evaluateBestOfferForItem({
  offers,
  item,
  at,
  timezone,
}: {
  offers: Offer[];
  item: PricedItem;
  at: Date | string | number;
  timezone?: string;
}): BestOffer | null {
  const basePrice = parseFloat(String(item.price));
  const candidates = applicableOffersForItem(offers, item).filter(
    offer => offer.status === 'active' && isScheduleActiveAt(offer.schedule, at, timezone),
  );

  if (candidates.length === 0) return null;

  let best: BestOffer | null = null;
  for (const offer of candidates) {
    const discountedPrice = computeDiscountedPrice(
      basePrice,
      offer.discountType,
      offer.discountValue,
    );
    const discountAmount = Math.round((basePrice - discountedPrice) * 100) / 100;
    if (!best || discountAmount > best.discountAmount) {
      best = {
        offerId: offer._id.toString(),
        offerName: offer.name,
        discountType: offer.discountType,
        discountValue: offer.discountValue,
        basePrice,
        discountedPrice,
        discountAmount,
        endsAt: computeEndsAt(offer.schedule, at, timezone),
      };
    }
  }
  return best;
}

// "1h 22m 10s" / "22m 10s" / "10s" - whichever units are non-zero, dropped
// from the front so it doesn't read "0h 5m 2s".
export function formatCountdown(msRemaining: number): string {
  if (msRemaining <= 0) return '0s';
  const totalSeconds = Math.floor(msRemaining / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
