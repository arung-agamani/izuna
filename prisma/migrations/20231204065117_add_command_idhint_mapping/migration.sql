-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('TEXT', 'MEDIA_IMAGE', 'MEDIA_VIDEO', 'MEDIA_FILE');

-- CreateTable
CREATE TABLE "ReminderService" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cron" TEXT NOT NULL,
    "contents" TEXT NOT NULL,
    "contentType" "ContentType" NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3),
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ReminderService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscordSlashCommandIdMapping" (
    "id" TEXT NOT NULL,
    "botId" TEXT NOT NULL,
    "commandName" TEXT NOT NULL,
    "idHints" TEXT[],

    CONSTRAINT "DiscordSlashCommandIdMapping_pkey" PRIMARY KEY ("id")
);
