-- Add test user and test order fields migration
-- This migration adds support for test/production environment isolation

-- Add isTestUser field to User table
ALTER TABLE "User" 
ADD COLUMN IF NOT EXISTS "is_test_user" BOOLEAN DEFAULT FALSE;

-- Add isTestOrder field to Order table  
ALTER TABLE "Order"
ADD COLUMN IF NOT EXISTS "is_test_order" BOOLEAN DEFAULT FALSE;

-- Update existing test users (199 prefix phone numbers)
UPDATE "User"
SET "is_test_user" = TRUE
WHERE "phone_number" LIKE '199%';

-- Update existing orders for test users
UPDATE "Order" o
SET "is_test_order" = TRUE
FROM "User" u
WHERE o."user_id" = u."id" 
  AND u."is_test_user" = TRUE;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_is_test_user ON "User"("is_test_user");
CREATE INDEX IF NOT EXISTS idx_order_is_test_order ON "Order"("is_test_order");
CREATE INDEX IF NOT EXISTS idx_order_user_test ON "Order"("user_id", "is_test_order");

-- Add comments for documentation
COMMENT ON COLUMN "User"."is_test_user" IS '标识是否为测试账号，测试账号只能看到测试订单';
COMMENT ON COLUMN "Order"."is_test_order" IS '标识是否为测试订单，用于测试/生产环境数据隔离';