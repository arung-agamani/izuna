/*
  Warnings:

  - You are about to drop the column `dateCreated` on the `Playlist` table. All the data in the column will be lost.
  - You are about to drop the column `dateCreated` on the `Tag` table. All the data in the column will be lost.
  - You are about to drop the column `dateCreated` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Playlist" DROP COLUMN "dateCreated";

-- AlterTable
ALTER TABLE "Tag" DROP COLUMN "dateCreated";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "dateCreated";
