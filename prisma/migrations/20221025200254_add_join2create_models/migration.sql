-- CreateTable
CREATE TABLE "JoinToCreateVC" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "parentChannelId" TEXT NOT NULL,

    CONSTRAINT "JoinToCreateVC_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EphemeralVC" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,

    CONSTRAINT "EphemeralVC_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JoinToCreateVC_guildId_key" ON "JoinToCreateVC"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "EphemeralVC_guildId_channelId_key" ON "EphemeralVC"("guildId", "channelId");
