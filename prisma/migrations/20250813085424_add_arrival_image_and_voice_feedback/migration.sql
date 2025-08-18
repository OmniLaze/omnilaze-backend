-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "arrival_image_imported_at" TIMESTAMP(3),
ADD COLUMN     "arrival_image_source" TEXT,
ADD COLUMN     "arrival_image_taken_at" TIMESTAMP(3),
ADD COLUMN     "arrival_image_url" TEXT;

-- CreateTable
CREATE TABLE "OrderVoiceFeedback" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "audio_url" TEXT NOT NULL,
    "duration_sec" INTEGER,
    "transcript" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderVoiceFeedback_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "OrderVoiceFeedback" ADD CONSTRAINT "OrderVoiceFeedback_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
