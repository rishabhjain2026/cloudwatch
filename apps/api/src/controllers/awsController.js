import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { ok, fail } from '../utils/response.js';

function publicMetadata(resource) {
  const metadata = resource.metadata || {};
  if (resource.service === 's3') {
    return {
      createdAt: metadata.createdAt ?? null,
      versioning: metadata.versioning ?? null,
      encryptionConfigured: (metadata.encryption || []).length > 0,
      publicAccessBlockConfigured: metadata.publicAccessBlock != null,
      lifecycleRuleCount: (metadata.lifecycle || []).length,
      enrichmentStatus: metadata.enrichmentStatus || 'unavailable',
    };
  }
  if (resource.service === 'ec2') {
    return {
      instanceType: metadata.instanceType ?? null,
      availabilityZone: metadata.availabilityZone ?? null,
      launchTime: metadata.launchTime ?? null,
      platformDetails: metadata.platformDetails ?? null,
      statusChecks: metadata.statusChecks ?? {},
      enrichmentStatus: metadata.enrichmentStatus || 'unavailable',
    };
  }
  return {
    enrichmentStatus: metadata.enrichmentStatus || 'resource-explorer-only',
    lastReportedAt: metadata.lastReportedAt ?? null,
  };
}

function publicResource(resource) {
  const staleAfterMs = env.AWS_SYNC_INTERVAL_MINUTES * 60_000 * 2;
  const isStale = !resource.missingSince && Date.now() - new Date(resource.lastDiscoveredAt).getTime() > staleAfterMs;
  return {
    id: resource.id,
    service: resource.service,
    resourceType: resource.resourceType,
    resourceId: resource.resourceId,
    name: resource.name,
    region: resource.region,
    status: resource.missingSince ? 'missing' : isStale ? 'stale' : (resource.status || 'unknown'),
    lastDiscoveredAt: resource.lastDiscoveredAt,
    missingSince: resource.missingSince,
    metadata: publicMetadata(resource),
  };
}

export async function awsResourcesHandler(req, res) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 25));
  const where = {};
  if (req.query.service) where.service = String(req.query.service).toLowerCase();
  if (req.query.region) where.region = req.query.region === 'unknown' ? null : String(req.query.region);
  if (req.query.resourceType) where.resourceType = String(req.query.resourceType).toLowerCase();
  if (req.query.status === 'missing') where.missingSince = { not: null };
  else if (req.query.status === 'stale') {
    where.missingSince = null;
    where.lastDiscoveredAt = { lt: new Date(Date.now() - env.AWS_SYNC_INTERVAL_MINUTES * 60_000 * 2) };
  }
  else if (req.query.status) where.status = String(req.query.status);
  if (req.query.search) {
    const search = String(req.query.search).slice(0, 120);
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { resourceId: { contains: search, mode: 'insensitive' } },
      { resourceType: { contains: search, mode: 'insensitive' } },
    ];
  }
  const [total, resources] = await Promise.all([
    prisma.awsResource.count({ where }),
    prisma.awsResource.findMany({
      where,
      orderBy: [{ missingSince: 'asc' }, { service: 'asc' }, { name: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return ok(res, resources.map(publicResource), { page, pageSize, total });
}

export async function awsResourceDetailHandler(req, res) {
  const resource = await prisma.awsResource.findUnique({ where: { id: req.params.id } });
  if (!resource) return fail(res, 404, 'NOT_FOUND', 'AWS resource not found');
  return ok(res, publicResource(resource));
}

export async function awsResourceSummaryHandler(_req, res) {
  const [total, missing, byService, byRegion, byResourceType, byStatus, latestSync, latestSuccessfulSync] = await Promise.all([
    prisma.awsResource.count(),
    prisma.awsResource.count({ where: { missingSince: { not: null } } }),
    prisma.awsResource.groupBy({ by: ['service'], _count: { _all: true }, orderBy: { service: 'asc' } }),
    prisma.awsResource.groupBy({ by: ['region'], _count: { _all: true }, orderBy: { region: 'asc' } }),
    prisma.awsResource.groupBy({ by: ['resourceType'], _count: { _all: true }, orderBy: { resourceType: 'asc' } }),
    prisma.awsResource.groupBy({ by: ['status'], _count: { _all: true }, orderBy: { status: 'asc' } }),
    prisma.awsSyncRun.findFirst({ orderBy: { startedAt: 'desc' } }),
    prisma.awsSyncRun.findFirst({ where: { status: 'success' }, orderBy: { completedAt: 'desc' } }),
  ]);
  return ok(res, {
    total,
    missing,
    byService: byService.map((entry) => ({ service: entry.service, count: entry._count._all })),
    byRegion: byRegion.map((entry) => ({ region: entry.region || 'unknown', count: entry._count._all })),
    byResourceType: byResourceType.map((entry) => ({ resourceType: entry.resourceType, count: entry._count._all })),
    byStatus: byStatus.map((entry) => ({ status: entry.status, count: entry._count._all })),
    lastSuccessfulSyncAt: latestSuccessfulSync?.completedAt ?? null,
    latestSync: latestSync ? {
      status: latestSync.status,
      coverageStatus: latestSync.coverageStatus,
      startedAt: latestSync.startedAt,
      completedAt: latestSync.completedAt,
      resourcesDiscovered: latestSync.resourcesDiscovered,
      resourcesCreated: latestSync.resourcesCreated,
      resourcesUpdated: latestSync.resourcesUpdated,
      servicesQueried: latestSync.servicesQueried,
      serviceErrors: latestSync.serviceErrors,
      unsupportedResourceTypes: latestSync.unsupportedResourceTypes,
      unintegratedResourceTypes: latestSync.unintegratedResourceTypes,
      incompleteRegions: latestSync.incompleteRegions,
      resourceExplorerStatus: latestSync.resourceExplorerStatus,
    } : null,
  });
}
