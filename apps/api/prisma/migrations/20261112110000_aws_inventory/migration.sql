ALTER TABLE "Server" ADD COLUMN "publicIpAddress" TEXT;

CREATE TABLE "AwsResource" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "identity" TEXT NOT NULL,
    "arn" TEXT,
    "service" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "name" TEXT,
    "region" TEXT,
    "status" TEXT,
    "metadata" JSONB,
    "lastDiscoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "missingSince" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AwsResource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AwsSyncRun" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "coverageStatus" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "resourcesDiscovered" INTEGER NOT NULL DEFAULT 0,
    "resourcesCreated" INTEGER NOT NULL DEFAULT 0,
    "resourcesUpdated" INTEGER NOT NULL DEFAULT 0,
    "servicesQueried" JSONB NOT NULL DEFAULT '[]',
    "serviceErrors" JSONB NOT NULL DEFAULT '[]',
    "unsupportedResourceTypes" JSONB NOT NULL DEFAULT '[]',
    "unintegratedResourceTypes" JSONB NOT NULL DEFAULT '[]',
    "incompleteRegions" JSONB NOT NULL DEFAULT '[]',
    "resourceExplorerStatus" JSONB,
    "error" TEXT,
    CONSTRAINT "AwsSyncRun_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AwsResource_accountId_identity_key" ON "AwsResource"("accountId", "identity");
CREATE INDEX "AwsResource_service_region_idx" ON "AwsResource"("service", "region");
CREATE INDEX "AwsResource_resourceType_status_idx" ON "AwsResource"("resourceType", "status");
CREATE INDEX "AwsResource_lastDiscoveredAt_idx" ON "AwsResource"("lastDiscoveredAt");
CREATE INDEX "AwsResource_missingSince_idx" ON "AwsResource"("missingSince");
CREATE INDEX "AwsSyncRun_startedAt_idx" ON "AwsSyncRun"("startedAt");
CREATE INDEX "AwsSyncRun_status_startedAt_idx" ON "AwsSyncRun"("status", "startedAt");
