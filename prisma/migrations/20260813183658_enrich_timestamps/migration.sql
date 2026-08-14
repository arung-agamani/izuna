/*
  Warnings (and manual fixups):

  - Drops the `private` column on `Playlist` (unused table, no data).
  - Drops the `ReminderService` table (dead schema, never queried).
  - `channelType` on `Reminder` changes TEXT -> enum. Prisma generated DROP + re-ADD,
    which fails on NULL values. Hand-edited to backfill NULLs to 'DM' then cast in place.
*/
-- CreateEnum
CREATE TYPE "ChannelType" AS ENUM ('DM', 'CHANNEL');

-- AlterTable
ALTER TABLE "DiscordSlashCommandIdMapping" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "EphemeralVC" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "JoinToCreateVC" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "PlayerSession" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Playlist" DROP COLUMN "private",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isPrivate" BOOLEAN,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "dateCreated" SET DEFAULT CURRENT_TIMESTAMP;

-- Backfill NULL channelType values before the type change (legacy data has NULLs)
UPDATE "Reminder" SET "channelType" = 'DM' WHERE "channelType" IS NULL;

-- AlterTable
ALTER TABLE "Reminder" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "guildId" DROP NOT NULL,
ALTER COLUMN "channelType" TYPE "ChannelType" USING ("channelType"::"ChannelType");

-- AlterTable
ALTER TABLE "Tag" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "guildId" DROP NOT NULL,
ALTER COLUMN "dateCreated" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "dateCreated" SET DEFAULT CURRENT_TIMESTAMP;

-- DropTable
DROP TABLE "ReminderService";

-- DropEnum
DROP TYPE "ContentType";

-- CreateIndex
CREATE INDEX "Playlist_userId_idx" ON "Playlist"("userId");

-- CreateIndex
CREATE INDEX "Reminder_uid_idx" ON "Reminder"("uid");

-- CreateIndex
CREATE INDEX "Tag_userId_isGuild_idx" ON "Tag"("userId", "isGuild");

-- CreateIndex
CREATE INDEX "Tag_guildId_isGuild_idx" ON "Tag"("guildId", "isGuild");
