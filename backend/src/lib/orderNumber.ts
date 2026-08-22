/**
 * Renders the sequential `orderNumber` column as the human-facing order
 * number — e.g. 1 -> "ODRH0000001". "ODRH" is a fixed prefix (Order,
 * Harikrishna); change it here if the shop's short name ever changes.
 */
export const formatOrderNumber = (orderNumber: number): string =>
  `ODRH${String(orderNumber).padStart(7, '0')}`;
