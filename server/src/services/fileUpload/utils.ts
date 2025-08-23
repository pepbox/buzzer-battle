import { FileUploadConfig } from './types';

export function validateFile(
  file: Express.Multer.File, 
  config: FileUploadConfig
): { valid: boolean; error?: string } {
  // Check file type
  if (config.allowedMimeTypes && !config.allowedMimeTypes.includes(file.mimetype)) {
    return {
      valid: false,
      error: `File type ${file.mimetype} is not allowed. Allowed types: ${config.allowedMimeTypes.join(', ')}`
    };
  }

  // Check file size (this is also handled by multer limits, but keeping for custom messages)
  if (config.maxFileSize && file.size > config.maxFileSize) {
    return {
      valid: false,
      error: `File size ${file.size} exceeds maximum allowed size of ${config.maxFileSize} bytes`
    };
  }

  return { valid: true };
}

export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

export function generateUniqueFileName(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = getFileExtension(originalName);
  const baseName = originalName.replace(/\.[^/.]+$/, '').substring(0, 20);
  return `${baseName}-${timestamp}-${random}.${extension}`;
}

export function sanitizeFileName(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_+/g, '_')
    .toLowerCase();
}