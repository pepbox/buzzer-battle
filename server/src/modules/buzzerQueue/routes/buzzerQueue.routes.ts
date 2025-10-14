import express from 'express';
import { 
    pressBuzzer,
    fetchBuzzerLeaderboard,
    fetchBuzzerLeaderboardByQuestion 
} from '../controllers/buzzerQueue.controller';
import { authenticateUser, authorizeRoles } from '../../../middlewares/authMiddleware';

const router = express.Router();

// Press buzzer for current question
router.post('/press', authenticateUser, pressBuzzer);

// Team and Admin can fetch buzzer leaderboard
router.get('/leaderboard', authenticateUser, fetchBuzzerLeaderboard);

// Admin can fetch leaderboard for specific question
router.get('/leaderboard/:questionId', authenticateUser, authorizeRoles('ADMIN'), fetchBuzzerLeaderboardByQuestion);

export default router;
