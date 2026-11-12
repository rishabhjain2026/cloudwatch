import { GetMetricStatisticsCommand } from '@aws-sdk/client-cloudwatch';
import { DescribeInstancesCommand, DescribeRegionsCommand } from '@aws-sdk/client-ec2';
import { sendWithRetry } from './client.js';

export async function listEnabledRegions(ec2) {
  const regions = [];
  let nextToken;
  do {
    const response = await sendWithRetry(ec2, new DescribeRegionsCommand({ AllRegions: true, NextToken: nextToken }));
    for (const item of response.Regions || []) {
      if (['opted-in', 'opt-in-not-required'].includes(item.OptInStatus)) regions.push(item.RegionName);
    }
    nextToken = response.NextToken;
  } while (nextToken);
  return regions.filter(Boolean);
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

async function getStatusChecks(cloudWatch, region, instanceId) {
  const end = new Date();
  const start = new Date(end.getTime() - 15 * 60 * 1000);
  const definitions = [
    ['StatusCheckFailed', 'combined'],
    ['StatusCheckFailed_Instance', 'instance'],
    ['StatusCheckFailed_System', 'system'],
  ];
  const statusChecks = {};
  const issues = [];
  for (const [metricName, key] of definitions) {
    try {
      const response = await sendWithRetry(cloudWatch, new GetMetricStatisticsCommand({
        Namespace: 'AWS/EC2',
        MetricName: metricName,
        Dimensions: [{ Name: 'InstanceId', Value: instanceId }],
        StartTime: start,
        EndTime: end,
        Period: 300,
        Statistics: ['Maximum'],
        Unit: 'Count',
      }));
      const point = (response.Datapoints || []).sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp))[0];
      statusChecks[key] = point ? { value: point.Maximum, at: point.Timestamp } : null;
    } catch (error) {
      issues.push({ operation: metricName, error });
      statusChecks[key] = null;
    }
  }
  return { statusChecks, issues };
}

export async function discoverEc2Region({ ec2, cloudWatch, prisma, region, accountId, onError }) {
  const instances = [];
  let nextToken;
  do {
    const page = await sendWithRetry(ec2, new DescribeInstancesCommand({ NextToken: nextToken }));
    instances.push(...flattenInstances(page.Reservations));
    nextToken = page.NextToken;
  } while (nextToken);

  const resources = [];
  let metricsStored = 0;
  for (const instance of instances) {
    const instanceId = instance.InstanceId;
    if (!instanceId) continue;
    const tags = Object.fromEntries((instance.Tags || []).filter((tag) => tag.Key).map(({ Key, Value }) => [Key, Value]));
    const state = instance.State?.Name || 'unknown';
    const name = tags.Name || instanceId;
    const arn = `arn:aws:ec2:${region}:${accountId}:instance/${instanceId}`;
    const statusChecks = state === 'running' ? await getStatusChecks(cloudWatch, region, instanceId) : { statusChecks: {}, issues: [] };
      for (const issue of statusChecks.issues) onError({ service: 'ec2-cloudwatch', region, resourceId: instanceId, operation: issue.operation, error: issue.error });

    const serverData = {
      name,
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
      publicIpAddress: instance.PublicIpAddress || null,
      status: serverStatus(state),
      isDemo: false,
      awsSyncedAt: new Date(),
    };
    const server = await prisma.server.upsert({
      where: { awsInstanceId: instanceId },
      create: { ...serverData, awsInstanceId: instanceId },
      update: serverData,
    });

    if (state === 'running') {
      for (const metric of [
        { name: 'CPUUtilization', kind: 'CPU', statistic: 'Average', unit: 'Percent', storedUnit: '%' },
        { name: 'NetworkIn', kind: 'NET_IN', statistic: 'Sum', unit: 'Bytes', storedUnit: 'Bytes / 5 min' },
        { name: 'NetworkOut', kind: 'NET_OUT', statistic: 'Sum', unit: 'Bytes', storedUnit: 'Bytes / 5 min' },
      ]) {
        try {
          const end = new Date();
          const response = await sendWithRetry(cloudWatch, new GetMetricStatisticsCommand({
            Namespace: 'AWS/EC2',
            MetricName: metric.name,
            Dimensions: [{ Name: 'InstanceId', Value: instanceId }],
            StartTime: new Date(end.getTime() - 15 * 60 * 1000),
            EndTime: end,
            Period: 300,
            Statistics: [metric.statistic],
            Unit: metric.unit,
          }));
          for (const point of response.Datapoints || []) {
            const value = point[metric.statistic];
            if (typeof value !== 'number' || !point.Timestamp) continue;
            const exists = await prisma.metricSample.findFirst({
              where: { serverId: server.id, kind: metric.kind, collectedAt: point.Timestamp },
              select: { id: true },
            });
            if (exists) continue;
            await prisma.metricSample.create({
              data: {
                serverId: server.id,
                kind: metric.kind,
                value,
                unit: metric.storedUnit,
                meta: { source: 'cloudwatch', metric: metric.name, statistic: metric.statistic },
                collectedAt: point.Timestamp,
              },
            });
            metricsStored += 1;
          }
        } catch (error) {
          onError({ service: 'ec2-cloudwatch', region, resourceId: instanceId, operation: metric.name, error });
        }
      }
    }

    resources.push({
      accountId,
      identity: arn,
      arn,
      service: 'ec2',
      resourceType: 'ec2:instance',
      resourceId: instanceId,
      name,
      region,
      status: state,
      metadata: {
        instanceType: instance.InstanceType || null,
        availabilityZone: instance.Placement?.AvailabilityZone || null,
        launchTime: instance.LaunchTime?.toISOString?.() || null,
        privateIpAddress: instance.PrivateIpAddress || null,
        publicIpAddress: instance.PublicIpAddress || null,
        platformDetails: instance.PlatformDetails || instance.Platform || null,
        statusChecks: statusChecks.statusChecks,
        enrichmentStatus: 'service-api',
      },
    });
  }
  return { resources, metricsStored };
}
