-- CreateTable
CREATE TABLE "PlayerSession" (
    "guildId" TEXT NOT NULL,
    "sessionId" TEXT,
    "resumeKey" TEXT,

    CONSTRAINT "PlayerSession_pkey" PRIMARY KEY ("guildId")
);
