import type { Prisma } from '@prisma/client';

/**
 * Prisma returns Decimal objects, which JSON.stringify turns into
 * {"s":1,"e":3,"d":[...]} — useless to the client. Convert at the boundary.
 *
 * Number is safe here: JS integers are exact to 2^53, far beyond any price
 * this shop will quote. Decimal is still what the database stores and what
 * arithmetic runs on; only the wire format is a number.
 */
export const decimalToNumber = (value: Prisma.Decimal | number): number =>
  typeof value === 'number' ? value : value.toNumber();
