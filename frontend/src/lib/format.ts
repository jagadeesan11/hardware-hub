/**
 * Indian digit grouping (1,20,000 rather than 120,000) and no paise, which is
 * how hardware shops quote prices.
 */
const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/** Keeps paise when a price actually has them, e.g. 123.45 for fittings. */
const inrWithPaise = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatPrice = (value: number): string =>
  Number.isInteger(value) ? inr.format(value) : inrWithPaise.format(value);

export const stockLabel = (stockQty: number): { text: string; tone: 'ok' | 'low' | 'out' } => {
  if (stockQty <= 0) return { text: 'Out of stock', tone: 'out' };
  if (stockQty <= 10) return { text: `Only ${stockQty} left`, tone: 'low' };
  return { text: 'In stock', tone: 'ok' };
};
