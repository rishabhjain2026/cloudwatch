import test from 'node:test';
import assert from 'node:assert/strict';
import { discoverWithResourceExplorer, normalizeResource } from '../src/services/aws/resourceExplorerService.js';
import { discoverS3Buckets } from '../src/services/aws/s3Service.js';
import { classifyAwsError, sendWithRetry } from '../src/services/aws/client.js';

const accountId = '123456789012';

test('Resource Explorer follows pagination and reports complete indexed coverage', async () => {
  const pages = new Map();
  const clientForRegion = (region) => ({
    async send(command) {
      switch (command.constructor.name) {
        case 'ListIndexesCommand':
          return command.input.NextToken
            ? { Indexes: [{ Region: 'us-east-1', Type: 'LOCAL', Arn: `arn:aws:resource-explorer-2:us-east-1:${accountId}:index/example` }] }
            : { Indexes: [{ Region: 'ap-southeast-2', Type: 'LOCAL', Arn: `arn:aws:resource-explorer-2:ap-southeast-2:${accountId}:index/example` }], NextToken: 'next-index' };
        case 'GetIndexCommand':
          return { State: 'ACTIVE' };
        case 'ListSupportedResourceTypesCommand':
          return { ResourceTypes: [{ ResourceType: 'ec2:instance' }] };
        case 'SearchCommand': {
          const key = `${region}:${command.input.NextToken || 'first'}`;
          pages.set(key, (pages.get(key) || 0) + 1);
          if (!command.input.NextToken) {
            return {
              Resources: [{ Arn: `arn:aws:ec2:${region}:${accountId}:instance/i-${region}`, OwningAccountId: accountId, Region: region, Service: 'ec2', ResourceType: 'ec2:instance', Properties: [] }],
              Count: { Complete: true },
              NextToken: 'next',
              ViewArn: `arn:aws:resource-explorer-2:${region}:${accountId}:view/default` ,
            };
          }
          return {
            Resources: [{ Arn: `arn:aws:s3:::bucket-${region}`, OwningAccountId: accountId, Region: 'global', Service: 's3', ResourceType: 's3:bucket', Properties: [] }],
            Count: { Complete: true },
            ViewArn: `arn:aws:resource-explorer-2:${region}:${accountId}:view/default`,
          };
        }
        case 'GetViewCommand':
          return { View: { Filters: { FilterString: '' } } };
        default:
          throw new Error(`Unexpected command ${command.constructor.name}`);
      }
    },
  });
  const errors = [];
  const result = await discoverWithResourceExplorer({
    clientForRegion,
    regions: ['ap-southeast-2', 'us-east-1'],
    accountId,
    onError: (error) => errors.push(error),
  });

  assert.equal(result.coverageComplete, true);
  assert.equal(result.resources.length, 4);
  assert.equal(result.incompleteRegions.length, 0);
  assert.equal(errors.length, 0);
});

test('Resource Explorer returns partial status when region search is denied', async () => {
  const clientForRegion = (region) => ({
    async send(command) {
      if (command.constructor.name === 'ListIndexesCommand') {
        return { Indexes: [{ Region: 'ap-southeast-2', Type: 'LOCAL', Arn: 'index' }] };
      }
      if (command.constructor.name === 'GetIndexCommand') return { State: 'ACTIVE' };
      if (command.constructor.name === 'ListSupportedResourceTypesCommand') return { ResourceTypes: [] };
      if (command.constructor.name === 'SearchCommand' && region === 'us-east-1') {
        const error = new Error('denied');
        error.name = 'AccessDeniedException';
        throw error;
      }
      if (command.constructor.name === 'SearchCommand') return { Resources: [], Count: { Complete: true }, ViewArn: 'view' };
      if (command.constructor.name === 'GetViewCommand') return { View: { Filters: { FilterString: '' } } };
      throw new Error(`Unexpected command ${command.constructor.name}`);
    },
  });
  const result = await discoverWithResourceExplorer({
    clientForRegion,
    regions: ['ap-southeast-2', 'us-east-1'],
    accountId,
    onError: () => {},
  });
  assert.equal(result.coverageComplete, false);
  assert.ok(result.incompleteRegions.includes('us-east-1'));
});

