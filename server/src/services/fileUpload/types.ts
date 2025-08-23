import { Request } from 'express';

export interface FileUploadConfig {
  allowedMimeTypes?: string[];
  maxFileSize?: number;
  maxFiles?: number;
  folder?: string;
  generateFileName?: (originalName: string) => string;
}

export interface S3Config {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export interface UploadedFileInfo {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  bucket: string;
  key: string;
  location: string;
  etag: string;
}

export interface MulterRequest {
  file?: UploadedFileInfo;
  files?: UploadedFileInfo[] | { [fieldname: string]: UploadedFileInfo[] };
  [key: string]: any;
}

export type UploadType = 'single' | 'array' | 'fields' | 'any';

export interface FieldConfig {
  name: string;
  maxCount?: number;
}
