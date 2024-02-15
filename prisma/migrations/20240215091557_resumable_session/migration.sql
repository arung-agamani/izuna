/*
  Warnings:

  - You are about to drop the column `resumeKey` on the `PlayerSession` table. All the data in the column will be lost.
  - Added the required column `connectionData` to the `PlayerSession` table without a default value. This is not possible if the table is not empty.
  - Added the required column `playerData` to the `PlayerSession` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "PlayerSession" DROP COLUMN "resumeKey",
ADD COLUMN     "connectionData" JSONB NOT NULL,
ADD COLUMN     "playerData" JSONB NOT NULL;
