import mongoose, { Schema, Model } from "mongoose";

export interface IFile {
  originalName: string;
  fileName: string;
  size: number;
  mimetype: string;
  location: string;
  bucket: string;
  etag: string;
  uploadedAt: Date;
  isActive: boolean;
}

const FileSchema = new Schema<IFile>(
  {
    originalName: { type: String, required: true },
    fileName: { type: String, required: true },
    size: { type: Number, required: true },
    mimetype: { type: String, required: true },
    location: { type: String, required: true },
    bucket: { type: String, required: true },
    etag: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);


export const FileModel: Model<IFile> = mongoose.model<IFile>("File", FileSchema);
