/*
  Warnings:

  - The `latitude` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `longitude` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "latitude",
ADD COLUMN     "latitude" DOUBLE PRECISION,
DROP COLUMN "longitude",
ADD COLUMN     "longitude" DOUBLE PRECISION;
