import multer from 'multer';
import multerS3 from 'multer-s3';
import { Request } from 'express';
import { s3Client } from './s3Client';
import { s3Config, defaultUploadConfig } from './config';
import { FileUploadConfig, UploadType, FieldConfig } from './types';
import { validateFile, generateUniqueFileName } from './utils';

class FileUploadMiddleware {
  private createStorage(config: FileUploadConfig) {
    return multerS3({
      s3: s3Client,
      bucket: s3Config.bucket,
      contentType: multerS3.AUTO_CONTENT_TYPE,
      key: (req: Request, file: Express.Multer.File, cb) => {
        const folder = config.folder || defaultUploadConfig.folder;
        const fileName = config.generateFileName 
          ? config.generateFileName(file.originalname)
          : generateUniqueFileName(file.originalname);
        cb(null, `${folder}/${fileName}`);
      },
      metadata: (req: Request, file: Express.Multer.File, cb) => {
        cb(null, {
          originalName: file.originalname,
          uploadedBy: (req as any).user?.id || 'anonymous',
          uploadedAt: new Date().toISOString(),
        });
      },
    });
  }

  private createMulter(config: FileUploadConfig = {}) {
    const finalConfig = { ...defaultUploadConfig, ...config };
    
    return multer({
      storage: this.createStorage(finalConfig),
      limits: {
        fileSize: finalConfig.maxFileSize,
        files: finalConfig.maxFiles,
      },
      fileFilter: (req: Request, file: Express.Multer.File, cb) => {
        const isValid = validateFile(file, finalConfig);
        if (isValid.valid) {
          cb(null, true);
        } else {
          cb(new Error(isValid.error));
        }
      },
    });
  }

  single(fieldName: string, config?: FileUploadConfig) {
    return this.createMulter(config).single(fieldName);
  }

  // Multiple files with same field name
  array(fieldName: string, maxCount?: number, config?: FileUploadConfig) {
    return this.createMulter(config).array(fieldName, maxCount);
  }

  // Multiple fields with different names
  fields(fields: FieldConfig[], config?: FileUploadConfig) {
    const multerFields = fields.map(field => ({
      name: field.name,
      maxCount: field.maxCount || 1
    }));
    return this.createMulter(config).fields(multerFields);
  }

  // Accept any files
  any(config?: FileUploadConfig) {
    return this.createMulter(config).any();
  }

  // No files, just form data
  none() {
    return multer().none();
  }

  custom(uploadType: UploadType, options: any, config?: FileUploadConfig) {
    const upload = this.createMulter(config);
    
    switch (uploadType) {
      case 'single':
        return upload.single(options.fieldName);
      case 'array':
        return upload.array(options.fieldName, options.maxCount);
      case 'fields':
        return upload.fields(options.fields);
      case 'any':
        return upload.any();
      default:
        throw new Error(`Unsupported upload type: ${uploadType}`);
    }
  }
}

export const uploadMiddleware = new FileUploadMiddleware();