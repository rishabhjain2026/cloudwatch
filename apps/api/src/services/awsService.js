import {
  CloudWatchClient,
  GetMetricStatisticsCommand,
} from '@aws-sdk/client-cloudwatch';
import { DescribeInstancesCommand, EC2Client } from '@aws-sdk/client-ec2';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';

const region = env.AWS_REGION || process.env.AWS_DEFAULT_REGION;
let clients;

function getClients() {
  if (!region) {
    const error = new Error('AWS region is not configured. Set AWS_REGION in apps/api/.env.');
    error.code = 'AWS_REGION_MISSING';
    throw error;
  }
  clients ??= {
    ec2: new EC2Client({ region }),
    cloudWatch: new CloudWatchClient({ region }),
  };
  return clients;
}

function classifyAwsError(error) {
  const code = error?.name || error?.Code || error?.code || '';
  const message = error?.message || '';
  if (/UnrecognizedClient|InvalidClientToken|InvalidAccessKeyId|SignatureDoesNotMatch|AuthFailure|ExpiredToken|NoCredentialProviders|CredentialsProviderError/i.test(`${code} ${message}`)) {
    return { status: 'invalid_credentials', message: 'AWS credentials are missing, invalid, or expired.' };
  }
  if (/AccessDenied|UnauthorizedOperation|AuthorizationError|not authorized/i.test(`${code} ${message}`)) {
    return { status: 'missing_permissions', message: 'The configured AWS identity lacks permission for this operation.' };
  }
  if (code === 'AWS_REGION_MISSING') return { status: 'not_configured', message };
  return { status: 'unavailable', message: 'AWS could not be reached. Check credentials, region, and network connectivity.' };
}

export async function getAwsConnectionStatus() {
  if (!region) return { status: 'not_configured', region: null, message: 'Set AWS_REGION in apps/api/.env.' };
  try {
    const { ec2 } = getClients();
    await ec2.send(new DescribeInstancesCommand({ MaxResults: 5 }));
    return { status: 'connected', region, message: 'AWS EC2 is reachable.' };
  } catch (error) {
    return { ...classifyAwsError(error), region };
  }
}

function flattenInstances(reservations = []) {
  return reservations.flatMap((reservation) => reservation.Instances || []);
}

function serverStatus(state) {
  if (state === 'running') return 'HEALTHY';
  if (state === 'stopped' || state === 'terminated') return 'OFFLINE';
  if (state === 'stopping' || state === 'pending' || state === 'shutting-down') return 'WARNING';
  return 'UNKNOWN';
}

async function upsertInstance(instance) {
  const instanceId = instance.InstanceId;
  if (!instanceId) return null;
  const tags = Object.fromEntries((instance.Tags || []).map(({ Key, Value }) => [Key, Value]));
  const state = instance.State?.Name || 'unknown';
  const data = {
    name: tags.Name || instanceId,
    hostname: instance.PrivateDnsName || null,
    os: instance.PlatformDetails || instance.Platform || null,
    environment: tags.Environment || tags.environment || null,
    region,
    provider: 'AWS',
    awsState: state,
    awsInstanceType: instance.InstanceType || null,
    awsAvailabilityZone: instance.Placement?.AvailabilityZone || null,
    awsLaunchTime: instance.LaunchTime || null,
    ipAddress: instance.PrivateIpAddress || null,
    status: serverStatus(state),
    isDemo: false,
    awsSyncedAt: new Date(),
  };
  return prisma.server.upsert({
    where: { awsInstanceId: instanceId },
    create: { ...data, awsInstanceId: instanceId },
    update: data,
  });
}

const metrics = [
  { name: 'CPUUtilization', kind: 'CPU', statistic: 'Average', unit: 'Percent' },
  { name: 'NetworkIn', kind: 'NET_IN', statistic: 'Sum', unit: 'Bytes' },
  { name: 'NetworkOut', kind: 'NET_OUT', statistic: 'Sum', unit: 'Bytes' },
];

async function collectMetrics(instanceId, serverId, cloudWatch) {
  const end = new Date();
  const start = new Date(end.getTime() - 15 * 60 * 1000);
  let collected = 0;
  const issues = [];
  for (const metric of metrics) {
    try {
      const response = await cloudWatch.send(new GetMetricStatisticsCommand({
        Namespace: 'AWS/EC2',
        MetricName: metric.name,
        Dimensions: [{ Name: 'InstanceId', Value: instanceId }],
        StartTime: start,
        EndTime: end,
        Period: 300,
        Statistics: [metric.statistic],
        Unit: metric.unit,
      }));
      for (const point of response.Datapoints || []) {
        const value = point[metric.statistic];
        if (typeof value !== 'number' || !point.Timestamp) continue;
        const timestamp = point.Timestamp;
        const exists = await prisma.metricSample.findFirst({
          where: { serverId, kind: metric.kind, collectedAt: timestamp },
          select: { id: true },
        });
        if (exists) continue;
        await prisma.metricSample.create({
          data: {
            serverId,
            kind: metric.kind,
            value,
            unit: metric.kind === 'CPU' ? '%' : 'Bytes / 5 min',
            meta: { source: 'cloudwatch', metric: metric.name, statistic: metric.statistic },
            collectedAt: timestamp,
          },
        });
        collected += 1;
      }
    } catch (error) {
      const classified = classifyAwsError(error);
      issues.push({ metric: metric.name, status: classified.status, message: classified.message });
      if (classified.status === 'missing_permissions' || classified.status === 'invalid_credentials') break;
    }
  }
  return { collected, issues };
}

export async function syncAwsInstances() {
  const { ec2, cloudWatch } = getClients();
  const instances = [];
  let nextToken;
  do {
    const page = await ec2.send(new DescribeInstancesCommand({ NextToken: nextToken }));
    instances.push(...flattenInstances(page.Reservations));
    nextToken = page.NextToken;
  } while (nextToken);

  let updated = 0;
  let metricsStored = 0;
  const metricIssues = [];
  for (const instance of instances) {
    const server = await upsertInstance(instance);
    if (!server || instance.State?.Name !== 'running') continue;
    const result = await collectMetrics(instance.InstanceId, server.id, cloudWatch);
    metricsStored += result.collected;
    metricIssues.push(...result.issues.map((issue) => ({ instanceId: instance.InstanceId, ...issue })));
    updated += 1;
  }

  return {
    status: metricIssues.length ? 'partial' : 'connected',
    region,
    discovered: instances.length,
    running: instances.filter((instance) => instance.State?.Name === 'running').length,
    metricsStored,
    metricIssues,
    syncedAt: new Date().toISOString(),
    processedRunningInstances: updated,
  };
}

export function awsErrorStatus(error) {
  return classifyAwsError(error);
}
