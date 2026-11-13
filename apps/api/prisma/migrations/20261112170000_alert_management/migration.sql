CREATE TYPE "AlertMemberType" AS ENUM ('INTERNAL', 'EXTERNAL');
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('PENDING', 'RETRYING', 'SENDING', 'SENT', 'FAILED');

ALTER TABLE "AlertRule"
  ADD COLUMN "description" TEXT,
  ADD COLUMN "category" TEXT NOT NULL DEFAULT 'INFRASTRUCTURE',
  ADD COLUMN "resourceType" TEXT,
  ADD COLUMN "resourceId" TEXT,
  ADD COLUMN "alertType" TEXT NOT NULL DEFAULT 'METRIC_THRESHOLD',
  ADD COLUMN "evaluationDurationSec" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "deletedAt" TIMESTAMP(3),
  ALTER COLUMN "metric" DROP NOT NULL,
  ALTER COLUMN "operator" SET DEFAULT 'gt',
  ALTER COLUMN "threshold" DROP NOT NULL;

ALTER TABLE "Alert"
  ADD COLUMN "category" TEXT NOT NULL DEFAULT 'INFRASTRUCTURE',
  ADD COLUMN "alertType" TEXT NOT NULL DEFAULT 'METRIC_THRESHOLD',
  ADD COLUMN "resourceType" TEXT,
  ADD COLUMN "resourceId" TEXT,
  ADD COLUMN "resourceName" TEXT,
  ADD COLUMN "deduplicationKey" TEXT,
  ADD COLUMN "evaluationDurationSec" INTEGER,
  ADD COLUMN "lastEvaluatedAt" TIMESTAMP(3),
  ADD COLUMN "lastNotifiedAt" TIMESTAMP(3),
  ADD COLUMN "occurrenceCount" INTEGER NOT NULL DEFAULT 1;

CREATE UNIQUE INDEX "Alert_deduplicationKey_key" ON "Alert"("deduplicationKey");
CREATE INDEX "Alert_category_alertType_status_triggeredAt_idx" ON "Alert"("category", "alertType", "status", "triggeredAt");
CREATE INDEX "Alert_resourceType_resourceId_status_idx" ON "Alert"("resourceType", "resourceId", "status");
CREATE INDEX "AlertRule_enabled_category_alertType_idx" ON "AlertRule"("enabled", "category", "alertType");
CREATE INDEX "AlertRule_resourceType_resourceId_idx" ON "AlertRule"("resourceType", "resourceId");

CREATE TABLE "AlertEvent" (
  "id" TEXT NOT NULL,
  "alertId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "meta" JSONB,
  "actorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AlertEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AlertEvent_alertId_createdAt_idx" ON "AlertEvent"("alertId", "createdAt");
CREATE INDEX "AlertEvent_type_createdAt_idx" ON "AlertEvent"("type", "createdAt");
ALTER TABLE "AlertEvent" ADD CONSTRAINT "AlertEvent_alertId_fkey"
  FOREIGN KEY ("alertId") REFERENCES "Alert"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AlertEvent" ADD CONSTRAINT "AlertEvent_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "AlertTeamMember" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "designation" TEXT,
  "memberType" "AlertMemberType" NOT NULL,
  "userId" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "preferences" JSONB NOT NULL DEFAULT '{"inApp":true,"email":true,"emailOnCritical":true,"emailOnWarning":true,"emailOnInfo":false,"emailOnResolution":false}'::jsonb,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AlertTeamMember_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AlertTeamMember_email_key" ON "AlertTeamMember"("email");
CREATE UNIQUE INDEX "AlertTeamMember_userId_key" ON "AlertTeamMember"("userId");
CREATE INDEX "AlertTeamMember_memberType_isActive_idx" ON "AlertTeamMember"("memberType", "isActive");
ALTER TABLE "AlertTeamMember" ADD CONSTRAINT "AlertTeamMember_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "AlertRoutingRule" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT,
  "resourceType" TEXT,
  "resourceId" TEXT,
  "alertType" TEXT,
  "severities" JSONB NOT NULL DEFAULT '["CRITICAL","HIGH","MEDIUM","LOW"]'::jsonb,
  "channels" JSONB NOT NULL DEFAULT '["IN_APP"]'::jsonb,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "isFallback" BOOLEAN NOT NULL DEFAULT false,
  "deletedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AlertRoutingRule_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AlertRoutingRule_enabled_category_priority_idx" ON "AlertRoutingRule"("enabled", "category", "priority");
CREATE INDEX "AlertRoutingRule_resourceType_resourceId_enabled_idx" ON "AlertRoutingRule"("resourceType", "resourceId", "enabled");
CREATE INDEX "AlertRoutingRule_isFallback_enabled_idx" ON "AlertRoutingRule"("isFallback", "enabled");
ALTER TABLE "AlertRoutingRule" ADD CONSTRAINT "AlertRoutingRule_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "AlertRoutingRecipient" (
  "routingRuleId" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AlertRoutingRecipient_pkey" PRIMARY KEY ("routingRuleId", "memberId")
);
CREATE INDEX "AlertRoutingRecipient_memberId_idx" ON "AlertRoutingRecipient"("memberId");
ALTER TABLE "AlertRoutingRecipient" ADD CONSTRAINT "AlertRoutingRecipient_routingRuleId_fkey"
  FOREIGN KEY ("routingRuleId") REFERENCES "AlertRoutingRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AlertRoutingRecipient" ADD CONSTRAINT "AlertRoutingRecipient_memberId_fkey"
  FOREIGN KEY ("memberId") REFERENCES "AlertTeamMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Notification"
  ADD COLUMN "alertId" TEXT,
  ADD COLUMN "deduplicationKey" TEXT;
