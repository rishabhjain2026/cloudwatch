ALTER TABLE "Server" ADD COLUMN "awsInstanceId" TEXT;
ALTER TABLE "Server" ADD COLUMN "awsState" TEXT;
ALTER TABLE "Server" ADD COLUMN "awsInstanceType" TEXT;
ALTER TABLE "Server" ADD COLUMN "awsAvailabilityZone" TEXT;
ALTER TABLE "Server" ADD COLUMN "awsLaunchTime" TIMESTAMP(3);
ALTER TABLE "Server" ADD COLUMN "awsSyncedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Server_awsInstanceId_key" ON "Server"("awsInstanceId");
