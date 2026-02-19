import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import fs from 'fs';
import path from 'path';

const S3_BUCKET = process.env.S3_BUCKET;
const S3_REGION = process.env.S3_REGION || 'us-east-1';
const S3_ENDPOINT = process.env.S3_ENDPOINT;

let s3Client: S3Client | null = null;

function getClient(): S3Client | null {
  if (!S3_BUCKET) return null;

  if (!s3Client) {
    const config: any = {
      region: S3_REGION,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
      },
    };
    if (S3_ENDPOINT) config.endpoint = S3_ENDPOINT;
    s3Client = new S3Client(config);
    console.log('[S3] Client initialized');
  }

  return s3Client;
}

export function isS3Enabled(): boolean {
  return !!S3_BUCKET;
}

export async function uploadToS3(localPath: string, s3Key: string, contentType = 'video/mp4'): Promise<string> {
  const client = getClient();
  if (!client) throw new Error('S3 not configured');

  const body = fs.readFileSync(localPath);

  await client.send(new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: s3Key,
    Body: body,
    ContentType: contentType,
  }));

  console.log(`[S3] Uploaded: ${s3Key} (${(body.length / 1024 / 1024).toFixed(1)}MB)`);
  return s3Key;
}

export async function getS3DownloadUrl(s3Key: string, expiresInSeconds = 3600): Promise<string> {
  const client = getClient();
  if (!client) throw new Error('S3 not configured');

  const url = await getSignedUrl(client, new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: s3Key,
  }), { expiresIn: expiresInSeconds });

  return url;
}

export function getS3Key(type: 'upload' | 'output', filename: string): string {
  return `${type}s/${filename}`;
}
