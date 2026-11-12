import express from 'express';
import asyncHandeler from 'express-async-handler';
import * as sessionControllers from '../controllers/session.controller';
import { authenticateUser, authorizeRoles } from '../../../middlewares/authMiddleware';
import { uploadMiddleware } from '../../../services/fileUpload/middleware';

const router = express.Router();

// Admin-only: changing session settings / question list
router.put('/update', authenticateUser, authorizeRoles('ADMIN'), asyncHandeler(sessionControllers.updateSession));
router.get('/getSession', authenticateUser, asyncHandeler(sessionControllers.getSession));
// Admin-only: returns full questions INCLUDING answers, so players must never reach it
router.get('/questions-status', authenticateUser, authorizeRoles('ADMIN'), asyncHandeler(sessionControllers.getSessionQuestionsStatus));
router.post('/upload-logo', authenticateUser, authorizeRoles('ADMIN'), uploadMiddleware.single('logo', {
  maxFileSize: 5 * 1024 * 1024, // 5MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
}), asyncHandeler(sessionControllers.uploadSessionLogo));
// Public (no auth): branding for the player login page. Must stay AFTER the named
// GET routes above so it doesn't swallow /getSession or /questions-status.
router.get('/:sessionId', asyncHandeler(sessionControllers.getPublicSessionInfo));

export default router;
