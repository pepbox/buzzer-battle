import express from 'express';
import asyncHandeler from 'express-async-handler';
import * as sessionControllers from '../controllers/session.controller';
import { authenticateUser } from '../../../middlewares/authMiddleware';

const router = express.Router();

router.put('/update', authenticateUser, asyncHandeler(sessionControllers.updateSession));
router.get('/getSession', authenticateUser, asyncHandeler(sessionControllers.getSession));

export default router;
