-- AlterTable
ALTER TABLE "admin_settings" ADD COLUMN     "withdrawalFeeFixed" DECIMAL(18,8) NOT NULL DEFAULT 0,
ADD COLUMN     "withdrawalFeePercent" DECIMAL(5,4) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "withdrawals" ADD COLUMN     "feeAmount" DECIMAL(18,8) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "withdrawal_fee_tiers" (
    "id" TEXT NOT NULL,
    "minAmount" DECIMAL(18,8) NOT NULL,
    "maxAmount" DECIMAL(18,8),
    "percent" DECIMAL(5,4) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "withdrawal_fee_tiers_pkey" PRIMARY KEY ("id")
);
