import express from 'express';
import { 
    pressBuzzer,
    fetchBuzzerLeaderboard,
    fetchBuzzerLeaderboardByQuestion,
    fetchBuzzerStats
} from '../controllers/buzzerQueue.controller';
import { authenticateUser, authorizeRoles } from '../../../middlewares/authMiddleware';
import { requireSessionScope } from '../../gameState/utils/sessionScope';

const router = express.Router();

// Press buzzer for current question
router.post('/press', authenticateUser, requireSessionScope, pressBuzzer);

// Team and Admin can fetch buzzer leaderboard
router.get('/leaderboard', authenticateUser, requireSessionScope, fetchBuzzerLeaderboard);

// Admin can fetch leaderboard for specific question
router.get('/leaderboard/:questionId', authenticateUser, requireSessionScope, authorizeRoles('ADMIN'), fetchBuzzerLeaderboardByQuestion);

// Fetch buzzer statistics (fastest team, teams pressed, teams remaining)
router.get('/stats', authenticateUser, requireSessionScope, fetchBuzzerStats);

export default router;
