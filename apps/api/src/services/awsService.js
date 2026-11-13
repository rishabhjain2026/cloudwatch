import { GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';
import { classifyAwsError, configuredRegion, makeAwsClients, sendWithRetry } from './aws/client.js';
import { discoverEc2Region, listEnabledRegions } from './aws/ec2Service.js';
import { evaluateSignal } from './alertService.js';
import { discoverS3Buckets } from './aws/s3Service.js';
import { discoverWithResourceExplorer } from './aws/resourceExplorerService.js';

let activeSync = null;

export async function getAwsConnectionStatus() {
  if (!configuredRegion) {
    return { status: 'not_configured', region: null, message: 'Set AWS_REGION in apps/api/.env.' };
  }
  try {
    const sts = makeAwsClients(configuredRegion).sts;
    const identity = await sendWithRetry(sts, new GetCallerIdentityCommand({}));
    return {
      status: 'connected',
      region: configuredRegion,
      accountId: identity.Account || null,
      arn: identity.Arn || null,
      message: 'AWS credentials are valid.',
    };
  } catch (error) {
    return { ...classifyAwsError(error), region: configuredRegion };
  }
}

export function syncAwsResources(trigger = 'manual') {
  if (activeSync) return activeSync;
  activeSync = runAwsSync(trigger).finally(() => { activeSync = null; });
  return activeSync;
}

function recordServiceError(errors, detail) {
  const classified = classifyAwsError(detail.error);
  const key = [detail.service, detail.region || 'global', detail.operation, classified.status].join('|');
  const existing = errors.get(key);
  if (existing) existing.affectedResources += 1;
  else errors.set(key, {
    service: detail.service,
    region: detail.region || null,
    operation: detail.operation,
    status: classified.status,
    code: classified.code,
    message: classified.message,
    affectedResources: 1,
  });
}

function mergeResource(resourceMap, resource) {
  const existing = resourceMap.get(resource.identity);
  if (!existing) {
    resourceMap.set(resource.identity, resource);
    return;
  }
  const keepEnrichedMetadata = existing.metadata?.enrichmentStatus === 'service-api'
    && resource.metadata?.enrichmentStatus === 'resource-explorer-only';
  resourceMap.set(resource.identity, {
    ...existing,
    ...resource,
    metadata: keepEnrichedMetadata
      ? { ...resource.metadata, ...existing.metadata }
      : { ...existing.metadata, ...resource.metadata },
  });
}

async function persistResources(accountId, resources) {
  const unique = [...new Map(resources.map((resource) => [resource.identity, resource])).values()];
  let created = 0;
  let updated = 0;
  const now = new Date();
  for (let offset = 0; offset < unique.length; offset += 100) {
    const batch = unique.slice(offset, offset + 100);
    const identities = batch.map((resource) => resource.identity);
    const existingRecords = await prisma.awsResource.findMany({
      where: { accountId, identity: { in: identities } },
      select: { identity: true, metadata: true },
    });
    const existing = new Map(existingRecords.map((record) => [record.identity, record]));
    await prisma.$transaction(batch.map((resource) => {
      const old = existing.get(resource.identity);
      const metadata = old?.metadata && resource.metadata?.enrichmentStatus === 'resource-explorer-only'
        && old.metadata?.enrichmentStatus === 'service-api'
        ? { ...resource.metadata, ...old.metadata }
        : { ...(old?.metadata || {}), ...(resource.metadata || {}) };
      if (old) updated += 1;
      else created += 1;
      return prisma.awsResource.upsert({
        where: { accountId_identity: { accountId, identity: resource.identity } },
        create: { ...resource, metadata, lastDiscoveredAt: now, missingSince: null },
        update: {
          ...resource,
          metadata,
          lastDiscoveredAt: now,
          missingSince: null,
        },
      });
    }));
  }
  return { resources: unique, created, updated };
}

async function markMissing(accountId, service, identities, complete) {
  if (!complete) return 0;
  const where = {
    accountId,
    service,
    missingSince: null,
    ...(identities.length ? { identity: { notIn: identities } } : {}),
  };
  const result = await prisma.awsResource.updateMany({ where, data: { missingSince: new Date() } });
  return result.count;
}

async function markExplorerResourcesMissing(accountId, identities, complete) {
  if (!complete) return 0;
  const result = await prisma.awsResource.updateMany({
    where: {
      accountId,
      service: { notIn: ['ec2', 's3'] },
      missingSince: null,
      ...(identities.length ? { identity: { notIn: identities } } : {}),
    },
    data: { missingSince: new Date() },
  });
  return result.count;
}

async function runAwsSync(trigger) {
  const run = await prisma.awsSyncRun.create({ data: { status: 'running', coverageStatus: 'unknown' } });
  const errors = new Map();
  const onError = (detail) => recordServiceError(errors, detail);
  const queried = new Map();
  const resourceMap = new Map();
  const failedEc2Regions = new Set();
  let accountId = null;
  let regionDiscoveryComplete = false;
  let resourceExplorerCoverageComplete = false;
  let supportedResourceTypes = [];
  let unsupportedResourceTypes = [];
  let resourceExplorerViewFilters = [];
  let incompleteRegions = [];
  let metricsStored = 0;
  let s3ListComplete = false;
  let ec2Resources = [];
  let s3Resources = [];
  let ec2RegionCount = 0;
  let s3BucketCount = 0;

  try {
    if (!configuredRegion) {
      const error = new Error('AWS region is not configured. Set AWS_REGION in apps/api/.env.');
      error.code = 'AWS_REGION_MISSING';
      throw error;
    }
    const clients = makeAwsClients(configuredRegion);
    const caller = await sendWithRetry(clients.sts, new GetCallerIdentityCommand({}));
    accountId = caller.Account;
    if (!accountId) throw new Error('AWS did not return an account identifier.');
    queried.set('sts', 'success');

    let regions = [configuredRegion];
    try {
      regions = await listEnabledRegions(clients.ec2);
      regionDiscoveryComplete = regions.length > 0;
      if (!regions.length) regions = [configuredRegion];
      queried.set('ec2-regions', 'success');
    } catch (error) {
      onError({ service: 'ec2', region: configuredRegion, operation: 'DescribeRegions', error });
      queried.set('ec2-regions', 'partial');
    }

    const explorer = await discoverWithResourceExplorer({
      clientForRegion: (region) => makeAwsClients(region).resourceExplorer,
      regions,
      accountId,
      onError,
    });
    explorer.resources.forEach((resource) => mergeResource(resourceMap, resource));
    resourceExplorerCoverageComplete = explorer.coverageComplete;
    supportedResourceTypes = explorer.supportedResourceTypes;
    unsupportedResourceTypes = explorer.unsupportedResourceTypes;
    resourceExplorerViewFilters = explorer.viewFilters;
    incompleteRegions = explorer.incompleteRegions;
    queried.set('resource-explorer-2', explorer.errors.indexError || explorer.errors.supportedTypeError ? 'partial' : explorer.coverageComplete ? 'success' : 'partial');
    const resourceExplorerStatus = {
      coverageComplete: resourceExplorerCoverageComplete,
      aggregatorRegion: explorer.aggregatorRegion,
      indexRegions: explorer.indexes.map((index) => ({ region: index.Region, type: index.Type, state: index.State })),
      viewFilters: resourceExplorerViewFilters,
      supportedResourceTypeCount: supportedResourceTypes.length,
    };

    for (const region of regions) {
      const regionalClients = makeAwsClients(region);
      try {
        const result = await discoverEc2Region({
          ec2: regionalClients.ec2,
          cloudWatch: regionalClients.cloudWatch,
          prisma,
          region,
          accountId,
          onError,
        });
        ec2Resources.push(...result.resources);
        metricsStored += result.metricsStored;
      } catch (error) {
        failedEc2Regions.add(region);
        onError({ service: 'ec2', region, operation: 'DescribeInstances', error });
      }
    }
    ec2RegionCount = regions.length - failedEc2Regions.size;
    ec2Resources.forEach((resource) => mergeResource(resourceMap, resource));
    queried.set('ec2', failedEc2Regions.size ? (ec2RegionCount ? 'partial' : 'failed') : 'success');
    queried.set('ec2-cloudwatch', [...errors.values()].some((issue) => issue.service === 'ec2-cloudwatch') ? 'partial' : 'success');

    try {
      const result = await discoverS3Buckets({
        s3: clients.s3,
        s3ForRegion: (region) => makeAwsClients(region).s3,
        cloudWatchForRegion: (region) => makeAwsClients(region).cloudWatch,
        accountId,
        onError,
      });
      s3Resources = result.resources;
      s3BucketCount = result.bucketsListed;
      s3ListComplete = true;
      s3Resources.forEach((resource) => mergeResource(resourceMap, resource));
      queried.set('s3', [...errors.values()].some((issue) => issue.service === 's3') ? 'partial' : 'success');
      queried.set('s3-cloudwatch', [...errors.values()].some((issue) => issue.service === 's3-cloudwatch') ? 'partial' : 'success');
    } catch (error) {
      onError({ service: 's3', region: null, operation: 'ListBuckets', error });
      queried.set('s3', 'failed');
    }

    const persisted = await persistResources(accountId, [...resourceMap.values()]);
    const unintegratedResourceTypes = [...new Set(persisted.resources
      .filter((resource) => resource.metadata?.enrichmentStatus !== 'service-api')
      .map((resource) => resource.resourceType))];
    const missingEc2 = await markMissing(
      accountId,
      'ec2',
      ec2Resources.map((resource) => resource.identity),
      regionDiscoveryComplete && failedEc2Regions.size === 0,
    );
    const missingS3 = await markMissing(accountId, 's3', s3Resources.map((resource) => resource.identity), s3ListComplete);
    const missingExplorer = await markExplorerResourcesMissing(
      accountId,
      explorer.resources.map((resource) => resource.identity),
      resourceExplorerCoverageComplete,
    );
    const serviceErrors = [...errors.values()];
    const coverageComplete = regionDiscoveryComplete && resourceExplorerCoverageComplete && failedEc2Regions.size === 0;
    const status = serviceErrors.length === 0 && coverageComplete ? 'success'
      : persisted.resources.length ? 'partial' : 'failed';
    const completedAt = new Date();
    const servicesQueried = [...queried.entries()].map(([service, serviceStatus]) => ({ service, status: serviceStatus }));
    const result = {
      id: run.id,
      trigger,
      status,
      coverageStatus: coverageComplete ? 'complete' : 'partial',
      accountId,
      region: configuredRegion,
      regionsQueried: regions.length,
      resourcesDiscovered: persisted.resources.length,
      resourcesCreated: persisted.created,
      resourcesUpdated: persisted.updated,
      resourcesMarkedMissing: missingEc2 + missingS3 + missingExplorer,
      ec2Instances: ec2Resources.length,
      s3Buckets: s3BucketCount,
      metricsStored,
      servicesQueried,
      serviceErrors,
      unsupportedResourceTypes,
      unintegratedResourceTypes,
      supportedResourceTypeCount: supportedResourceTypes.length,
      incompleteRegions,
      resourceExplorerStatus,
      syncedAt: completedAt.toISOString(),
    };
    await prisma.awsSyncRun.update({
      where: { id: run.id },
      data: {
        status,
        coverageStatus: result.coverageStatus,
        completedAt,
        resourcesDiscovered: result.resourcesDiscovered,
        resourcesCreated: result.resourcesCreated,
        resourcesUpdated: result.resourcesUpdated,
        servicesQueried,
        serviceErrors,
        unsupportedResourceTypes,
        unintegratedResourceTypes,
        incompleteRegions,
        resourceExplorerStatus,
      },
    });
    await evaluateSignal({ key:`aws-collection-failure:${accountId}`, alertType:'AWS_COLLECTION_FAILURE', category:'AWS', resourceType:'AWS_ACCOUNT', resourceId:accountId, resourceName:`AWS account ${accountId}`, title:'AWS discovery incomplete', description:`AWS resource discovery status is ${status}.`, triggered:status!=='success', severity:status==='failed'?'CRITICAL':'HIGH', meta:{coverageStatus:result.coverageStatus} });
    return result;
  } catch (error) {
    const classified = classifyAwsError(error);
    onError({ service: 'aws', region: configuredRegion, operation: 'sync', error });
    const serviceErrors = [...errors.values()];
    await prisma.awsSyncRun.update({
      where: { id: run.id },
      data: {
        status: 'failed',
        coverageStatus: 'unavailable',
        completedAt: new Date(),
        serviceErrors,
        error: classified.message,
        servicesQueried: [...queried.entries()].map(([service, status]) => ({ service, status })),
      },
    });
    await evaluateSignal({ key:`aws-collection-failure:${accountId || 'unknown'}`, alertType:'AWS_COLLECTION_FAILURE', category:'AWS', resourceType:'AWS_ACCOUNT', resourceId:accountId || 'unknown', resourceName:accountId ? `AWS account ${accountId}` : 'AWS account', title:'AWS discovery failed', description:classified.message, triggered:true, severity:'CRITICAL' });
    return {
      id: run.id,
      trigger,
      status: 'failed',
      coverageStatus: 'unavailable',
      serviceErrors,
      message: classified.message,
    };
  }
}

export async function getLatestAwsSync() {
  return prisma.awsSyncRun.findFirst({ orderBy: { startedAt: 'desc' } });
}

export function awsErrorStatus(error) {
  return classifyAwsError(error);
}
