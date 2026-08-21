-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "carrier" TEXT,
ADD COLUMN     "trackingNumber" TEXT;

-- CreateTable
CREATE TABLE "order_status_events" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_status_events_orderId_idx" ON "order_status_events"("orderId");

-- AddForeignKey
ALTER TABLE "order_status_events" ADD CONSTRAINT "order_status_events_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
