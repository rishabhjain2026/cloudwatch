import {
  GetIndexCommand,
  GetViewCommand,
  ListIndexesCommand,
  ListSupportedResourceTypesCommand,
  SearchCommand,
} from '@aws-sdk/client-resource-explorer-2';
import { sendWithRetry } from './client.js';

async function getIndexes(clientForRegion, regions, onError) {
  const indexes = [];
  for (let offset = 0; offset < regions.length; offset += 20) {
    let nextToken;
    do {
      const page = await sendWithRetry(clientForRegion(regions[0]), new ListIndexesCommand({
        Regions: regions.slice(offset, offset + 20),
        NextToken: nextToken,
      }));
      indexes.push(...(page.Indexes || []));
      nextToken = page.NextToken;
    } while (nextToken);
  }
  const detailedIndexes = [];
  for (const index of indexes) {
    try {
      const details = await sendWithRetry(clientForRegion(index.Region), new GetIndexCommand({}));
      detailedIndexes.push({ ...index, State: details.State, ReplicatingFrom: details.ReplicatingFrom || [] });
    } catch (error) {
      onError({ service: 'resource-explorer-2', region: index.Region, operation: 'GetIndex', error });
      detailedIndexes.push({ ...index, State: 'UNKNOWN' });
    }
  }
  return detailedIndexes;
}

async function getSupportedTypes(resourceExplorer) {
  const resourceTypes = [];
  let nextToken;
  do {
    const page = await sendWithRetry(resourceExplorer, new ListSupportedResourceTypesCommand({ NextToken: nextToken }));
    resourceTypes.push(...(page.ResourceTypes || []));
    nextToken = page.NextToken;
  } while (nextToken);
  return resourceTypes;
}

function resourceName(resource) {
  for (const property of resource.Properties || []) {
    const name = (property.Data || []).find((entry) => entry.Key === 'Name')?.Value;
    if (typeof name === 'string' && name.trim()) return name.trim();
  }
  const arnParts = (resource.Arn || '').split(':');
  const resourcePart = arnParts.slice(5).join(':');
  return resourcePart.split('/').filter(Boolean).at(-1) || resource.ResourceType || 'AWS resource';
}

export function normalizeResource(resource, fallbackRegion, accountId) {
  if (resource.OwningAccountId && resource.OwningAccountId !== accountId) return null;
  const service = String(resource.Service || resource.ResourceType?.split(':')[0] || 'unknown').toLowerCase();
  const resourceType = String(resource.ResourceType || `${service}:unknown`).toLowerCase();
  const arn = resource.Arn || null;
  const region = resource.Region && resource.Region !== 'global' ? resource.Region : (resource.Region || fallbackRegion);
  const resourceId = arn || `${resourceType}:${resourceName(resource)}`;
  const identity = arn || `${region}:${resourceId}`;
  return {
    accountId,
    identity,
    arn,
    service,
    resourceType,
    resourceId,
    name: resourceName(resource),
    region,
    status: 'reported',
    metadata: {
      enrichmentStatus: 'resource-explorer-only',
      lastReportedAt: resource.LastReportedAt || null,
    },
  };
}

export async function discoverWithResourceExplorer({ clientForRegion, regions, accountId, onError }) {
  const indexes = [];
  let supportedResourceTypes = [];
  let indexError = null;
  let supportedTypeError = null;
  try {
    indexes.push(...await getIndexes(clientForRegion, regions, onError));
  } catch (error) {
    indexError = error;
    onError({ service: 'resource-explorer-2', region: regions[0], operation: 'ListIndexes', error });
  }
  try {
    supportedResourceTypes = await getSupportedTypes(clientForRegion(regions[0]));
  } catch (error) {
    supportedTypeError = error;
    onError({ service: 'resource-explorer-2', region: regions[0], operation: 'ListSupportedResourceTypes', error });
  }

  const indexesByRegion = new Map(indexes.map((index) => [index.Region, index]));
  const incompleteRegions = regions.filter((region) => {
    const index = indexesByRegion.get(region);
    return !index || String(index.State || '').toUpperCase() !== 'ACTIVE';
  });
  const resources = new Map();
  const incompleteSearchRegions = [];
  let truncated = false;
  const viewFilters = [];
  for (const region of regions) {
    try {
      let nextToken;
      let complete = true;
      let viewChecked = false;
      do {
        const page = await sendWithRetry(clientForRegion(region), new SearchCommand({
          QueryString: '',
          MaxResults: 1000,
          NextToken: nextToken,
        }));
        for (const item of page.Resources || []) {
          const normalized = normalizeResource(item, region, accountId);
          if (normalized) resources.set(normalized.identity, normalized);
        }
        if (!viewChecked && page.ViewArn) {
          viewChecked = true;
          try {
            const viewResponse = await sendWithRetry(clientForRegion(region), new GetViewCommand({ ViewArn: page.ViewArn }));
            const filterString = viewResponse.View?.Filters?.FilterString || '';
            if (filterString.trim()) {
              viewFilters.push({ region, filtered: true });
              complete = false;
            }
          } catch (error) {
            complete = false;
            onError({ service: 'resource-explorer-2', region, operation: 'GetView', error });
          }
        } else if (!page.ViewArn) {
          complete = false;
        }
        if (page.Count?.Complete === false) complete = false;
        nextToken = page.NextToken;
      } while (nextToken);
      if (!complete) {
        truncated = true;
        incompleteSearchRegions.push(region);
      }
    } catch (error) {
      incompleteSearchRegions.push(region);
      onError({ service: 'resource-explorer-2', region, operation: 'Search', error });
    }
  }

  const supported = new Set(supportedResourceTypes.map((item) => item.ResourceType?.toLowerCase()).filter(Boolean));
  const unsupportedResourceTypes = [...new Set([...resources.values()]
    .map((resource) => resource.resourceType)
    .filter((type) => supported.size && !supported.has(type)))];
  const coverageComplete = !indexError && !supportedTypeError && incompleteRegions.length === 0 && incompleteSearchRegions.length === 0 && !truncated;
  return {
    resources: [...resources.values()],
    indexes,
    supportedResourceTypes,
    unsupportedResourceTypes,
    viewFilters,
    incompleteRegions: [...new Set([...incompleteRegions, ...incompleteSearchRegions])],
    coverageComplete,
    aggregatorRegion: indexes.find((index) => index.Type === 'AGGREGATOR')?.Region || null,
    errors: { indexError, supportedTypeError },
  };
}
