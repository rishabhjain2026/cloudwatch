import {
  GetBucketEncryptionCommand,
  GetBucketLifecycleConfigurationCommand,
  GetBucketLocationCommand,
  GetPublicAccessBlockCommand,
  GetBucketVersioningCommand,
  ListBucketsCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { GetMetricStatisticsCommand, ListMetricsCommand } from '@aws-sdk/client-cloudwatch';
import { classifyAwsError, sendWithRetry } from './client.js';

function bucketRegion(location) {
  if (!location) return 'us-east-1';
  return location === 'EU' ? 'eu-west-1' : location;
}

function isMissingOptionalConfig(error) {
  return /NoSuchLifecycleConfiguration|NoSuchPublicAccessBlockConfiguration|ServerSideEncryptionConfigurationNotFound/i
    .test(`${error?.name || ''} ${error?.Code || ''} ${error?.code || ''}`);
}

async function optionalRequest(client, command, onError, context, absentValue = null) {
  try {
    return await sendWithRetry(client, command);
  } catch (error) {
    if (isMissingOptionalConfig(error)) return absentValue;
    onError({ service: 's3', ...context, error });
    return null;
  }
}

async function listAllBuckets(s3) {
  const buckets = [];
  let continuationToken;
  do {
    const page = await sendWithRetry(s3, new ListBucketsCommand({
      MaxBuckets: 1000,
      ContinuationToken: continuationToken,
    }));
    buckets.push(...(page.Buckets || []));
    continuationToken = page.ContinuationToken;
  } while (continuationToken);
  return buckets;
}

async function listS3MetricSeries(cloudWatch, bucketName, metricName) {
  const metrics = [];
  let nextToken;
  do {
    const page = await sendWithRetry(cloudWatch, new ListMetricsCommand({
      Namespace: 'AWS/S3',
      MetricName: metricName,
      Dimensions: [{ Name: 'BucketName', Value: bucketName }],
      NextToken: nextToken,
    }));
    metrics.push(...(page.Metrics || []));
    nextToken = page.NextToken;
  } while (nextToken);
  return metrics;
}

async function fetchS3Metrics(cloudWatch, bucketName, region, onError) {
  const end = new Date();
  const start = new Date(end.getTime() - 14 * 24 * 60 * 60 * 1000);
  const metricIssues = [];
  let objectCount = null;
  let sizeByStorageType = {};
  let metricsAsOf = null;
  try {
    const objectMetrics = await listS3MetricSeries(cloudWatch, bucketName, 'NumberOfObjects');
    const objectMetric = objectMetrics.find((metric) => metric.Dimensions?.some((dimension) => dimension.Name === 'StorageType' && dimension.Value === 'AllStorageTypes'));
    if (objectMetric) {
      const response = await sendWithRetry(cloudWatch, new GetMetricStatisticsCommand({
        Namespace: 'AWS/S3',
        MetricName: 'NumberOfObjects',
        Dimensions: objectMetric.Dimensions,
        StartTime: start,
        EndTime: end,
        Period: 86400,
        Statistics: ['Average'],
        Unit: 'Count',
      }));
      const point = (response.Datapoints || []).sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp))[0];
      if (point && typeof point.Average === 'number') {
        objectCount = point.Average;
        metricsAsOf = point.Timestamp;
      }
    }
  } catch (error) {
    const issue = { operation: 'NumberOfObjects', error, status: classifyAwsError(error).status };
    metricIssues.push(issue);
    onError({ service: 's3-cloudwatch', region, resourceId: bucketName, operation: issue.operation, error });
  }

  try {
    const sizeMetrics = await listS3MetricSeries(cloudWatch, bucketName, 'BucketSizeBytes');
    const byStorageType = new Map();
    for (const metric of sizeMetrics) {
      const storageType = metric.Dimensions?.find((dimension) => dimension.Name === 'StorageType')?.Value;
      if (storageType) byStorageType.set(storageType, metric.Dimensions);
    }
    const values = await Promise.all([...byStorageType.entries()].map(async ([storageType, dimensions]) => {
      const response = await sendWithRetry(cloudWatch, new GetMetricStatisticsCommand({
        Namespace: 'AWS/S3',
        MetricName: 'BucketSizeBytes',
        Dimensions: dimensions,
        StartTime: start,
        EndTime: end,
        Period: 86400,
        Statistics: ['Average'],
        Unit: 'Bytes',
      }));
      const point = (response.Datapoints || []).sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp))[0];
      return point && typeof point.Average === 'number'
        ? { storageType, value: point.Average, timestamp: point.Timestamp }
        : null;
    }));
    sizeByStorageType = Object.fromEntries(values.filter(Boolean).map((entry) => [entry.storageType, entry.value]));
    const populated = values.filter(Boolean);
    if (populated.length === byStorageType.size && populated.length > 0) {
      sizeByStorageType.total = populated.reduce((sum, entry) => sum + entry.value, 0);
      metricsAsOf = populated.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0].timestamp;
    }
  } catch (error) {
    const issue = { operation: 'BucketSizeBytes', error, status: classifyAwsError(error).status };
    metricIssues.push(issue);
    onError({ service: 's3-cloudwatch', region, resourceId: bucketName, operation: issue.operation, error });
  }
  return {
    objectCount,
    storageBytes: Object.hasOwn(sizeByStorageType, 'total') ? sizeByStorageType.total : null,
    sizeByStorageType,
    metricsAsOf,
    metricIssues,
  };
}