test('S3 discovery paginates buckets, records configurations and leaves unavailable metrics null', async () => {
  const commandNames = [];
  const s3 = {
    async send(command) {
      const name = command.constructor.name;
      commandNames.push(name);
      if (name === 'ListBucketsCommand' && !command.input.ContinuationToken) {
        return { Buckets: [{ Name: 'apac-bucket', CreationDate: new Date('2025-01-01'), BucketRegion: 'ap-southeast-2' }], ContinuationToken: 'next' };
      }
      if (name === 'ListBucketsCommand') return { Buckets: [{ Name: 'east-bucket', CreationDate: new Date('2025-02-01') }] };
      if (name === 'GetBucketLocationCommand') return { LocationConstraint: null };
      throw new Error(`Unexpected list command ${name}`);
    },
  };
  const s3ForRegion = (region) => ({
    async send(command) {
      commandNames.push(command.constructor.name);
      switch (command.constructor.name) {
        case 'GetBucketVersioningCommand': return { Status: 'Enabled' };
        case 'GetBucketEncryptionCommand': return { ServerSideEncryptionConfiguration: { Rules: [{ ApplyServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' } }] } };
        case 'GetPublicAccessBlockCommand': return { PublicAccessBlockConfiguration: { BlockPublicAcls: true } };
        case 'GetBucketLifecycleConfigurationCommand': {
          const error = new Error('no lifecycle');
          error.name = 'NoSuchLifecycleConfiguration';
          throw error;
        }
        default: throw new Error(`Unexpected bucket command in ${region}: ${command.constructor.name}`);
      }
    },
  });
  const cloudWatchForRegion = () => ({
    async send(command) {
      commandNames.push(command.constructor.name);
      if (command.constructor.name === 'ListMetricsCommand') return { Metrics: [] };
      throw new Error(`Unexpected metric command ${command.constructor.name}`);
    },
  });
  const errors = [];
  const result = await discoverS3Buckets({ s3, s3ForRegion, cloudWatchForRegion, accountId, onError: (error) => errors.push(error) });

  assert.equal(result.bucketsListed, 2);
  assert.deepEqual(result.resources.map((resource) => resource.region), ['ap-southeast-2', 'us-east-1']);
  assert.equal(result.resources[0].metadata.versioning, 'Enabled');
  assert.equal(result.resources[0].metadata.encryption[0].algorithm, 'AES256');
  assert.equal(result.resources[0].metadata.objectCount, null);
  assert.equal(result.resources[0].metadata.storageBytes, null);
  assert.equal(errors.length, 0);
  assert.ok(!commandNames.some((name) => name.includes('ListObjects')));
});

test('AWS permission errors are classified and transient throttling is retried', async () => {
  assert.equal(classifyAwsError({ name: 'AccessDeniedException' }).status, 'missing_permissions');
  assert.equal(classifyAwsError({ name: 'InvalidClientTokenId' }).status, 'invalid_credentials');
  let calls = 0;
  const client = {
    async send() {
      calls += 1;
      if (calls === 1) {
        const error = new Error('throttled');
        error.name = 'ThrottlingException';
        throw error;
      }
      return { ok: true };
    },
  };
  assert.deepEqual(await sendWithRetry(client, {}), { ok: true });
  assert.equal(calls, 2);
});

test('AWS resource identity stays stable for the same account ARN', () => {
  const source = {
    Arn: 'arn:aws:ec2:ap-southeast-2:123456789012:instance/i-abc123',
    OwningAccountId: accountId,
    Region: 'ap-southeast-2',
    Service: 'ec2',
    ResourceType: 'ec2:instance',
    Properties: [],
  };
  const first = normalizeResource(source, 'ap-southeast-2', accountId);
  const second = normalizeResource({ ...source, LastReportedAt: new Date().toISOString() }, 'ap-southeast-2', accountId);
  assert.equal(first.identity, second.identity);
  assert.equal(first.identity, source.Arn);
});

test('S3 keeps a bucket visible when one configuration permission is missing', async () => {
  const s3 = {
    async send(command) {
      if (command.constructor.name === 'ListBucketsCommand') return { Buckets: [{ Name: 'restricted-bucket', BucketRegion: 'ap-southeast-2' }] };
      throw new Error(`Unexpected list command ${command.constructor.name}`);
    },
  };
  const s3ForRegion = () => ({
    async send(command) {
      if (command.constructor.name === 'GetBucketEncryptionCommand') {
        const error = new Error('denied');
        error.name = 'AccessDenied';
        throw error;
      }
      if (command.constructor.name === 'GetBucketLifecycleConfigurationCommand') {
        const error = new Error('none');
        error.name = 'NoSuchLifecycleConfiguration';
        throw error;
      }
      return {};
    },
  });
  const cloudWatchForRegion = () => ({ async send() { return { Metrics: [] }; } });
  const errors = [];
  const result = await discoverS3Buckets({ s3, s3ForRegion, cloudWatchForRegion, accountId, onError: (error) => errors.push(error) });
  assert.equal(result.resources.length, 1);
  assert.ok(result.resources[0].metadata.unavailableDetails.some((item) => item.operation === 'GetBucketEncryption' && item.status === 'missing_permissions'));
  assert.equal(errors.length, 1);
});

test('S3 handles an empty account without inventing bucket metrics', async () => {
  const result = await discoverS3Buckets({
    s3: { async send() { return { Buckets: [] }; } },
    accountId,
    onError: () => assert.fail('An empty bucket list should not produce an API error.'),
  });
  assert.equal(result.bucketsListed, 0);
  assert.deepEqual(result.resources, []);
});
