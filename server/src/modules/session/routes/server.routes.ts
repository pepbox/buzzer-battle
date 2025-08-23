import express from 'express';
import asyncHandeler from 'express-async-handler';
import * as sessionControllers from '../controllers/session.controller';

const router = express.Router();

router.post('/create-session', asyncHandeler(sessionControllers.createSession));
router.post('/update-session', asyncHandeler(sessionControllers.updateSessionServer));

export default router;