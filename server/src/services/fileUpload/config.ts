import { S3Config, FileUploadConfig } from './types';


export const s3Config: S3Config = {
  bucket: process.env.AWS_S3_BUCKET_NAME || '',
  region: process.env.AWS_REGION || 'ap-south-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
};

export const defaultUploadConfig: FileUploadConfig = {
  allowedMimeTypes: [
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 10,
  folder: 'uploads',
  generateFileName: (originalName: string) => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    const extension = originalName.split('.').pop();
    return `${timestamp}-${random}.${extension}`;
  }
};