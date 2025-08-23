import mongoose from "mongoose";
import { FileModel } from "../models/File";

export default class FileService {
  private session?: mongoose.ClientSession;

  constructor(session?: mongoose.ClientSession) {
    this.session = session;
  }

  // Static methods for backward compatibility
  static async uploadFile({
    originalName,
    fileName,
    size,
    mimetype,
    location,
    bucket,
    etag,
  }: {
    originalName: string;
    fileName: string;
    size: number;
    mimetype: string;
    location: string;
    bucket: string;
    etag: string;
  }) {
    const service = new FileService();
    return service.uploadFile({ originalName, fileName, size, mimetype, location, bucket, etag });
  }

  static async getFileById(fileId: string) {
    const service = new FileService();
    return service.getFileById(fileId);
  }

  // Instance methods that use this.session
  async uploadFile({
    originalName,
    fileName,
    size,
    mimetype,
    location,
    bucket,
    etag,
  }: {
    originalName: string;
    fileName: string;
    size: number;
    mimetype: string;
    location: string;
    bucket: string;
    etag: string;
  }) {
    const file = new FileModel({
      originalName,
      fileName,
      size,
      mimetype,
      location,
      bucket,
      etag,
      uploadedAt: new Date(),
      isActive: true,
    });

    const options: any = {};
    if (this.session) {
      options.session = this.session;
    }
    return await file.save(options);
  }

  async getFileById(fileId: string) {
    const query = FileModel.findById(fileId)
      .select("-__v -createdAt -updatedAt")
      .lean();
    if (this.session) {
      query.session(this.session);
    }
    return await query;
  }
}
