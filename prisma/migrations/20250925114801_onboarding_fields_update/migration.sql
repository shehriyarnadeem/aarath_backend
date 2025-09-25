-- AlterTable
ALTER TABLE "users" ADD COLUMN     "accountType" TEXT,
ADD COLUMN     "businessAddress" TEXT,
ADD COLUMN     "businessRole" TEXT,
ADD COLUMN     "companyName" TEXT,
ADD COLUMN     "companyPicture" TEXT,
ADD COLUMN     "personalLocation" TEXT,
ADD COLUMN     "personalName" TEXT,
ADD COLUMN     "personalProfilePic" TEXT,
ADD COLUMN     "whatsapp" TEXT,
ADD COLUMN     "whatsappVerified" BOOLEAN NOT NULL DEFAULT false;
