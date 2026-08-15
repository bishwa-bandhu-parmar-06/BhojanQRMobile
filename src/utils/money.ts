/**
 * Formats a rupee amount for display.
 *
 * Order totals are summed in JS floats, and 313.2 + 628.2 evaluates to
 * 941.4000000000001 - which is exactly what the Live Orders session card was
 * printing at a customer-facing counter. Rounding at the point of DISPLAY
 * rather than when summing keeps the arithmetic itself untouched (the server
 * is the authority on what is owed) while making sure no screen ever shows a
 * binary-floating-point artefact.
 *
 * Trailing ".00" is dropped because whole-rupee totals are the common case
 * and "₹313" reads better on a card than "₹313.00"; anything with paise keeps
 * both decimals.
 */
export const formatMoney = (value: number | string | null | undefined): string => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";

  const rounded = Math.round(n * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
};
