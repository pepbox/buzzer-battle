import { S3Client } from '@aws-sdk/client-s3';
import { s3Config } from './config';

export const s3Client = new S3Client({
  region: s3Config.region,
  credentials: {
    accessKeyId: s3Config.accessKeyId,
    secretAccessKey: s3Config.secretAccessKey,
  },
});

// services/fileUpload/config.ts