CREATE UNIQUE INDEX "Notification_deduplicationKey_key" ON "Notification"("deduplicationKey");
CREATE INDEX "Notification_alertId_createdAt_idx" ON "Notification"("alertId", "createdAt");
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_alertId_fkey"
  FOREIGN KEY ("alertId") REFERENCES "Alert"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "NotificationDelivery" (
  "id" TEXT NOT NULL,
  "alertId" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "routingRuleId" TEXT,
  "channel" "NotificationChannel" NOT NULL,
  "recipientEmail" TEXT,
  "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "deduplicationKey" TEXT NOT NULL,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3),
  "lockedUntil" TIMESTAMP(3),
  "lastAttemptAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "lastError" TEXT,
  "eventType" TEXT NOT NULL DEFAULT 'ALERT_FIRING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NotificationDelivery_deduplicationKey_key" ON "NotificationDelivery"("deduplicationKey");
CREATE INDEX "NotificationDelivery_status_nextAttemptAt_idx" ON "NotificationDelivery"("status", "nextAttemptAt");
CREATE INDEX "NotificationDelivery_alertId_createdAt_idx" ON "NotificationDelivery"("alertId", "createdAt");
CREATE INDEX "NotificationDelivery_memberId_createdAt_idx" ON "NotificationDelivery"("memberId", "createdAt");
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_alertId_fkey"
  FOREIGN KEY ("alertId") REFERENCES "Alert"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_memberId_fkey"
  FOREIGN KEY ("memberId") REFERENCES "AlertTeamMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "NotificationDelivery" ADD CONSTRAINT "NotificationDelivery_routingRuleId_fkey"
  FOREIGN KEY ("routingRuleId") REFERENCES "AlertRoutingRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "NotificationAttempt" (
  "id" TEXT NOT NULL,
  "deliveryId" TEXT NOT NULL,
  "attempt" INTEGER NOT NULL,
  "status" "NotificationDeliveryStatus" NOT NULL,
  "errorCode" TEXT,
  "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NotificationAttempt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "NotificationAttempt_deliveryId_attempt_key" ON "NotificationAttempt"("deliveryId", "attempt");
CREATE INDEX "NotificationAttempt_attemptedAt_status_idx" ON "NotificationAttempt"("attemptedAt", "status");
ALTER TABLE "NotificationAttempt" ADD CONSTRAINT "NotificationAttempt_deliveryId_fkey"
  FOREIGN KEY ("deliveryId") REFERENCES "NotificationDelivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;
