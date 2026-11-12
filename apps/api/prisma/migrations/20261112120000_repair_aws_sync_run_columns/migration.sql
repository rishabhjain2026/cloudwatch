ALTER TABLE "AwsSyncRun"
ADD COLUMN IF NOT EXISTS "unintegratedResourceTypes" JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS "resourceExplorerStatus" JSONB;
