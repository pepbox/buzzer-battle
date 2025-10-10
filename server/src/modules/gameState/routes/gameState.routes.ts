import express from 'express';
import { 
    fetchGameState, 
    updateGameStatus, 
    moveToNextQuestion 
} from '../controllers/gameState.controller';
import { authenticateUser, authorizeRoles } from '../../../middlewares/authMiddleware';

const router = express.Router();

// Team and Admin can fetch game state
router.get('/current', authenticateUser, fetchGameState);

// Admin only routes
router.patch('/status', authenticateUser, authorizeRoles('ADMIN'), updateGameStatus);
router.post('/next-question', authenticateUser, authorizeRoles('ADMIN'), moveToNextQuestion);

export default router;
