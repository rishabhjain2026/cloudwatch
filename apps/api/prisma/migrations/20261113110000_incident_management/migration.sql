CREATE TYPE "IncidentPriority" AS ENUM ('P0', 'P1', 'P2', 'P3');
CREATE TYPE "IncidentAnalysisStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETE', 'FAILED');
CREATE TYPE "IncidentChatRole" AS ENUM ('USER', 'ASSISTANT');
CREATE TYPE "PostmortemStatus" AS ENUM ('DRAFT', 'AI_DRAFT', 'APPROVED');

ALTER TABLE "Incident"
  ADD COLUMN "priority" "IncidentPriority" NOT NULL DEFAULT 'P2',
  ADD COLUMN "category" TEXT NOT NULL DEFAULT 'INFRASTRUCTURE',
  ADD COLUMN "impactDescription" TEXT,
  ADD COLUMN "resourceType" TEXT,
  ADD COLUMN "resourceId" TEXT,
  ADD COLUMN "resourceName" TEXT,
  ADD COLUMN "correlationKey" TEXT,
  ADD COLUMN "reopenedCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastReopenedAt" TIMESTAMP(3),
  ADD COLUMN "rootCause" TEXT,
  ADD COLUMN "resolutionDescription" TEXT,
  ADD COLUMN "actionsTaken" TEXT,
  ADD COLUMN "preventiveActions" TEXT,
  ADD COLUMN "ackAt" TIMESTAMP(3),
  ADD COLUMN "investigatingAt" TIMESTAMP(3);
ALTER TABLE "Incident" ADD COLUMN "isPublic" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "Incident_category_status_detectedAt_idx" ON "Incident"("category", "status", "detectedAt");
CREATE INDEX "Incident_resourceType_resourceId_status_idx" ON "Incident"("resourceType", "resourceId", "status");
CREATE INDEX "Incident_correlationKey_status_detectedAt_idx" ON "Incident"("correlationKey", "status", "detectedAt");
CREATE INDEX "Incident_assigneeId_status_idx" ON "Incident"("assigneeId", "status");

ALTER TABLE "IncidentEvent"
  ADD COLUMN "previousStatus" TEXT,
  ADD COLUMN "newStatus" TEXT;
ALTER TABLE "IncidentAlert" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "IncidentAutomationRule" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT,
  "alertType" TEXT,
  "resourceType" TEXT,
  "minimumSeverity" "Severity" NOT NULL DEFAULT 'CRITICAL',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "correlationWindowSec" INTEGER NOT NULL DEFAULT 900,
  "correlateByResource" BOOLEAN NOT NULL DEFAULT true,
  "correlateByCategory" BOOLEAN NOT NULL DEFAULT true,
  "correlateByAlertType" BOOLEAN NOT NULL DEFAULT false,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IncidentAutomationRule_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "IncidentAutomationRule_enabled_category_alertType_idx" ON "IncidentAutomationRule"("enabled", "category", "alertType");
ALTER TABLE "IncidentAutomationRule" ADD CONSTRAINT "IncidentAutomationRule_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "IncidentAIAnalysis" (
  "id" TEXT NOT NULL,
  "incidentId" TEXT NOT NULL,
  "requestedById" TEXT,
  "status" "IncidentAnalysisStatus" NOT NULL DEFAULT 'PENDING',
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "provider" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "result" JSONB,
  "failureCode" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "IncidentAIAnalysis_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "IncidentAIAnalysis_incidentId_version_key" ON "IncidentAIAnalysis"("incidentId", "version");
CREATE INDEX "IncidentAIAnalysis_incidentId_status_requestedAt_idx" ON "IncidentAIAnalysis"("incidentId", "status", "requestedAt");
ALTER TABLE "IncidentAIAnalysis" ADD CONSTRAINT "IncidentAIAnalysis_incidentId_fkey"
  FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IncidentAIAnalysis" ADD CONSTRAINT "IncidentAIAnalysis_requestedById_fkey"
  FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "IncidentAIChatMessage" (
  "id" TEXT NOT NULL,
  "incidentId" TEXT NOT NULL,
  "analysisId" TEXT,
  "userId" TEXT,
  "role" "IncidentChatRole" NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IncidentAIChatMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "IncidentAIChatMessage_incidentId_createdAt_idx" ON "IncidentAIChatMessage"("incidentId", "createdAt");
CREATE INDEX "IncidentAIChatMessage_analysisId_createdAt_idx" ON "IncidentAIChatMessage"("analysisId", "createdAt");
ALTER TABLE "IncidentAIChatMessage" ADD CONSTRAINT "IncidentAIChatMessage_incidentId_fkey"
  FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IncidentAIChatMessage" ADD CONSTRAINT "IncidentAIChatMessage_analysisId_fkey"
  FOREIGN KEY ("analysisId") REFERENCES "IncidentAIAnalysis"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IncidentAIChatMessage" ADD CONSTRAINT "IncidentAIChatMessage_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "IncidentPostmortem" (
  "id" TEXT NOT NULL,
  "incidentId" TEXT NOT NULL,
  "summary" TEXT,
  "rootCause" TEXT,
  "impact" TEXT,
  "startedAt" TIMESTAMP(3),
  "detectedAt" TIMESTAMP(3),
  "acknowledgedAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "downtimeMs" INTEGER,
  "resolutionSteps" TEXT,
  "lessonsLearned" TEXT,
  "preventiveActions" TEXT,
  "responsibleUserId" TEXT,
  "status" "PostmortemStatus" NOT NULL DEFAULT 'DRAFT',
  "aiDraft" BOOLEAN NOT NULL DEFAULT false,
  "sourceAnalysisId" TEXT,
  "approvedById" TEXT,
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IncidentPostmortem_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "IncidentPostmortem_incidentId_key" ON "IncidentPostmortem"("incidentId");
CREATE INDEX "IncidentPostmortem_status_updatedAt_idx" ON "IncidentPostmortem"("status", "updatedAt");
ALTER TABLE "IncidentPostmortem" ADD CONSTRAINT "IncidentPostmortem_incidentId_fkey"
  FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IncidentPostmortem" ADD CONSTRAINT "IncidentPostmortem_responsibleUserId_fkey"
  FOREIGN KEY ("responsibleUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IncidentPostmortem" ADD CONSTRAINT "IncidentPostmortem_sourceAnalysisId_fkey"
  FOREIGN KEY ("sourceAnalysisId") REFERENCES "IncidentAIAnalysis"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "IncidentPostmortem" ADD CONSTRAINT "IncidentPostmortem_approvedById_fkey"
  FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Notification" ADD COLUMN "incidentId" TEXT;
CREATE INDEX "Notification_incidentId_createdAt_idx" ON "Notification"("incidentId", "createdAt");
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_incidentId_fkey"
  FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "NotificationDelivery" ALTER COLUMN "alertId" DROP NOT NULL;
ALTER TABLE "NotificationDelivery" ADD COLUMN "incidentId" TEXT;
ALTER TABLE "NotificationDelivery" ADD COLUMN "subject" TEXT;
ALTER TABLE "NotificationDelivery" ADD COLUMN "body" TEXT;
CREATE INDEX "NotificationDelivery_incidentId_createdAt_idx" ON "NotificationDelivery"("incidentId", "createdAt");
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_incidentId_fkey"
  FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_alert_or_incident_check"
  CHECK ("alertId" IS NOT NULL OR "incidentId" IS NOT NULL);
