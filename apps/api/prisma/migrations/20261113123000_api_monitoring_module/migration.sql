ALTER TABLE "ApiMonitor"
  ADD COLUMN "expectedContent" TEXT,
  ADD COLUMN "timeoutMs" INTEGER NOT NULL DEFAULT 10000,
  ADD COLUMN "warningLatencyMs" INTEGER,
  ADD COLUMN "criticalLatencyMs" INTEGER,
  ADD COLUMN "sslWarnDays" INTEGER NOT NULL DEFAULT 14,
  ADD COLUMN "requestConfigEncrypted" TEXT,
  ADD COLUMN "nextCheckAt" TIMESTAMP(3),
  ADD COLUMN "checkLockedUntil" TIMESTAMP(3);

CREATE INDEX "ApiMonitor_enabled_nextCheckAt_idx" ON "ApiMonitor"("enabled", "nextCheckAt");
CREATE INDEX "ApiMonitor_checkLockedUntil_idx" ON "ApiMonitor"("checkLockedUntil");

ALTER TABLE "ApiCheck"
  ADD COLUMN "errorType" TEXT,
  ADD COLUMN "timedOut" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "expectedStatusMatched" BOOLEAN,
  ADD COLUMN "contentMatched" BOOLEAN,
  ADD COLUMN "sslIssuer" TEXT,
  ADD COLUMN "sslExpiresAt" TIMESTAMP(3),
  ADD COLUMN "sslValid" BOOLEAN;

CREATE INDEX "ApiCheck_checkedAt_success_idx" ON "ApiCheck"("checkedAt", "success");
