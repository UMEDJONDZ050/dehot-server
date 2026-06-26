-- AlterTable
ALTER TABLE "taxi_listings" ADD COLUMN     "expiresAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'BUYER';
