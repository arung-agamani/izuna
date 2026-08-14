-- Revert the PARTIALLY-APPLIED steps of 20260813183658_enrich_timestamps.
--
-- That migration failed at the `Reminder.channelType` type change (NULL values in the
-- legacy TEXT column). Postgres applied the earlier statements before the failure:
--   - CREATE TYPE "ChannelType"
--   - createdAt/updatedAt on DiscordSlashCommandIdMapping, EphemeralVC, JoinToCreateVC, PlayerSession, Playlist
--   - Playlist: dropped "private", added "isPrivate", defaulted "dateCreated"
--
-- Run this against the production database BEFORE `prisma migrate resolve --rolled-back`,
-- then re-run `prisma migrate deploy` with the fixed migration.
-- Idempotent: safe to run multiple times.

DROP TYPE IF EXISTS "ChannelType";

ALTER TABLE "DiscordSlashCommandIdMapping"
    DROP COLUMN IF EXISTS "createdAt",
    DROP COLUMN IF EXISTS "updatedAt";

ALTER TABLE "EphemeralVC"
    DROP COLUMN IF EXISTS "createdAt",
    DROP COLUMN IF EXISTS "updatedAt";

ALTER TABLE "JoinToCreateVC"
    DROP COLUMN IF EXISTS "createdAt",
    DROP COLUMN IF EXISTS "updatedAt";

ALTER TABLE "PlayerSession"
    DROP COLUMN IF EXISTS "createdAt",
    DROP COLUMN IF EXISTS "updatedAt";

ALTER TABLE "Playlist"
    DROP COLUMN IF EXISTS "createdAt",
    DROP COLUMN IF EXISTS "isPrivate",
    DROP COLUMN IF EXISTS "updatedAt";

ALTER TABLE "Playlist" ADD COLUMN IF NOT EXISTS "private" BOOLEAN;

ALTER TABLE "Playlist" ALTER COLUMN "dateCreated" DROP DEFAULT;
