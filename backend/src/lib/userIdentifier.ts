import type { Prisma } from '@prisma/client';
import type { Identifier } from '../schemas/auth.schema.js';

/** The one place email-vs-phone becomes a Prisma `where` — every lookup goes through this. */
export const whereForIdentifier = (identifier: Identifier): Prisma.UserWhereInput =>
  identifier.kind === 'email' ? { email: identifier.value } : { phone: identifier.value };
