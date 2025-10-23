import express from 'express';
import { 
    fetchCurrentQuestion, 
    sendQuestionResponse 
} from '../controllers/question.controller';
import { authenticateUser, authorizeRoles } from '../../../middlewares/authMiddleware';

const router = express.Router();

// Team routes
router.get('/current', authenticateUser, fetchCurrentQuestion);
router.post('/:questionId/response', authenticateUser, authorizeRoles('TEAM'), sendQuestionResponse);

export default router;
