import { CloudWatchClient } from '@aws-sdk/client-cloudwatch';
import { EC2Client } from '@aws-sdk/client-ec2';
import { ResourceExplorer2Client } from '@aws-sdk/client-resource-explorer-2';
import { S3Client } from '@aws-sdk/client-s3';
import { STSClient } from '@aws-sdk/client-sts';
import { env } from '../../config/env.js';

export const configuredRegion = env.AWS_REGION || process.env.AWS_DEFAULT_REGION || null;

export function makeAwsClients(region) {
  return {
    ec2: new EC2Client({ region }),
    cloudWatch: new CloudWatchClient({ region }),
    resourceExplorer: new ResourceExplorer2Client({ region }),
    s3: new S3Client({ region }),
    sts: new STSClient({ region }),
  };
}

export function classifyAwsError(error) {
  const code = error?.name || error?.Code || error?.code || '';
  const message = error?.message || '';
  const full = `${code} ${message}`;
  if (/UnrecognizedClient|InvalidClientToken|InvalidAccessKeyId|SignatureDoesNotMatch|AuthFailure|ExpiredToken|NoCredentialProviders|CredentialsProviderError/i.test(full)) {
    return { status: 'invalid_credentials', code: String(code || 'InvalidCredentials'), message: 'AWS credentials are missing, invalid, or expired.' };
  }
  if (/AccessDenied|UnauthorizedOperation|AuthorizationError|not authorized|UnauthorizedException/i.test(full)) {
    return { status: 'missing_permissions', code: String(code || 'AccessDenied'), message: 'The configured AWS identity lacks permission for this operation.' };
  }
  if (/Throttl|TooManyRequests|RequestLimitExceeded|SlowDown/i.test(full)) {
    return { status: 'throttled', code: String(code || 'Throttling'), message: 'AWS throttled this request after retries.' };
  }
  if (code === 'AWS_REGION_MISSING') return { status: 'not_configured', code, message: 'Set AWS_REGION in apps/api/.env.' };
  if (/ResourceNotFound|NoSuchBucket|NoSuchLifecycleConfiguration|NoSuchPublicAccessBlockConfiguration|ServerSideEncryptionConfigurationNotFound/i.test(full)) {
    return { status: 'not_found', code: String(code || 'NotFound'), message: 'The requested optional AWS configuration was not found.' };
  }
  return { status: 'unavailable', code: String(code || 'AwsUnavailable'), message: 'AWS could not complete this request. Check service configuration and network connectivity.' };
}

export async function sendWithRetry(client, command, maxRetries = 3) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await client.send(command);
    } catch (error) {
      const classified = classifyAwsError(error);
      if (classified.status !== 'throttled' || attempt >= maxRetries) throw error;
      const jitterMs = Math.floor(Math.random() * 100);
      await new Promise((resolve) => setTimeout(resolve, (250 * (2 ** attempt)) + jitterMs));
    }
  }
}
