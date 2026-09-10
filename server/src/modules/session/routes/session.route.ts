import express from 'express';
import asyncHandeler from 'express-async-handler';
import * as sessionControllers from '../controllers/session.controller';
import { authenticateUser } from '../../../middlewares/authMiddleware';
import { uploadMiddleware } from '../../../services/fileUpload/middleware';

const router = express.Router();

router.put('/update', authenticateUser, asyncHandeler(sessionControllers.updateSession));
router.get('/getSession', authenticateUser, asyncHandeler(sessionControllers.getSession));
router.get('/questions-status', authenticateUser, asyncHandeler(sessionControllers.getSessionQuestionsStatus));
router.post('/upload-logo', authenticateUser, uploadMiddleware.single('logo', {
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
}), asyncHandeler(sessionControllers.uploadSessionLogo));

export default router;
