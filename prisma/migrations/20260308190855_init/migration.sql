-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "requestStatus" "GameRequestStatus" NOT NULL DEFAULT 'APPROVED';

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "bannedAt" DROP DEFAULT;