export async function discoverS3Buckets({ s3, s3ForRegion = (region) => new S3Client({ region }), cloudWatchForRegion, accountId, onError }) {
  const buckets = await listAllBuckets(s3);
  const resources = [];
  let bucketDetailsQueried = 0;
  for (const bucket of buckets) {
    if (!bucket.Name) continue;
    const bucketIssues = [];
    const recordBucketIssue = (issue) => {
      bucketIssues.push({ operation: issue.operation, status: classifyAwsError(issue.error).status });
      onError(issue);
    };
    const regionResponse = bucket.BucketRegion
      ? null
      : await optionalRequest(s3, new GetBucketLocationCommand({ Bucket: bucket.Name }), recordBucketIssue, { resourceId: bucket.Name, operation: 'GetBucketLocation' });
    const region = bucketRegion(bucket.BucketRegion || regionResponse?.LocationConstraint);
    const bucketClient = s3ForRegion(region);
    const cloudWatch = cloudWatchForRegion(region);
    const context = { region, resourceId: bucket.Name };
    const [versioning, encryption, publicAccess, lifecycle] = await Promise.all([
      optionalRequest(bucketClient, new GetBucketVersioningCommand({ Bucket: bucket.Name }), recordBucketIssue, { ...context, operation: 'GetBucketVersioning' }, {}),
      optionalRequest(bucketClient, new GetBucketEncryptionCommand({ Bucket: bucket.Name }), recordBucketIssue, { ...context, operation: 'GetBucketEncryption' }),
      optionalRequest(bucketClient, new GetPublicAccessBlockCommand({ Bucket: bucket.Name }), recordBucketIssue, { ...context, operation: 'GetPublicAccessBlock' }),
      optionalRequest(bucketClient, new GetBucketLifecycleConfigurationCommand({ Bucket: bucket.Name }), recordBucketIssue, { ...context, operation: 'GetBucketLifecycleConfiguration' }, { Rules: [] }),
    ]);
    const storageMetrics = await fetchS3Metrics(cloudWatch, bucket.Name, region, recordBucketIssue);
    const encryptionRules = encryption?.ServerSideEncryptionConfiguration?.Rules || [];
    const resourceId = bucket.Name;
    resources.push({
      accountId,
      identity: `arn:aws:s3:::${bucket.Name}`,
      arn: `arn:aws:s3:::${bucket.Name}`,
      service: 's3',
      resourceType: 's3:bucket',
      resourceId,
      name: bucket.Name,
      region,
      status: 'available',
      metadata: {
        createdAt: bucket.CreationDate?.toISOString?.() || null,
        versioning: versioning?.Status || 'Disabled',
        encryption: encryptionRules.map((rule) => ({
          algorithm: rule.ApplyServerSideEncryptionByDefault?.SSEAlgorithm || null,
          bucketKeyEnabled: rule.BucketKeyEnabled ?? null,
        })),
        publicAccessBlock: publicAccess?.PublicAccessBlockConfiguration || null,
        lifecycle: (lifecycle?.Rules || []).map((rule) => ({
          id: rule.ID || null,
          status: rule.Status || null,
          prefix: rule.Prefix || rule.Filter?.Prefix || null,
          expirationDays: rule.Expiration?.Days ?? null,
          transitionCount: rule.Transitions?.length || 0,
        })),
        objectCount: storageMetrics.objectCount,
        storageBytes: storageMetrics.storageBytes,
        storageBytesByType: storageMetrics.sizeByStorageType,
        storageMetricsAsOf: storageMetrics.metricsAsOf?.toISOString?.() || null,
        unavailableDetails: bucketIssues,
        enrichmentStatus: 'service-api',
      },
    });
    bucketDetailsQueried += 1;
  }
  return { resources, bucketsListed: buckets.length, bucketDetailsQueried };
}
