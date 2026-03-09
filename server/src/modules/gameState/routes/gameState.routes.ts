import express from 'express';
import {
    fetchGameState,
    updateGameStateUnified,
    // updateGameStatus, 
    moveToNextQuestion,
    validateTimerExpiration,
    markAnswer
} from '../controllers/gameState.controller';
import { authenticateUser, authorizeRoles } from '../../../middlewares/authMiddleware';

const router = express.Router();

// Team and Admin can fetch game state
router.get('/current', authenticateUser, fetchGameState);

// Validate timer expiration (Team and Admin can check)
router.get('/validate-timer', authenticateUser, validateTimerExpiration);

// UNIFIED ENDPOINT - Admin only (NEW - RECOMMENDED)
router.patch('/', authenticateUser, authorizeRoles('ADMIN'), updateGameStateUnified);

// Mark answer as correct/wrong - Admin only (for verbal answer flow)
router.post('/mark-answer', authenticateUser, authorizeRoles('ADMIN'), markAnswer);

// Legacy endpoints (Deprecated - kept for backward compatibility)
// router.patch('/status', authenticateUser, authorizeRoles('ADMIN'), updateGameStatus);
router.post('/next-question', authenticateUser, authorizeRoles('ADMIN'), moveToNextQuestion);

export default router;
