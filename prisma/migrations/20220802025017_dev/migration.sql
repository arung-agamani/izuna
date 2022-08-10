/*
  Warnings:

  - Added the required column `dateCreated` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `email` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dateCreated" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "email" TEXT NOT NULL;
