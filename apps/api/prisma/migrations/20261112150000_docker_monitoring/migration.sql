ALTER TABLE "Server"
  ADD COLUMN "dockerEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "dockerAvailable" BOOLEAN,
  ADD COLUMN "dockerEngineVersion" TEXT,
  ADD COLUMN "dockerApiVersion" TEXT,
  ADD COLUMN "dockerRunningContainers" INTEGER,
  ADD COLUMN "dockerStoppedContainers" INTEGER,
  ADD COLUMN "dockerTotalContainers" INTEGER,
  ADD COLUMN "dockerImageCount" INTEGER;

ALTER TABLE "DockerContainer"
  ADD COLUMN "createdAtDocker" TIMESTAMP(3),
  ADD COLUMN "lastSeenAt" TIMESTAMP(3),
  ADD COLUMN "missingSince" TIMESTAMP(3),
  ADD COLUMN "memoryUsageBytes" BIGINT,
  ADD COLUMN "memoryLimitBytes" BIGINT,
  ADD COLUMN "networkRxBytes" BIGINT,
  ADD COLUMN "networkTxBytes" BIGINT,
  ADD COLUMN "blockReadBytes" BIGINT,
  ADD COLUMN "blockWriteBytes" BIGINT,
  ADD COLUMN "ports" JSONB,
  ADD COLUMN "networks" JSONB,
  ADD COLUMN "mounts" JSONB;

CREATE INDEX "Server_dockerEnabled_lastHeartbeatAt_idx" ON "Server"("dockerEnabled", "lastHeartbeatAt");
CREATE INDEX "DockerContainer_serverId_missingSince_lastSeenAt_idx" ON "DockerContainer"("serverId", "missingSince", "lastSeenAt");

CREATE TABLE "DockerContainerMetric" (
  "id" TEXT NOT NULL,
  "containerDbId" TEXT NOT NULL,
  "cpuPercent" DOUBLE PRECISION,
  "memoryUsageBytes" BIGINT,
  "memoryLimitBytes" BIGINT,
  "memoryPercent" DOUBLE PRECISION,
  "networkRxBytes" BIGINT,
  "networkTxBytes" BIGINT,
  "blockReadBytes" BIGINT,
  "blockWriteBytes" BIGINT,
  "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DockerContainerMetric_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DockerContainerMetric_containerDbId_collectedAt_idx" ON "DockerContainerMetric"("containerDbId", "collectedAt");
CREATE INDEX "DockerContainerMetric_collectedAt_idx" ON "DockerContainerMetric"("collectedAt");
ALTER TABLE "DockerContainerMetric" ADD CONSTRAINT "DockerContainerMetric_containerDbId_fkey"
  FOREIGN KEY ("containerDbId") REFERENCES "DockerContainer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "DockerAgentHeartbeat" (
  "id" TEXT NOT NULL,
  "serverId" TEXT NOT NULL,
  "dockerAvailable" BOOLEAN NOT NULL,
  "dockerError" TEXT,
  "engineVersion" TEXT,
  "apiVersion" TEXT,
  "containerCount" INTEGER,
  "imageCount" INTEGER,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DockerAgentHeartbeat_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DockerAgentHeartbeat_serverId_receivedAt_idx" ON "DockerAgentHeartbeat"("serverId", "receivedAt");
ALTER TABLE "DockerAgentHeartbeat" ADD CONSTRAINT "DockerAgentHeartbeat_serverId_fkey"
  FOREIGN KEY ("serverId") REFERENCES "Server"("id") ON DELETE CASCADE ON UPDATE CASCADE;
