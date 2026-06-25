-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'DRIVER';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "driverFromCity" TEXT,
ADD COLUMN     "driverToCity" TEXT;

-- CreateTable
CREATE TABLE "taxi_listings" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "fromCity" TEXT NOT NULL,
    "toCity" TEXT NOT NULL,
    "seats" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "taxi_listings_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "taxi_listings" ADD CONSTRAINT "taxi_listings_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
