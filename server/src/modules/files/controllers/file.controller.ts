import { Request, Response, NextFunction } from 'express';
import FileService from '../services/fileService';
import AppError from '../../../utils/appError';

export const serveFile = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { fileId } = req.params;
        
        if (!fileId) {
            return next(new AppError("File ID is required.", 400));
        }

        const file = await FileService.getFileById(fileId);
        
        if (!file) {
            return next(new AppError("File not found.", 404));
        }

        // For S3 files, redirect to the S3 URL
        if (file.location) {
            return res.redirect(file.location);
        }

        // If no location is found, return error
        return next(new AppError("File location not found.", 404));
        
    } catch (error) {
        console.error("Error serving file:", error);
        next(new AppError("Failed to serve file.", 500));
    }
};
