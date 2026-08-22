-- Add the column nullable first so existing rows can be backfilled in the
-- right chronological order before the sequence takes over for new inserts.
ALTER TABLE "orders" ADD COLUMN "orderNumber" INTEGER;

-- Backfill existing orders in the order they were actually placed. Without
-- this, ADD COLUMN's own implicit per-row default (if we set one now) would
-- assign numbers in physical/insertion order, which is not guaranteed to
-- match createdAt and would misorder "order #1 was our first sale".
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt" ASC) AS rn
  FROM "orders"
)
UPDATE "orders" o
SET "orderNumber" = numbered.rn
FROM numbered
WHERE o.id = numbered.id;

CREATE SEQUENCE "order_number_seq";

-- setval's two-argument form always requires the sequence to already have
-- been "called" once, which fails on an empty table (there's nothing to
-- resume after). The three-argument form's `is_called = false` instead means
-- "the next nextval() returns this value itself" — exactly 1 on a fresh
-- database, or max+1 on one with existing orders, in one statement.
DO $$
DECLARE
  next_number INTEGER := COALESCE((SELECT MAX("orderNumber") FROM "orders"), 0) + 1;
BEGIN
  PERFORM setval('order_number_seq', next_number, false);
END $$;

ALTER TABLE "orders" ALTER COLUMN "orderNumber" SET NOT NULL;
ALTER TABLE "orders" ALTER COLUMN "orderNumber" SET DEFAULT nextval('order_number_seq');
ALTER TABLE "orders" ADD CONSTRAINT "orders_orderNumber_key" UNIQUE ("orderNumber");

-- Ties the sequence's lifecycle to the column: dropping the column or table
-- drops the sequence too, instead of leaving an orphaned DB object behind.
ALTER SEQUENCE "order_number_seq" OWNED BY "orders"."orderNumber";
