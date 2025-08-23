import { 
  PutObjectCommand, 
  DeleteObjectCommand, 
  DeleteObjectsCommand,
  HeadObjectCommand,
  GetObjectCommand,
  PutObjectCommandInput,
  DeleteObjectCommandInput,
  DeleteObjectsCommandInput,
  HeadObjectCommandInput
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client } from './s3Client';
import { s3Config } from './config';

export async function uploadToS3(
  buffer: Buffer, 
  key: string, 
  mimetype: string,
  metadata?: { [key: string]: string }
): Promise<any> {
  const params: PutObjectCommandInput = {
    Bucket: s3Config.bucket,
    Key: key,
    Body: buffer,
    ContentType: mimetype,
    ACL: 'public-read',
    Metadata: metadata || {},
  };

  const command = new PutObjectCommand(params);
  return await s3Client.send(command);
}

export async function deleteFromS3(key: string): Promise<void> {
  const params: DeleteObjectCommandInput = {
    Bucket: s3Config.bucket,
    Key: key,
  };

  const command = new DeleteObjectCommand(params);
  await s3Client.send(command);
}

export async function deleteMultipleFromS3(keys: string[]): Promise<void> {
  if (keys.length === 0) return;

  const params: DeleteObjectsCommandInput = {
    Bucket: s3Config.bucket,
    Delete: {
      Objects: keys.map(key => ({ Key: key })),
      Quiet: true,
    },
  };

  const command = new DeleteObjectsCommand(params);
  await s3Client.send(command);
}

export async function generateSignedUrl(
  key: string, 
  expiresIn: number = 3600,
  operation: 'get' | 'put' = 'get'
): Promise<string> {
  const command = operation === 'get' 
    ? new GetObjectCommand({
        Bucket: s3Config.bucket,
        Key: key,
      })
    : new PutObjectCommand({
        Bucket: s3Config.bucket,
        Key: key,
      });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

export async function checkFileExists(key: string): Promise<boolean> {
  try {
    const params: HeadObjectCommandInput = {
      Bucket: s3Config.bucket,
      Key: key,
    };
    
    const command = new HeadObjectCommand(params);
    await s3Client.send(command);
    return true;
  } catch (error) {
    return false;
  }
}

export async function getFileMetadata(key: string): Promise<any> {
  const params: HeadObjectCommandInput = {
    Bucket: s3Config.bucket,
    Key: key,
  };

  const command = new HeadObjectCommand(params);
  return await s3Client.send(command);
}

export function getPublicUrl(key: string): string {
  return `https://${s3Config.bucket}.s3.${s3Config.region}.amazonaws.com/${key}`;
}