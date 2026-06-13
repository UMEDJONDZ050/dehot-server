-- AlterTable
ALTER TABLE "complaints" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'user',
ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "aiScanned" BOOLEAN NOT NULL DEFAULT false;
