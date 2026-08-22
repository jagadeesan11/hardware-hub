-- Email becomes optional: a user may now sign in with phone alone.
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;

-- Phone becomes a second unique login identifier, alongside email.
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- Prisma has no declarative syntax for this: guarantees a user row can never
-- end up with neither identifier set, which would make it unreachable by login.
ALTER TABLE "users" ADD CONSTRAINT "users_identifier_present"
  CHECK ("email" IS NOT NULL OR "phone" IS NOT NULL);
